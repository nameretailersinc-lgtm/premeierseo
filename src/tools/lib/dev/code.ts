/*
 * Code formatters and minifiers. Heavy libraries load on first use:
 * js-beautify (JS/CSS/HTML formatting), terser (JS minification), csso (CSS minification),
 * fflate (gzip size). The HTML minifier is our own and deliberately conservative.
 */
import { BLOCK, tokenize, type Token } from "./html";
import { parseJson, stringifyNode } from "./json";

/* ---------- sizes ---------- */

export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function fmtBytes(n: number): string {
  if (n < 1000) return `${n} B`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)} KB`;
  return `${(n / 1_000_000).toFixed(2)} MB`;
}

export async function gzipSize(s: string): Promise<number> {
  const { gzipSync } = await import("fflate");
  return gzipSync(new TextEncoder().encode(s), { level: 9 }).length;
}

export async function savingsNote(before: string, after: string): Promise<string> {
  const a = byteLength(before);
  const b = byteLength(after);
  const pct = a ? Math.round(((a - b) / a) * 100) : 0;
  const [ga, gb] = await Promise.all([gzipSize(before), gzipSize(after)]);
  const gpct = ga ? Math.round(((ga - gb) / ga) * 100) : 0;
  return `Saved ${pct}% (${fmtBytes(a)} → ${fmtBytes(b)}) · gzipped ${fmtBytes(ga)} → ${fmtBytes(gb)} (${gpct}% smaller)`;
}

/* ---------- js-beautify ---------- */

type Beautify = typeof import("js-beautify");

async function beautify(): Promise<Beautify> {
  const m = (await import("js-beautify")) as unknown as { default?: Beautify } & Beautify;
  return m.default ?? m;
}

export interface FormatOpts {
  indent: string; // "2" | "4" | "tab"
  braces?: "collapse" | "expand" | "end-expand" | "collapse,preserve-inline";
  wrap?: number;
  maxBlank?: number;
}

function core(o: FormatOpts) {
  const tab = o.indent === "tab";
  return {
    indent_size: tab ? 1 : Number(o.indent) || 2,
    indent_char: tab ? "\t" : " ",
    indent_with_tabs: tab,
    wrap_line_length: o.wrap ?? 0,
    preserve_newlines: (o.maxBlank ?? 1) > 0,
    max_preserve_newlines: (o.maxBlank ?? 1) + 1,
    end_with_newline: false,
  };
}

export async function formatJs(code: string, o: FormatOpts & { unescape?: boolean; chained?: boolean }): Promise<string> {
  const b = await beautify();
  return b.js(code, {
    ...core(o),
    brace_style: (o.braces ?? "collapse") as "collapse",
    unescape_strings: Boolean(o.unescape),
    break_chained_methods: Boolean(o.chained),
    space_after_anon_function: false,
  });
}

/** Sort runs of complete one-line declarations inside each block, alphabetically by property. */
export function sortCssDeclarations(css: string): string {
  const lines = css.split("\n");
  const DECL = /^(\s*)(-?-?[A-Za-z][\w-]*)\s*:[^{}]*;\s*$/;
  const out: string[] = [];
  let run: { line: string; prop: string; indent: string }[] = [];
  const flush = () => {
    run.sort((a, b) => {
      const pa = a.prop.replace(/^-(webkit|moz|ms|o)-/, "");
      const pb = b.prop.replace(/^-(webkit|moz|ms|o)-/, "");
      return pa < pb ? -1 : pa > pb ? 1 : a.prop.startsWith("-") ? -1 : 1;
    });
    out.push(...run.map((r) => r.line));
    run = [];
  };
  for (const line of lines) {
    const m = DECL.exec(line);
    // Custom properties (--x) keep their place: other declarations may depend on their order.
    if (m && !m[2].startsWith("--") && (!run.length || run[0].indent === m[1])) run.push({ line, prop: m[2].toLowerCase(), indent: m[1] });
    else {
      flush();
      if (m && !m[2].startsWith("--")) run.push({ line, prop: m[2].toLowerCase(), indent: m[1] });
      else out.push(line);
    }
  }
  flush();
  return out.join("\n");
}

export async function formatCss(code: string, o: FormatOpts & { sort?: boolean; blankBetweenRules?: boolean }): Promise<string> {
  const b = await beautify();
  let r = b.css(code, {
    ...core(o),
    brace_style: o.braces === "expand" ? "expand" : "collapse",
    newline_between_rules: o.blankBetweenRules ?? true,
    selector_separator_newline: true,
    space_around_combinator: true,
  } as Parameters<Beautify["css"]>[1]);
  if (o.sort) r = sortCssDeclarations(r);
  return r;
}

export async function formatHtml(
  code: string,
  o: FormatOpts & { attrs?: "auto" | "force" | "force-expand-multiline" | "aligned-multiple"; inner?: boolean },
): Promise<string> {
  const b = await beautify();
  return b.html(code, {
    ...core(o),
    wrap_attributes: o.attrs ?? "auto",
    indent_inner_html: Boolean(o.inner),
    indent_scripts: "normal",
    extra_liners: [],
    templating: ["auto"],
  });
}

/* ---------- JavaScript minifier (terser) ---------- */

export interface JsMinOpts {
  mangle: boolean;
  compress: boolean;
  dropConsole: boolean;
  keepLicense: boolean;
  module: "auto" | "yes" | "no";
}

export async function minifyJs(code: string, o: JsMinOpts): Promise<{ code?: string; error?: string }> {
  const { minify } = await import("terser");
  const isModule = o.module === "yes" || (o.module === "auto" && /^\s*(import\s[\w{*"']|export\s)/m.test(code));
  try {
    const r = await minify(code, {
      ecma: 2020,
      module: isModule,
      mangle: o.mangle,
      compress: o.compress ? { drop_console: o.dropConsole, passes: 2 } : false,
      format: { comments: o.keepLicense ? /@license|@preserve|^!/ : false },
    });
    return { code: r.code ?? "" };
  } catch (e) {
    const err = e as { message?: string; line?: number; col?: number };
    if (err.line) return { error: `Line ${err.line}, column ${(err.col ?? 0) + 1}: ${err.message}. The code must be valid JavaScript before it can be minified.` };
    return { error: err.message ?? "The code could not be minified." };
  }
}

/* ---------- CSS minifier (csso) ---------- */

export async function minifyCss(code: string, o: { restructure: boolean; keepLicense: boolean }): Promise<string> {
  const csso = await import("csso");
  const lib = (csso as unknown as { default?: typeof csso }).default ?? csso;
  return lib.minify(code, { restructure: o.restructure, comments: o.keepLicense ? "exclamation" : false }).css;
}

/* ---------- HTML minifier (own, conservative) ---------- */

export interface HtmlMinOpts {
  comments: boolean; // remove comments (conditional comments are always kept)
  whitespace: boolean; // collapse whitespace
  css: boolean; // minify <style>
  js: boolean; // minify <script>
  /** Drop end tags the HTML standard makes optional (</li>, </p> before a block, </td>, </tr>, </option>, </body>, </html>…). */
  optionalTags?: boolean;
}

const JS_TYPES = /^(|text\/javascript|application\/javascript|module|text\/ecmascript|application\/ecmascript)$/i;

/** Elements whose start tag lets a preceding <p> close implicitly (HTML Living Standard §13.1.2.4). */
const P_CLOSERS = new Set(
  "address article aside blockquote details dialog div dl fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr main menu nav ol p pre search section table ul".split(" "),
);

function serializeTag(t: Extract<Token, { type: "open" }>, collapse: boolean): string {
  if (!collapse) return t.raw;
  const attrs = t.attrs.map((a) => (a.value === null ? a.name : `${a.name}=${a.quote}${a.value}${a.quote}`));
  return `<${t.raw.slice(1, 1 + t.name.length)}${attrs.length ? " " + attrs.join(" ") : ""}${t.selfClosing ? "/" : ""}>`;
}

const isConditional = (text: string) => /^\s*\[(if|endif)/i.test(text) || /<!\[endif\]\s*$/i.test(text) || /\[endif\]\s*$/i.test(text);

/** Can the end tag `name` be left out when it is followed by token `next` (undefined = end of document)? */
function endTagOptional(name: string, next: Token | undefined): boolean {
  const isOpen = (n: string[]) => next?.type === "open" && n.includes(next.name);
  const isClose = (n?: string[]) => next?.type === "close" && (!n || n.includes(next.name));
  switch (name) {
    case "li":
      return isOpen(["li"]) || isClose(["ul", "ol", "menu"]);
    case "dt":
      return isOpen(["dt", "dd"]);
    case "dd":
      return isOpen(["dt", "dd"]) || isClose(["dl"]);
    case "p":
      // Only before a block that closes it; leaving it out before a parent's end tag breaks inside <a>.
      return next?.type === "open" && P_CLOSERS.has(next.name);
    case "option":
      return isOpen(["option", "optgroup"]) || isClose(["select", "datalist", "optgroup"]);
    case "td":
    case "th":
      return isOpen(["td", "th"]) || isClose(["tr"]);
    case "tr":
      return isOpen(["tr"]) || isClose(["tbody", "thead", "tfoot", "table"]);
    case "thead":
      return isOpen(["tbody", "tfoot"]);
    case "tbody":
      return isOpen(["tbody", "tfoot"]) || isClose(["table"]);
    case "head":
      return isOpen(["body"]);
    case "body":
      return next === undefined || isClose(["html"]);
    case "html":
      return next === undefined;
    default:
      return false;
  }
}

export async function minifyHtml(html: string, o: HtmlMinOpts): Promise<{ html: string; notes: string[] }> {
  const notes: string[] = [];
  let removedComments = 0;
  let removedTags = 0;
  let jsFailed = 0;

  // Remove comments first and merge the text around them, so "a <!-- x --> b" keeps one space.
  const toks: Token[] = [];
  for (const t of tokenize(html)) {
    if (t.type === "comment" && o.comments && !isConditional(t.text)) {
      removedComments++;
      continue;
    }
    const prev = toks[toks.length - 1];
    if (t.type === "text" && prev?.type === "text") toks[toks.length - 1] = { type: "text", text: prev.text + t.text };
    else toks.push(t);
  }

  const parts: string[] = [];
  let preDepth = 0;
  let lastScriptType = "";

  const isBlockTok = (t: Token | undefined) =>
    !!t && (t.type === "open" || t.type === "close" ? BLOCK.has(t.name) : t.type === "decl" || t.type === "comment" || t.type === "raw");
  /** Next token that will produce output (whitespace-only text disappears when it sits next to a block). */
  const nextMeaningful = (k: number): Token | undefined => {
    for (let j = k + 1; j < toks.length; j++) {
      const t = toks[j];
      if (t.type === "text" && !t.text.trim() && o.whitespace && preDepth === 0) continue;
      return t;
    }
    return undefined;
  };

  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    switch (t.type) {
      case "comment":
      case "decl":
        parts.push(t.raw);
        break;
      case "open":
        if (t.name === "pre" || t.name === "textarea") preDepth++;
        if (t.name === "script") lastScriptType = (t.attrs.find((a) => a.name.toLowerCase() === "type")?.value ?? "").trim();
        parts.push(serializeTag(t, o.whitespace));
        break;
      case "close": {
        if ((t.name === "pre" || t.name === "textarea") && preDepth > 0) preDepth--;
        if (o.optionalTags && preDepth === 0 && endTagOptional(t.name, nextMeaningful(k))) {
          removedTags++;
          break;
        }
        parts.push(o.whitespace ? `</${t.raw.slice(2, 2 + t.name.length)}>` : t.raw);
        break;
      }
      case "raw": {
        let text = t.text;
        if (t.parent === "style" && o.css && text.trim()) {
          try {
            text = await minifyCss(text, { restructure: false, keepLicense: true });
          } catch {
            notes.push("A <style> block couldn't be minified and was left as it was.");
          }
        } else if (t.parent === "script" && text.trim()) {
          if (/json/i.test(lastScriptType)) {
            const p = parseJson(text.trim());
            if (p.ok) text = stringifyNode(p.node, { indent: "" });
          } else if (o.js && JS_TYPES.test(lastScriptType)) {
            const r = await minifyJs(text, { mangle: true, compress: true, dropConsole: false, keepLicense: true, module: lastScriptType === "module" ? "yes" : "auto" });
            if (r.code !== undefined) text = r.code;
            else jsFailed++;
          }
        } else if (t.parent === "title" && o.whitespace) {
          text = text.replace(/\s+/g, " ").trim();
        }
        parts.push(text);
        break;
      }
      case "text": {
        let text = t.text;
        if (o.whitespace && preDepth === 0) {
          if (!text.trim()) {
            const prev = toks[k - 1];
            const next = toks[k + 1];
            text = isBlockTok(prev) || isBlockTok(next) || !prev || !next ? "" : " ";
          } else {
            text = text.replace(/\s+/g, " ");
            if (isBlockTok(toks[k - 1]) || k === 0) text = text.replace(/^ /, "");
            if (isBlockTok(toks[k + 1]) || k === toks.length - 1) text = text.replace(/ $/, "");
          }
        }
        parts.push(text);
        break;
      }
    }
  }
  if (removedComments) notes.push(`${removedComments} comment${removedComments === 1 ? "" : "s"} removed`);
  if (removedTags) notes.push(`${removedTags} optional end tag${removedTags === 1 ? "" : "s"} removed`);
  if (jsFailed) notes.push(`${jsFailed} <script> block${jsFailed === 1 ? "" : "s"} had syntax errors and ${jsFailed === 1 ? "was" : "were"} left unminified`);
  return { html: parts.join(""), notes };
}
