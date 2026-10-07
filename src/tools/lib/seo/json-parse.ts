/*
 * Strict JSON parser that reports the line and column of the first error, with plain-English messages for the
 * mistakes people actually make in JSON-LD (trailing commas, single quotes, comments, unquoted keys).
 * Browsers' JSON.parse messages differ and Safari's include no position, so we don't rely on them.
 */

export interface JsonError {
  message: string;
  line: number;
  col: number;
  offset: number;
}

export type JsonResult = { ok: true; value: unknown } | { ok: false; error: JsonError };

class ParseError extends Error {
  constructor(
    message: string,
    public offset: number,
  ) {
    super(message);
  }
}

export function lineCol(text: string, offset: number): { line: number; col: number } {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      col = 1;
    } else col++;
  }
  return { line, col };
}

export function parseJson(text: string): JsonResult {
  let i = 0;
  const n = text.length;
  const ws = () => {
    while (i < n) {
      const c = text[i];
      if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "﻿") i++;
      else if (c === "/" && (text[i + 1] === "/" || text[i + 1] === "*")) throw new ParseError("Comments aren't allowed in JSON. Remove the // or /* */ comment.", i);
      else break;
    }
  };
  const describe = (c: string | undefined) => (c === undefined ? "the end of the text" : c === "\n" ? "a line break" : `“${c}”`);

  const value = (): unknown => {
    ws();
    const c = text[i];
    if (c === "{") return object();
    if (c === "[") return array();
    if (c === '"') return string();
    if (c === "'") throw new ParseError("Strings must use double quotes (\"), not single quotes (').", i);
    if (c === "-" || (c >= "0" && c <= "9")) return number();
    if (text.startsWith("true", i)) return (i += 4), true;
    if (text.startsWith("false", i)) return (i += 5), false;
    if (text.startsWith("null", i)) return (i += 4), null;
    if (c === "“" || c === "”") throw new ParseError("Curly quotes (“ ”) found. JSON needs straight double quotes (\"), which word processors often replace.", i);
    if (c === undefined) throw new ParseError("The JSON ends too early: a value is missing.", i);
    throw new ParseError(`Unexpected ${describe(c)}: expected a value (text in double quotes, a number, an object or an array).`, i);
  };

  const object = () => {
    const out: Record<string, unknown> = {};
    i++;
    ws();
    if (text[i] === "}") return i++, out;
    for (;;) {
      ws();
      const c = text[i];
      if (c === "}") throw new ParseError("Trailing comma: remove the comma before the closing }.", i);
      if (c === "'") throw new ParseError("Property names must use double quotes (\"), not single quotes.", i);
      if (c !== '"') throw new ParseError(c === undefined ? "The JSON ends inside an object: a closing } is missing." : `Unexpected ${describe(c)}: property names must be in double quotes.`, i);
      const key = string();
      ws();
      if (text[i] !== ":") throw new ParseError(`Expected a colon after the property name "${key}".`, i);
      i++;
      out[key] = value();
      ws();
      if (text[i] === ",") {
        i++;
        continue;
      }
      if (text[i] === "}") return i++, out;
      if (text[i] === '"') throw new ParseError("Missing comma between two properties.", i);
      throw new ParseError(text[i] === undefined ? "The JSON ends inside an object: a closing } is missing." : `Unexpected ${describe(text[i])}: expected a comma or a closing }.`, i);
    }
  };

  const array = () => {
    const out: unknown[] = [];
    i++;
    ws();
    if (text[i] === "]") return i++, out;
    for (;;) {
      ws();
      if (text[i] === "]") throw new ParseError("Trailing comma: remove the comma before the closing ].", i);
      out.push(value());
      ws();
      if (text[i] === ",") {
        i++;
        continue;
      }
      if (text[i] === "]") return i++, out;
      throw new ParseError(text[i] === undefined ? "The JSON ends inside a list: a closing ] is missing." : `Unexpected ${describe(text[i])}: expected a comma or a closing ].`, i);
    }
  };

  const string = () => {
    const start = i;
    i++;
    let out = "";
    while (i < n) {
      const c = text[i];
      if (c === '"') {
        i++;
        return out;
      }
      if (c === "\n" || c === "\r") throw new ParseError("Line break inside a string. Close the quote on the same line or write \\n.", i);
      if (c === "\\") {
        const e = text[i + 1];
        const map: Record<string, string> = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
        if (e in map) {
          out += map[e];
          i += 2;
          continue;
        }
        if (e === "u" && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
          out += String.fromCharCode(parseInt(text.slice(i + 2, i + 6), 16));
          i += 6;
          continue;
        }
        throw new ParseError(`Invalid escape \\${e ?? ""} in a string. Write a backslash as \\\\.`, i);
      }
      if (c < " ") throw new ParseError("Control character inside a string (often a tab). Replace it with \\t or a space.", i);
      out += c;
      i++;
    }
    throw new ParseError("A string is never closed: a closing double quote is missing.", start);
  };

  const number = () => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i));
    if (!m) throw new ParseError("Invalid number.", i);
    i += m[0].length;
    return Number(m[0]);
  };

  try {
    ws();
    if (i >= n) throw new ParseError("Nothing to parse: the JSON is empty.", 0);
    const v = value();
    ws();
    if (i < n) throw new ParseError(`Unexpected ${describe(text[i])} after the end of the JSON. If you have several objects, wrap them in [ ] or use separate script tags.`, i);
    return { ok: true, value: v };
  } catch (e) {
    if (e instanceof ParseError) {
      const lc = lineCol(text, e.offset);
      return { ok: false, error: { message: e.message, offset: e.offset, ...lc } };
    }
    throw e;
  }
}
