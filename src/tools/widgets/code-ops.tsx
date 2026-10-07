"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { FileDrop } from "../ui/FileDrop";
import { useTool } from "../ui/ToolContext";
import { TransformTool, type Opts, type TransformDef } from "../ui/TransformTool";
import {
  Alert,
  Button,
  Checkbox,
  CopyButton,
  DownloadButton,
  Field,
  Panel,
  Segmented,
  downloadBlob,
  formatBytes,
} from "../ui/primitives";
import type { WidgetProps } from "../types";
import { formatCss, formatHtml, formatJs, minifyCss, minifyHtml, minifyJs, savingsNote } from "../lib/dev/code";
import {
  base64Decode,
  base64Encode,
  charTable,
  codesToText,
  sniffMime,
  textToCodes,
  urlDecode,
  urlEncode,
  urlParts,
  utf8Decode,
  utf8Encode,
  type CodeFormat,
  type UrlMode,
} from "../lib/dev/encode";
import { generateHtaccess, type RedirectRow } from "../lib/dev/htaccess";
import { htmlToText, textToHtml } from "../lib/dev/html-text";

/*
 * Code and encoding transforms (archetype A) plus two custom tools: Base64 (text and files)
 * and the .htaccess redirect generator. config.op selects the tool. (The .htaccess tester is its
 * own widget, htaccess-tester.tsx.)
 */

const INDENT = {
  type: "select" as const,
  key: "indent",
  label: "Indent",
  default: "2",
  options: [
    { value: "2", label: "2 spaces" },
    { value: "4", label: "4 spaces" },
    { value: "tab", label: "Tabs" },
  ],
};
const BLANK = {
  type: "select" as const,
  key: "maxBlank",
  label: "Blank lines",
  default: "1",
  options: [
    { value: "0", label: "Remove all" },
    { value: "1", label: "Keep up to 1" },
    { value: "2", label: "Keep up to 2" },
  ],
};
const WRAP = {
  type: "select" as const,
  key: "wrap",
  label: "Wrap lines at",
  default: "0",
  options: [
    { value: "0", label: "Don't wrap" },
    { value: "80", label: "80 characters" },
    { value: "120", label: "120 characters" },
  ],
};

const lineDiff = (a: string, b: string) => `${a.split("\n").length.toLocaleString()} → ${b.split("\n").length.toLocaleString()} lines`;

const OPS: Record<string, TransformDef> = {
  "js-format": {
    inputLabel: "JavaScript",
    outputLabel: "Formatted JavaScript",
    mono: true,
    wrap: "off",
    live: false,
    actionLabel: "Format JavaScript",
    downloadName: "formatted.js",
    downloadMime: "text/javascript;charset=utf-8",
    placeholder: "Paste minified or messy JavaScript",
    options: [
      INDENT,
      {
        type: "select",
        key: "braces",
        label: "Braces",
        default: "collapse",
        options: [
          { value: "collapse", label: "Same line" },
          { value: "expand", label: "New line" },
          { value: "end-expand", label: "Same line, else on new line" },
          { value: "collapse,preserve-inline", label: "Keep short blocks inline" },
        ],
      },
      WRAP,
      BLANK,
      { type: "checkbox", key: "chained", label: "Break chained methods", default: false, help: "One .then() per line" },
      { type: "checkbox", key: "unescape", label: "Decode \\x and \\u escapes", default: false, help: "Make obfuscated strings readable" },
    ],
    sample: 'function greet(name){if(!name){return"Hello, stranger"}const parts=["Hello",name];return parts.join(", ")+"!"}console.log(greet("Ada"));',
    async run(input, o) {
      const out = await formatJs(input, {
        indent: String(o.indent),
        braces: String(o.braces) as "collapse",
        wrap: Number(o.wrap),
        maxBlank: Number(o.maxBlank),
        chained: Boolean(o.chained),
        unescape: Boolean(o.unescape),
      });
      return { output: out, note: lineDiff(input, out) };
    },
  },
  "css-format": {
    inputLabel: "CSS",
    outputLabel: "Formatted CSS",
    mono: true,
    wrap: "off",
    live: false,
    actionLabel: "Format CSS",
    downloadName: "formatted.css",
    downloadMime: "text/css;charset=utf-8",
    placeholder: "Paste minified or messy CSS",
    options: [
      INDENT,
      {
        type: "select",
        key: "braces",
        label: "Opening brace",
        default: "collapse",
        options: [
          { value: "collapse", label: "Same line" },
          { value: "expand", label: "New line" },
        ],
      },
      { type: "checkbox", key: "sort", label: "Sort properties A–Z", default: false, help: "Within each rule" },
      { type: "checkbox", key: "blankBetweenRules", label: "Blank line between rules", default: true },
    ],
    sample:
      "/* card */.card{padding:16px;color:#333;background:#fff;border-radius:8px}.card:hover,.card:focus{box-shadow:0 2px 4px rgba(0,0,0,.2)}@media (max-width:600px){.card{padding:8px;margin:0}}",
    async run(input, o) {
      const out = await formatCss(input, { indent: String(o.indent), braces: String(o.braces) as "collapse", sort: Boolean(o.sort), blankBetweenRules: Boolean(o.blankBetweenRules) });
      return { output: out, note: lineDiff(input, out) };
    },
  },
  "html-format": {
    inputLabel: "HTML",
    outputLabel: "Formatted HTML",
    mono: true,
    wrap: "off",
    live: false,
    actionLabel: "Format HTML",
    downloadName: "formatted.html",
    downloadMime: "text/html;charset=utf-8",
    placeholder: "Paste minified or messy HTML",
    options: [
      INDENT,
      {
        type: "select",
        key: "attrs",
        label: "Attributes",
        default: "auto",
        options: [
          { value: "auto", label: "Wrap only when long" },
          { value: "force", label: "Each on a new line" },
          { value: "force-expand-multiline", label: "Each on a new line, > on its own" },
          { value: "aligned-multiple", label: "Aligned when wrapped" },
        ],
      },
      WRAP,
      BLANK,
      { type: "checkbox", key: "inner", label: "Indent <head> and <body>", default: false },
    ],
    sample:
      '<!DOCTYPE html><html><head><title>Shop</title><style>body{margin:0}</style></head><body><nav class="top"><ul><li><a href="/">Home</a></li><li><a href="/about/">About</a></li></ul></nav><p>Hello <b>world</b>.</p><script>function a(x){return x+1}</script></body></html>',
    async run(input, o) {
      const out = await formatHtml(input, {
        indent: String(o.indent),
        attrs: String(o.attrs) as "auto",
        wrap: Number(o.wrap),
        maxBlank: Number(o.maxBlank),
        inner: Boolean(o.inner),
      });
      return { output: out, note: lineDiff(input, out) };
    },
  },
  "js-minify": {
    inputLabel: "JavaScript",
    outputLabel: "Minified JavaScript",
    mono: true,
    live: false,
    actionLabel: "Minify JavaScript",
    downloadName: "script.min.js",
    downloadMime: "text/javascript;charset=utf-8",
    placeholder: "Paste JavaScript to minify",
    options: [
      { type: "checkbox", key: "mangle", label: "Shorten variable names", default: true, help: "Local names only" },
      { type: "checkbox", key: "compress", label: "Optimize code", default: true, help: "Remove dead code, merge statements" },
      { type: "checkbox", key: "dropConsole", label: "Remove console.* calls", default: false },
      { type: "checkbox", key: "keepLicense", label: "Keep license comments", default: true, help: "/*! … */ and @license" },
      {
        type: "select",
        key: "module",
        label: "Code type",
        default: "auto",
        options: [
          { value: "auto", label: "Detect" },
          { value: "yes", label: "ES module (import/export)" },
          { value: "no", label: "Classic script" },
        ],
      },
    ],
    sample:
      "// Greeting helper\nfunction greet(name) {\n  if (!name) {\n    return 'Hello, stranger';\n  }\n  const parts = ['Hello', name];\n  console.log('debug');\n  return parts.join(', ') + '!';\n}\n/*! keep me */\nexport default greet;\n",
    async run(input, o) {
      const r = await minifyJs(input, {
        mangle: Boolean(o.mangle),
        compress: Boolean(o.compress),
        dropConsole: Boolean(o.dropConsole),
        keepLicense: Boolean(o.keepLicense),
        module: String(o.module) as "auto",
      });
      if (r.error) return { output: "", error: r.error };
      return { output: r.code ?? "", note: await savingsNote(input, r.code ?? "") };
    },
  },
  "css-minify": {
    inputLabel: "CSS",
    outputLabel: "Minified CSS",
    mono: true,
    live: false,
    actionLabel: "Minify CSS",
    downloadName: "styles.min.css",
    downloadMime: "text/css;charset=utf-8",
    placeholder: "Paste CSS to minify",
    options: [
      { type: "checkbox", key: "restructure", label: "Merge and restructure rules", default: true, help: "Combines duplicate selectors and declarations" },
      { type: "checkbox", key: "keepLicense", label: "Keep /*! license comments */", default: true },
    ],
    sample: "/*! Theme v1 */\n.btn {\n  color: #ff0000;\n  margin: 0px 0px 0px 0px;\n}\n\n.btn {\n  padding: 10px;\n}\n\n/* links */\n.link {\n  color: #ff0000;\n}\n",
    async run(input, o) {
      const out = await minifyCss(input, { restructure: Boolean(o.restructure), keepLicense: Boolean(o.keepLicense) });
      return { output: out, note: await savingsNote(input, out) };
    },
  },
  "html-minify": {
    inputLabel: "HTML",
    outputLabel: "Minified HTML",
    mono: true,
    live: false,
    actionLabel: "Minify HTML",
    downloadName: "page.min.html",
    downloadMime: "text/html;charset=utf-8",
    placeholder: "Paste HTML to minify",
    options: [
      { type: "checkbox", key: "whitespace", label: "Collapse whitespace", default: true, help: "Not inside <pre> or <textarea>" },
      { type: "checkbox", key: "comments", label: "Remove comments", default: true, help: "Conditional comments are kept" },
      { type: "checkbox", key: "css", label: "Minify inline <style>", default: true },
      { type: "checkbox", key: "js", label: "Minify inline <script>", default: true },
      { type: "checkbox", key: "optionalTags", label: "Remove optional end tags", default: false, help: "</li>, </td>, </tr>, </p> before a block… Valid HTML, but harder to read" },
    ],
    sample:
      '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <title>  My page  </title>\n    <style>\n      body { margin: 0px; }\n    </style>\n  </head>\n  <body>\n    <!-- main navigation -->\n    <nav   class="top">\n      <ul>\n        <li><a href="/">Home</a></li>\n        <li><a href="/about/">About</a></li>\n      </ul>\n    </nav>\n    <p>Hello <b>world</b>,   welcome.</p>\n    <pre>  spacing   kept</pre>\n    <script>\n      function add(first, second) { return first + second; }\n    </script>\n  </body>\n</html>\n',
    async run(input, o) {
      const r = await minifyHtml(input, {
        whitespace: Boolean(o.whitespace),
        comments: Boolean(o.comments),
        css: Boolean(o.css),
        js: Boolean(o.js),
        optionalTags: Boolean(o.optionalTags),
      });
      const note = await savingsNote(input, r.html);
      return { output: r.html, note: [note, ...r.notes].join(" · ") };
    },
  },
  "text-to-html": {
    inputLabel: "Plain text",
    outputLabel: "HTML",
    mono: false,
    downloadName: "text.html",
    downloadMime: "text/html;charset=utf-8",
    options: [
      {
        type: "select",
        key: "breaks",
        label: "Line breaks",
        default: "p-br",
        options: [
          { value: "p-br", label: "Blank line = new <p>, single = <br>" },
          { value: "p-line", label: "Every line is a <p>" },
          { value: "br", label: "Only <br>, no paragraphs" },
        ],
      },
      { type: "checkbox", key: "escape", label: "Escape < > &", default: true, help: "Turn off if the text already contains HTML" },
      { type: "checkbox", key: "links", label: "Turn URLs and emails into links", default: true },
      { type: "checkbox", key: "newTab", label: "Open links in a new tab", default: false, showIf: (o) => Boolean(o.links) },
      { type: "checkbox", key: "markdown", label: "Markdown-style formatting", default: false, help: "**bold**, *italic*, # headings, - lists" },
    ],
    sample: "Opening hours\nMon–Fri: 9am–5pm\n\nEmail hello@example.com or visit www.example.com/contact.\nPrices < £10 & free returns.",
    run(input, o) {
      const out = textToHtml(input, {
        breaks: String(o.breaks) as "p-br",
        escape: Boolean(o.escape),
        links: Boolean(o.links),
        newTab: Boolean(o.newTab),
        markdown: Boolean(o.markdown),
      });
      return { output: out };
    },
  },
  "html-to-text": {
    inputLabel: "HTML",
    outputLabel: "Plain text",
    mono: false,
    downloadName: "text.txt",
    options: [
      {
        type: "select",
        key: "links",
        label: "Links",
        default: "inline",
        options: [
          { value: "text", label: "Text only" },
          { value: "inline", label: "Text (URL)" },
          { value: "markdown", label: "Markdown [text](URL)" },
        ],
      },
      {
        type: "select",
        key: "headings",
        label: "Headings",
        default: "plain",
        options: [
          { value: "plain", label: "Plain text" },
          { value: "markdown", label: "Markdown #" },
          { value: "upper", label: "UPPER CASE" },
        ],
      },
      {
        type: "select",
        key: "tables",
        label: "Table cells",
        default: "tabs",
        options: [
          { value: "tabs", label: "Tab-separated" },
          { value: "pipes", label: "Separated by |" },
        ],
      },
      { type: "checkbox", key: "lists", label: "Bullets and numbers for lists", default: true },
      { type: "checkbox", key: "images", label: "Keep image alt text", default: false },
    ],
    sample:
      '<h1>Spring sale</h1>\n<p>Everything is <strong>20%&nbsp;off</strong> until Friday. <a href="https://example.com/sale">See the sale</a> &amp; save.</p>\n<ul><li>Shirts</li><li>Shoes</li></ul>\n<table><tr><th>Item</th><th>Price</th></tr><tr><td>Hat</td><td>&pound;12</td></tr></table>\n<script>trackVisit()</script>',
    run(input, o) {
      const out = htmlToText(input, {
        links: String(o.links) as "inline",
        headings: String(o.headings) as "plain",
        tables: String(o.tables) as "tabs",
        lists: Boolean(o.lists),
        images: Boolean(o.images),
      });
      const words = out.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
      return { output: out, note: `${words.toLocaleString()} words` };
    },
  },
  url: {
    inputLabel: "Text or URL",
    outputLabel: "Result",
    mono: true,
    swappable: true,
    options: [
      {
        type: "segmented",
        key: "action",
        label: "Action",
        default: "encode",
        options: [
          { value: "encode", label: "Encode" },
          { value: "decode", label: "Decode" },
          { value: "parts", label: "Break down URL" },
        ],
      },
      {
        type: "select",
        key: "mode",
        label: "Mode",
        default: "component",
        options: [
          { value: "component", label: "Component (encodeURIComponent)" },
          { value: "uri", label: "Full URL (encodeURI)" },
          { value: "form", label: "Form data (spaces as +)" },
        ],
        showIf: (o) => o.action !== "parts",
      },
      { type: "checkbox", key: "perLine", label: "Each line separately", default: false, showIf: (o) => o.action !== "parts" },
      { type: "checkbox", key: "repeat", label: "Decode until nothing changes", default: false, help: "Fixes double-encoded text", showIf: (o) => o.action === "decode" },
    ],
    sample: "https://example.com/search?q=café & croissants&page=2",
    run(input, o) {
      const mode = String(o.mode) as UrlMode;
      if (o.action === "parts") {
        const r = urlParts(input.split("\n")[0]);
        if (r.error) return { output: "", error: r.error };
        const w = Math.max(...r.parts!.map((p) => p.part.length)) + 2;
        const lines = r.parts!.map((p) => `${p.part.padEnd(w)}${p.decoded}${p.raw !== p.decoded && p.raw ? `   (raw: ${p.raw})` : ""}`);
        return { output: lines.join("\n"), note: r.assumed ? "No scheme given, so https:// was assumed" : `${r.parts!.filter((p) => p.part.startsWith("  ") && !p.part.startsWith("  Segment")).length} query parameters` };
      }
      const each = (fn: (s: string) => string) => (o.perLine ? input.split("\n").map(fn).join("\n") : fn(input));
      if (o.action === "encode") return { output: each((s) => urlEncode(s, mode)) };
      let err: string | undefined;
      let rounds = 0;
      const out = each((s) => {
        let cur = s;
        for (let i = 0; i < (o.repeat ? 10 : 1); i++) {
          const r = urlDecode(cur, mode);
          if (r.error) err = r.error;
          if (r.text === cur) break;
          cur = r.text;
          rounds = Math.max(rounds, i + 1);
        }
        return cur;
      });
      const still = /%[0-9A-Fa-f]{2}/.test(out);
      const note = o.repeat && rounds > 1 ? `Decoded ${rounds} times` : still ? "Still contains %XX sequences: it may be double-encoded. Tick “Decode until nothing changes”." : undefined;
      return { output: out, note: err ? `${err}${note ? " " + note : ""}` : note };
    },
  },
  unicode: {
    inputLabel: "Text or codes",
    outputLabel: "Result",
    mono: true,
    swappable: true,
    options: [
      {
        type: "segmented",
        key: "dir",
        label: "Direction",
        default: "encode",
        options: [
          { value: "encode", label: "Text → codes" },
          { value: "decode", label: "Codes → text" },
          { value: "map", label: "Character map" },
        ],
      },
      {
        type: "select",
        key: "format",
        label: "Format",
        default: "uplus",
        options: [
          { value: "uplus", label: "Code points (U+0041)" },
          { value: "dec", label: "Decimal (65)" },
          { value: "hex", label: "Hex (0x41)" },
          { value: "utf8", label: "UTF-8 bytes (41)" },
          { value: "js", label: "JavaScript \\u0041" },
          { value: "es6", label: "JavaScript \\u{1F44D}" },
          { value: "python", label: "Python \\u00e9 / \\U0001F44D" },
          { value: "css", label: "CSS \\41" },
          { value: "html-dec", label: "HTML &#65;" },
          { value: "html-hex", label: "HTML &#x41;" },
          { value: "html-named", label: "HTML named (&eacute;)" },
        ],
        showIf: (o) => o.dir === "encode",
      },
      {
        type: "select",
        key: "sep",
        label: "Separator",
        default: " ",
        options: [
          { value: " ", label: "Space" },
          { value: ", ", label: "Comma" },
          { value: "\n", label: "New line" },
        ],
        showIf: (o) => o.dir === "encode" && ["uplus", "dec", "hex", "utf8"].includes(String(o.format)),
      },
      {
        type: "checkbox",
        key: "onlyNonAscii",
        label: "Leave ASCII characters as they are",
        default: false,
        showIf: (o) => o.dir === "encode" && !["uplus", "dec", "hex", "utf8"].includes(String(o.format)),
      },
    ],
    sample: "Café 👍",
    run(input, o) {
      if (o.dir === "decode") {
        const r = codesToText(input);
        if (r.error) return { output: "", error: r.error };
        return { output: r.text, note: r.detected ? `Read as ${r.detected}` : undefined };
      }
      if (o.dir === "map") {
        const rows = charTable(input);
        const head = ["Char", "Code point", "Decimal", "UTF-8", "UTF-16", "HTML", "JS"];
        const cells = rows.map((r) => [r.char === " " ? "space" : r.char === "\n" ? "LF" : r.char === "\t" ? "TAB" : r.char, r.cp, String(r.dec), r.utf8, r.utf16, r.html, r.js]);
        const w = head.map((h, i) => Math.max(h.length, ...cells.map((c) => c[i].length)) + 2);
        const fmt = (c: string[]) => c.map((x, i) => x.padEnd(w[i])).join("").trimEnd();
        const total = Array.from(input).length;
        return { output: [fmt(head), ...cells.map(fmt)].join("\n"), note: total > rows.length ? `First ${rows.length} of ${total.toLocaleString()} characters` : `${total.toLocaleString()} characters` };
      }
      const out = textToCodes(input, String(o.format) as CodeFormat, { sep: String(o.sep), onlyNonAscii: Boolean(o.onlyNonAscii) });
      return { output: out, note: `${Array.from(input).length.toLocaleString()} characters` };
    },
  },
};

/* ---------------- Base64 ---------------- */

const BASE64_TEXT: TransformDef = {
  inputLabel: "Text or Base64",
  outputLabel: "Result",
  mono: true,
  swappable: true,
  options: [
    {
      type: "segmented",
      key: "action",
      label: "Action",
      default: "encode",
      options: [
        { value: "encode", label: "Encode" },
        { value: "decode", label: "Decode" },
      ],
    },
    {
      type: "select",
      key: "variant",
      label: "Alphabet",
      default: "standard",
      options: [
        { value: "standard", label: "Standard (+ /)" },
        { value: "url", label: "URL-safe (- _)" },
      ],
      showIf: (o) => o.action === "encode",
    },
    { type: "checkbox", key: "wrap", label: "Wrap at 76 characters", default: false, help: "MIME email style", showIf: (o) => o.action === "encode" },
  ],
  sample: "Hello, Wörld! 👋",
  run(input, o) {
    if (o.action === "encode") {
      const out = base64Encode(utf8Encode(input), { urlSafe: o.variant === "url", wrap: o.wrap ? 76 : 0 });
      return { output: out, note: `${formatBytes(utf8Encode(input).length)} of UTF-8 → ${out.length.toLocaleString()} characters` };
    }
    const r = base64Decode(input);
    if (r.error) return { output: "", error: r.error };
    const d = utf8Decode(r.bytes!);
    if (!d.valid) {
      const kind = sniffMime(r.bytes!);
      return {
        output: "",
        error: `The decoded data (${formatBytes(r.bytes!.length)}) isn't UTF-8 text${kind ? `; it looks like a ${kind.ext.toUpperCase()} file` : ""}. Switch to File mode and use “Decode to file” to download it.`,
      };
    }
    return { output: d.text, note: `${formatBytes(r.bytes!.length)} decoded${r.urlSafe ? " · URL-safe alphabet detected" : ""}${r.mime ? ` · data URI (${r.mime})` : ""}` };
  },
};

const FILE_LIMIT = 25 * 1024 * 1024;

function Base64Files() {
  const id = useId();
  const { completed, announce, error: track } = useTool();
  const [file, setFile] = useState<{ name: string; type: string; size: number; b64: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [urlSafe, setUrlSafe] = useState(false);
  const [decIn, setDecIn] = useState("");
  const [decErr, setDecErr] = useState<string | null>(null);
  const [decInfo, setDecInfo] = useState<string | null>(null);

  const b64 = file ? (urlSafe ? file.b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : file.b64) : "";
  const dataUri = file ? `data:${file.type || "application/octet-stream"};base64,${file.b64}` : "";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={<span>File → Base64</span>}>
        <div className="grid gap-3 p-3 sm:p-4">
          <FileDrop
            accept="*/*,.*"
            maxBytes={FILE_LIMIT}
            hint={`Any file up to ${formatBytes(FILE_LIMIT)} · stays on your device`}
            onFiles={async ([f]) => {
              setBusy(true);
              try {
                const bytes = new Uint8Array(await f.arrayBuffer());
                setFile({ name: f.name, type: f.type || sniffMime(bytes)?.mime || "", size: f.size, b64: base64Encode(bytes) });
                announce(`${f.name} encoded`);
              } catch {
                track("READ_FAILED", "input");
              } finally {
                setBusy(false);
              }
            }}
          />
          {busy && <p className="text-sm text-ink-3">Encoding…</p>}
          {file && (
            <>
              <p className="text-sm text-ink-2">
                <span className="font-semibold">{file.name}</span> · {formatBytes(file.size)} · {file.type || "unknown type"} → {b64.length.toLocaleString()} characters (
                {Math.round((b64.length / Math.max(1, file.size)) * 100)}% of the original)
              </p>
              {file.type.startsWith("image/") && file.size < 5_000_000 && (
                // eslint-disable-next-line @next/next/no-img-element -- local data URI preview
                <img src={dataUri} alt={`Preview of ${file.name}`} className="max-h-40 w-auto rounded-md border border-line object-contain" />
              )}
              <Checkbox checked={urlSafe} onChange={setUrlSafe} label="URL-safe alphabet (- _ and no padding)" />
              <label htmlFor={`${id}-b64`} className="field-label">
                Base64
              </label>
              <textarea id={`${id}-b64`} readOnly className="textarea mono" style={{ ["--ta-min" as string]: "8rem" }} value={b64.length > 200_000 ? b64.slice(0, 200_000) + "…" : b64} />
              {b64.length > 200_000 && <p className="text-sm text-ink-3">Showing the first 200,000 characters. Copy and Download include everything.</p>}
              <div className="flex flex-wrap gap-2">
                <CopyButton text={() => b64} label="Copy Base64" variant="primary" />
                <CopyButton text={() => dataUri} label="Copy data URI" />
                <DownloadButton data={() => b64} filename={`${file.name}.b64.txt`} />
              </div>
            </>
          )}
        </div>
      </Panel>
      <Panel title={<label htmlFor={`${id}-dec`}>Base64 → file</label>}>
        <div className="grid gap-3 p-3 sm:p-4">
          <textarea
            id={`${id}-dec`}
            className="textarea mono"
            style={{ ["--ta-min" as string]: "10rem" }}
            placeholder="Paste Base64 or a data: URI"
            value={decIn}
            spellCheck={false}
            onChange={(e) => {
              setDecIn(e.target.value);
              setDecErr(null);
              setDecInfo(null);
            }}
          />
          <div>
            <Button
              variant="primary"
              size="md"
              icon="download"
              disabled={!decIn.trim()}
              onClick={() => {
                const r = base64Decode(decIn);
                if (r.error) {
                  setDecErr(r.error);
                  track("INVALID_INPUT", "process");
                  return;
                }
                const kind = sniffMime(r.bytes!);
                const mime = r.mime || kind?.mime || "application/octet-stream";
                const ext = kind?.ext ?? (r.mime?.split("/")[1]?.replace(/\W.*/, "") || "bin");
                downloadBlob(new Blob([r.bytes! as unknown as BlobPart], { type: mime }), `decoded.${ext}`);
                setDecInfo(`Downloaded decoded.${ext} (${formatBytes(r.bytes!.length)}, ${kind ? `detected ${kind.mime}` : r.mime ? r.mime : "type not recognized"}).`);
                completed("download");
              }}
            >
              Decode to file
            </Button>
          </div>
          {decErr && <Alert tone="danger" role="alert">{decErr}</Alert>}
          {decInfo && <Alert tone="success">{decInfo}</Alert>}
          <p className="text-sm text-ink-3">The file type is detected from its first bytes (PNG, JPEG, GIF, WebP, PDF, ZIP, MP3 and others) or from the data URI.</p>
        </div>
      </Panel>
    </div>
  );
}

function Base64Tool({ toolId }: { toolId: string }) {
  const [mode, setMode] = useState<"text" | "file">("text");
  return (
    <div className="grid gap-4">
      <Segmented
        legend="Mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: "text", label: "Text" },
          { value: "file", label: "File" },
        ]}
      />
      {mode === "text" ? <TransformTool def={BASE64_TEXT} toolId={toolId} /> : <Base64Files />}
    </div>
  );
}

/* ---------------- .htaccess redirect generator ---------------- */

const KIND_LABEL: Record<RedirectRow["kind"], string> = { page: "Page", folder: "Folder (and everything in it)", domain: "Whole domain", gone: "Removed (410 Gone)" };

function HtaccessGenerator() {
  const id = useId();
  const { used, announce } = useTool();
  const [domain, setDomain] = useState("");
  const [https, setHttps] = useState(true);
  const [www, setWww] = useState<"keep" | "www" | "non-www">("non-www");
  const [slash, setSlash] = useState<"keep" | "add" | "remove">("keep");
  const [indexHtml, setIndexHtml] = useState(false);
  const [rows, setRows] = useState<RedirectRow[]>([{ kind: "page", from: "", to: "", status: "301" }]);
  const gen = useMemo(() => generateHtaccess({ domain, https, www, slash, indexHtml, rows }), [domain, https, www, slash, indexHtml, rows]);
  const setRow = (i: number, patch: Partial<RedirectRow>) => {
    setRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
    used("type");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        <Panel title={<span>Site-wide rules</span>}>
          <div className="grid gap-3 p-3 sm:p-4">
            <Field label="Your domain" htmlFor={`${id}-d`} help="Needed for the HTTPS and www rules, e.g. example.com">
              <input id={`${id}-d`} className="input" value={domain} placeholder="example.com" autoComplete="off" spellCheck={false} onChange={(e) => setDomain(e.target.value)} />
            </Field>
            <Checkbox checked={https} onChange={setHttps} label="Redirect HTTP to HTTPS" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="www" htmlFor={`${id}-w`}>
                <select id={`${id}-w`} className="select" value={www} onChange={(e) => setWww(e.target.value as typeof www)}>
                  <option value="keep">Leave as it is</option>
                  <option value="non-www">Remove www</option>
                  <option value="www">Add www</option>
                </select>
              </Field>
              <Field label="Trailing slash" htmlFor={`${id}-s`}>
                <select id={`${id}-s`} className="select" value={slash} onChange={(e) => setSlash(e.target.value as typeof slash)}>
                  <option value="keep">Leave as it is</option>
                  <option value="add">Add a trailing slash</option>
                  <option value="remove">Remove the trailing slash</option>
                </select>
              </Field>
            </div>
            <Checkbox checked={indexHtml} onChange={setIndexHtml} label="Redirect /index.html and /index.php to the folder URL" />
          </div>
        </Panel>
        <Panel
          title={<span>Redirects</span>}
          actions={
            <Button variant="ghost" icon="plus" onClick={() => setRows([...rows, { kind: "page", from: "", to: "", status: "301" }])}>
              Add redirect
            </Button>
          }
        >
          <ol className="grid gap-0">
            {rows.map((r, i) => (
              <li key={i} className="grid gap-3 border-b border-line p-3 last:border-b-0 sm:grid-cols-2 sm:p-4">
                <Field label={`Redirect ${i + 1}: type`} htmlFor={`${id}-k${i}`}>
                  <select id={`${id}-k${i}`} className="select" value={r.kind} onChange={(e) => setRow(i, { kind: e.target.value as RedirectRow["kind"] })}>
                    {Object.entries(KIND_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                {r.kind !== "gone" ? (
                  <Field label="Status" htmlFor={`${id}-st${i}`}>
                    <select id={`${id}-st${i}`} className="select" value={r.status} onChange={(e) => setRow(i, { status: e.target.value as RedirectRow["status"] })}>
                      <option value="301">301 Moved permanently</option>
                      <option value="302">302 Found (temporary)</option>
                      <option value="307">307 Temporary, keep method</option>
                      <option value="308">308 Permanent, keep method</option>
                    </select>
                  </Field>
                ) : (
                  <span />
                )}
                <Field label={r.kind === "domain" ? "Old domain" : "Old path"} htmlFor={`${id}-f${i}`}>
                  <input
                    id={`${id}-f${i}`}
                    className="input mono"
                    value={r.from}
                    placeholder={r.kind === "domain" ? "old-site.com" : r.kind === "folder" ? "/blog/" : "/old-page/"}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => setRow(i, { from: e.target.value })}
                  />
                </Field>
                {r.kind !== "gone" && (
                  <Field label={r.kind === "domain" ? "New address" : "New path or URL"} htmlFor={`${id}-t${i}`}>
                    <input
                      id={`${id}-t${i}`}
                      className="input mono"
                      value={r.to}
                      placeholder={r.kind === "domain" ? "https://new-site.com" : r.kind === "folder" ? "/news/" : "/new-page/"}
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(e) => setRow(i, { to: e.target.value })}
                    />
                  </Field>
                )}
                <div className="sm:col-span-2">
                  <Button variant="ghost" icon="trash" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, k) => k !== i))}>
                    Remove redirect {i + 1}
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      <Panel
        title={<span id={`${id}-out`}>.htaccess rules</span>}
        actions={
          <>
            <CopyButton text={gen.code} disabled={!gen.code} variant="primary" />
            <DownloadButton data={() => gen.code} filename="htaccess.txt" disabled={!gen.code} />
          </>
        }
        footer={
          gen.code ? (
            <Link
              className="font-semibold text-accent underline"
              href="/htaccess-tester/"
              onClick={() => {
                try {
                  sessionStorage.setItem("pss:input:htaccess-tester", gen.code);
                } catch {
                  /* ignore */
                }
                announce("Opening the tester");
              }}
            >
              Test these rules in the .htaccess tester
            </Link>
          ) : undefined
        }
      >
        {gen.warnings.length > 0 && (
          <div className="p-3 sm:p-4">
            <Alert tone="warning">
              {gen.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </Alert>
          </div>
        )}
        <textarea
          aria-labelledby={`${id}-out`}
          readOnly
          wrap="off"
          className="textarea mono rounded-none border-0"
          style={{ ["--ta-min" as string]: "20rem", ["--ta-min-lg" as string]: "30rem" }}
          value={gen.code}
          placeholder="Choose site-wide rules or add a redirect to see the code."
        />
        <p className="border-t border-line px-3 py-2 text-sm text-ink-3 sm:px-4">
          Save as <code>.htaccess</code> in your site&apos;s root folder (the download is named htaccess.txt because some systems hide files starting with a dot). Keep a copy of the old file.
        </p>
      </Panel>
    </div>
  );
}

/* ---------------- dispatcher ---------------- */

export default function CodeOps({ toolId, config }: WidgetProps) {
  const op = String(config?.op ?? "");
  if (op === "base64") return <Base64Tool toolId={toolId} />;
  if (op === "htaccess-generator") return <HtaccessGenerator />;
  const def = OPS[op];
  if (!def) return <p role="alert">Unknown operation: {op}</p>;
  const presets: Opts = {};
  if (config) for (const [k, v] of Object.entries(config)) if (k !== "op" && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) presets[k] = v;
  return <TransformTool def={def} toolId={toolId} presets={presets} />;
}
