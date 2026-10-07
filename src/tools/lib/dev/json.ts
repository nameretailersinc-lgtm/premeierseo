/*
 * JSON engine (RFC 8259). A small recursive-descent parser that keeps the original number and
 * string literals, so formatting never changes values: 12345678901234567890 stays exact and
 * "é" is written back as typed. Errors report line, column and a plain-English hint.
 * Pure functions, no DOM.
 */

export type JNode =
  | { t: "obj"; e: [string, JNode][] }
  | { t: "arr"; v: JNode[] }
  | { t: "str"; raw: string }
  | { t: "num"; raw: string }
  | { t: "lit"; raw: "true" | "false" | "null" };

export interface JsonError {
  message: string;
  hint?: string;
  pos: number;
  line: number;
  col: number;
  /** The text of the line containing the error. */
  lineText: string;
}

export interface ParseOk {
  ok: true;
  node: JNode;
  duplicates: string[];
}
export interface ParseFail {
  ok: false;
  error: JsonError;
}

class Fail extends Error {
  constructor(
    message: string,
    public pos: number,
    public hint?: string,
  ) {
    super(message);
  }
}

export function lineCol(text: string, pos: number): { line: number; col: number; lineText: string } {
  let line = 1;
  let start = 0;
  for (let i = 0; i < pos && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      start = i + 1;
    }
  }
  let end = text.indexOf("\n", start);
  if (end < 0) end = text.length;
  return { line, col: pos - start + 1, lineText: text.slice(start, end).replace(/\r$/, "") };
}

function describe(ch: string | undefined): string {
  if (ch === undefined) return "the end of the text";
  if (ch === "\n") return "a line break";
  if (ch === "\t") return "a tab";
  if (ch === " ") return "a space";
  return `“${ch}”`;
}

/** Decode a JSON string literal (with quotes). */
export function strValue(raw: string): string {
  if (raw.indexOf("\\") < 0) return raw.slice(1, -1);
  return JSON.parse(raw) as string;
}

export function parseJson(text: string, opts: { maxDepth?: number } = {}): ParseOk | ParseFail {
  const maxDepth = opts.maxDepth ?? 2000;
  let i = 0;
  const n = text.length;
  const duplicates: string[] = [];
  let lastComma = 0;

  const ws = () => {
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 32 || c === 10 || c === 13 || c === 9) i++;
      else break;
    }
  };

  const unexpected = (where: string): never => {
    const ch = text[i];
    if (ch === "/" && (text[i + 1] === "/" || text[i + 1] === "*"))
      throw new Fail("Comments aren't allowed in JSON.", i, "Remove the // or /* */ comment. JSON5 and JSONC allow comments; standard JSON does not.");
    if (ch === "'") throw new Fail("Strings must use double quotes.", i, "Replace the single quotes ' with double quotes \".");
    if (ch === undefined) throw new Fail(`The JSON ends too early: expected ${where}.`, i, "A bracket or quote is probably missing at the end.");
    if (/[A-Za-z_$]/.test(ch)) {
      const word = /^[A-Za-z_$][\w$]*/.exec(text.slice(i, i + 40))?.[0] ?? ch;
      if (["NaN", "Infinity", "undefined"].includes(word))
        throw new Fail(`${word} isn't a valid JSON value.`, i, "Use null, or write the value as a string.");
      if (["True", "False", "None", "TRUE", "FALSE", "NULL", "Null"].includes(word))
        throw new Fail(`${word} isn't valid JSON.`, i, "JSON literals are lower case: true, false and null.");
      throw new Fail(`Unexpected ${describe(word)}: expected ${where}.`, i, where.includes("property name") ? "Property names must be in double quotes." : "Text values must be in double quotes.");
    }
    throw new Fail(`Unexpected ${describe(ch)}: expected ${where}.`, i);
  };

  const SIMPLE_STR = /"[^"\\\u0000-\u001f]*"/y;
  const parseString = (): string => {
    const start = i;
    SIMPLE_STR.lastIndex = i;
    if (SIMPLE_STR.test(text)) {
      i = SIMPLE_STR.lastIndex;
      return text.slice(start, i);
    }
    i++; // opening quote
    for (;;) {
      if (i >= n) throw new Fail("A string isn't closed.", start, "Add the closing double quote.");
      const c = text.charCodeAt(i);
      if (c === 34) {
        i++;
        return text.slice(start, i);
      }
      if (c === 92) {
        const e = text[i + 1];
        if (e === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) throw new Fail("Invalid \\u escape: it needs four hex digits.", i);
          i += 6;
          continue;
        }
        if (e !== undefined && '"\\/bfnrt'.includes(e)) {
          i += 2;
          continue;
        }
        throw new Fail(`Invalid escape \\${e ?? ""} in a string.`, i, "Only \\\" \\\\ \\/ \\b \\f \\n \\r \\t and \\uXXXX are allowed. Write a literal backslash as \\\\.");
      }
      if (c < 32) throw new Fail(c === 10 ? "A line break inside a string isn't allowed." : "A control character inside a string isn't allowed.", i, c === 10 ? "Write line breaks inside strings as \\n, or check for a missing closing quote." : "Escape it, for example \\t for a tab.");
      i++;
    }
  };

  const NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

  const parseValue = (depth: number): JNode => {
    if (depth > maxDepth) throw new Fail(`Nesting is deeper than ${maxDepth} levels.`, i);
    ws();
    const c = text[i];
    if (c === "{") {
      i++;
      const e: [string, JNode][] = [];
      let seen: Set<string> | null = null;
      ws();
      if (text[i] === "}") {
        i++;
        return { t: "obj", e };
      }
      for (;;) {
        ws();
        if (text[i] !== '"') {
          if (text[i] === "}" && e.length) throw new Fail("Trailing comma before }.", lastComma, "JSON doesn't allow a comma after the last property. Remove it.");
          unexpected("a property name in double quotes");
        }
        const key = strValue(parseString());
        // Small objects: a linear scan is cheaper than a Set.
        let dup = false;
        if (e.length < 12) {
          for (let k = 0; k < e.length; k++) if (e[k][0] === key) dup = true;
        } else {
          if (!seen) seen = new Set(e.map((x) => x[0]));
          dup = seen.has(key);
          seen.add(key);
        }
        if (dup && duplicates.length < 50) duplicates.push(key);
        ws();
        if (text[i] !== ":") {
          if (text[i] === undefined) unexpected("“:” after the property name");
          throw new Fail(`Expected “:” after the property name, found ${describe(text[i])}.`, i);
        }
        i++;
        e.push([key, parseValue(depth + 1)]);
        ws();
        if (text[i] === ",") {
          lastComma = i;
          i++;
          continue;
        }
        if (text[i] === "}") {
          i++;
          return { t: "obj", e };
        }
        if (text[i] === '"') throw new Fail("Missing comma between properties.", i, "Add a comma after the previous value.");
        unexpected("“,” or “}”");
      }
    }
    if (c === "[") {
      i++;
      const v: JNode[] = [];
      ws();
      if (text[i] === "]") {
        i++;
        return { t: "arr", v };
      }
      for (;;) {
        ws();
        if (text[i] === "]" && v.length) throw new Fail("Trailing comma before ].", lastComma, "JSON doesn't allow a comma after the last item. Remove it.");
        v.push(parseValue(depth + 1));
        ws();
        if (text[i] === ",") {
          lastComma = i;
          i++;
          continue;
        }
        if (text[i] === "]") {
          i++;
          return { t: "arr", v };
        }
        if (text[i] !== undefined && /["{\[\d-]|t|f|n/.test(text[i])) throw new Fail("Missing comma between items.", i, "Add a comma after the previous item.");
        unexpected("“,” or “]”");
      }
    }
    if (c === '"') return { t: "str", raw: parseString() };
    if (c === "-" || (c >= "0" && c <= "9")) {
      NUM.lastIndex = i;
      const m = NUM.exec(text);
      if (!m) throw new Fail("Invalid number.", i);
      const after = text[i + m[0].length];
      if (after !== undefined && /[\d.xXeE]/.test(after)) {
        if (/^-?0\d/.test(text.slice(i, i + 3))) throw new Fail("Numbers can't have leading zeros.", i, "Write 7 instead of 07, or put the value in quotes if the zeros matter.");
        throw new Fail("Invalid number.", i, "JSON numbers are decimal: no hex, no trailing point, no leading +.");
      }
      i += m[0].length;
      return { t: "num", raw: m[0] };
    }
    if (c === "+" || c === ".") throw new Fail("Invalid number.", i, "JSON numbers can't start with + or a point. Write 0.5, not .5.");
    for (const lit of ["true", "false", "null"] as const) {
      if (text.startsWith(lit, i)) {
        i += lit.length;
        return { t: "lit", raw: lit };
      }
    }
    return unexpected("a value");
  };

  try {
    if (text.charCodeAt(0) === 0xfeff) i = 1;
    ws();
    if (i >= n) throw new Fail("The input is empty.", 0);
    const node = parseValue(0);
    ws();
    if (i < n) {
      if (text[i] === "{" || text[i] === "[")
        throw new Fail("More than one JSON value.", i, "Wrap the values in [ ] separated by commas. If this is JSON Lines (one object per line), the converter tools accept it.");
      throw new Fail(`Unexpected ${describe(text[i])} after the end of the JSON.`, i);
    }
    return { ok: true, node, duplicates };
  } catch (e) {
    if (e instanceof Fail) {
      const lc = lineCol(text, e.pos);
      return { ok: false, error: { message: e.message, hint: e.hint, pos: e.pos, ...lc } };
    }
    if (e instanceof RangeError) {
      const lc = lineCol(text, i);
      return { ok: false, error: { message: "The JSON is nested too deeply to process.", pos: i, ...lc } };
    }
    throw e;
  }
}

/* ---------- Output ---------- */

export interface StringifyOpts {
  indent: string; // "" = minified
  sortKeys?: "none" | "asc" | "desc";
}

export function stringifyNode(node: JNode, o: StringifyOpts): string {
  const nl = o.indent ? "\n" : "";
  const colon = o.indent ? ": " : ":";
  const cmp = (a: [string, JNode], b: [string, JNode]) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  const keyCache = new Map<string, string>();
  const q = (k: string) => {
    let v = keyCache.get(k);
    if (v === undefined) {
      v = JSON.stringify(k);
      if (keyCache.size < 10_000) keyCache.set(k, v);
    }
    return v;
  };
  // String concatenation (V8 ropes) is faster here than pushing millions of small parts.
  const walk = (x: JNode, pad: string): string => {
    if (x.t === "str" || x.t === "num" || x.t === "lit") return x.raw;
    const inner = pad + o.indent;
    if (x.t === "arr") {
      if (!x.v.length) return "[]";
      let s = "[" + nl;
      const last = x.v.length - 1;
      for (let k = 0; k <= last; k++) s += inner + walk(x.v[k], inner) + (k < last ? "," + nl : nl);
      return s + pad + "]";
    }
    if (!x.e.length) return "{}";
    let entries = x.e;
    if (o.sortKeys === "asc") entries = [...entries].sort(cmp);
    else if (o.sortKeys === "desc") entries = [...entries].sort((a, b) => cmp(b, a));
    let s = "{" + nl;
    const last = entries.length - 1;
    for (let k = 0; k <= last; k++) s += inner + q(entries[k][0]) + colon + walk(entries[k][1], inner) + (k < last ? "," + nl : nl);
    return s + pad + "}";
  };
  return walk(node, "");
}

/** Convert to a plain JS value. Numbers that wouldn't survive as doubles are kept as their original text. */
export function toValue(node: JNode): unknown {
  switch (node.t) {
    case "str":
      return strValue(node.raw);
    case "num": {
      const v = Number(node.raw);
      if (/^-?\d+$/.test(node.raw) && !Number.isSafeInteger(v)) return node.raw;
      return v;
    }
    case "lit":
      return node.raw === "null" ? null : node.raw === "true";
    case "arr":
      return node.v.map(toValue);
    case "obj": {
      const o: Record<string, unknown> = {};
      for (const [k, v] of node.e) o[k] = toValue(v);
      return o;
    }
  }
}

export interface JsonStats {
  objects: number;
  arrays: number;
  values: number;
  depth: number;
  keys: number;
}

export function stats(node: JNode): JsonStats {
  const s: JsonStats = { objects: 0, arrays: 0, values: 0, depth: 0, keys: 0 };
  const walk = (x: JNode, d: number) => {
    if (d > s.depth) s.depth = d;
    if (x.t === "obj") {
      s.objects++;
      s.keys += x.e.length;
      for (const [, c] of x.e) walk(c, d + 1);
    } else if (x.t === "arr") {
      s.arrays++;
      for (const c of x.v) walk(c, d + 1);
    } else s.values++;
  };
  walk(node, 1);
  return s;
}

/** JavaScript-style path segment: .key, ["odd key"] or [0]. */
export function pathSeg(key: string | number): string {
  if (typeof key === "number") return `[${key}]`;
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`;
}

export interface SearchHit {
  path: string;
  preview: string;
}

/** Find keys or scalar values containing `q` (case-insensitive). */
export function searchJson(node: JNode, q: string, limit = 200): { hits: SearchHit[]; total: number } {
  const needle = q.toLowerCase();
  const hits: SearchHit[] = [];
  let total = 0;
  const walk = (x: JNode, path: string, key?: string) => {
    let match = key !== undefined && key.toLowerCase().includes(needle);
    if (x.t === "str" || x.t === "num" || x.t === "lit") {
      const v = x.t === "str" ? strValue(x.raw) : x.raw;
      if (v.toLowerCase().includes(needle)) match = true;
      if (match) {
        total++;
        if (hits.length < limit) hits.push({ path, preview: x.raw.length > 80 ? x.raw.slice(0, 77) + "…" : x.raw });
      }
      return;
    }
    if (match) {
      total++;
      if (hits.length < limit) hits.push({ path, preview: x.t === "obj" ? `{${x.e.length} keys}` : `[${x.v.length} items]` });
    }
    if (x.t === "obj") for (const [k, c] of x.e) walk(c, path + pathSeg(k), k);
    else x.v.forEach((c, k) => walk(c, path + pathSeg(k)));
  };
  walk(node, "$");
  return { hits, total };
}
