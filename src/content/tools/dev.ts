import type { ToolDef } from "@/lib/types";

/*
 * Developer tools. Titles, H1s, descriptions and H2 outlines follow docs/keyword-map.json
 * (the JavaScript formatter's description was corrected: the tool has no quote or semicolon
 * options). Examples are real outputs of src/tools/lib/dev/* (run with npx tsx).
 */

const UPDATED = "2026-09-30";

const RFC8259 = { label: "RFC 8259: The JavaScript Object Notation (JSON) Data Interchange Format", url: "https://www.rfc-editor.org/rfc/rfc8259" };
const RFC4180 = { label: "RFC 4180: Common Format and MIME Type for CSV Files", url: "https://www.rfc-editor.org/rfc/rfc4180" };
const HTML_SPEC_OPTIONAL = { label: "HTML Living Standard: optional tags", url: "https://html.spec.whatwg.org/multipage/syntax.html#optional-tags" };
const MDN_COMPRESSION = { label: "MDN: Compression in HTTP", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Compression" };
const MOD_REWRITE = { label: "Apache HTTP Server: mod_rewrite reference", url: "https://httpd.apache.org/docs/current/mod/mod_rewrite.html" };
const MOD_ALIAS = { label: "Apache HTTP Server: mod_alias reference", url: "https://httpd.apache.org/docs/current/mod/mod_alias.html" };
const WCAG_CONTRAST = { label: "WCAG 2.2 Success Criterion 1.4.3: Contrast (Minimum)", url: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html" };
const CSS_COLOR_4 = { label: "CSS Color Module Level 4 (W3C)", url: "https://www.w3.org/TR/css-color-4/" };

export const DEV_TOOLS: ToolDef[] = [
  /* ---------------- Formatters and minifiers ---------------- */
  {
    id: "javascript-formatter",
    path: "/javascript-formatter/",
    name: "JavaScript Formatter",
    h1: "JavaScript Formatter",
    title: "JavaScript Formatter – Beautify or Unminify JS Code",
    metaDescription:
      "Beautify minified or messy JavaScript with your choice of indentation, brace style and line wrapping. Paste the code, format it and copy the readable result.",
    summary:
      "Turn minified or badly indented JavaScript into readable code with consistent indentation, one statement per line and your choice of brace style. The formatting runs in your browser.",
    category: "development-tools",
    subgroup: "format",
    card: "Beautify minified or messy JavaScript into readable, indented code.",
    archetype: "transform",
    widget: "code-ops",
    config: { op: "js-format" },
    aliases: [
      "js beautifier",
      "javascript beautifier",
      "js formatter",
      "unminify js",
      "unminify javascript",
      "prettify javascript",
      "format js online",
      "javascript pretty print",
      "js deobfuscate",
      "javascript formater",
    ],
    keywords: ["beautify", "indent", "pretty print", "unminify", "code"],
    processing: "browser",
    limits: [
      "Formatting restores layout, not the original variable names or comments a minifier removed.",
      "Not TypeScript- or JSX-aware: plain JavaScript formats reliably; for .ts and .tsx files use Prettier in your editor.",
    ],
    steps: [
      "Paste your code into the **JavaScript** box, or press **Example** to load a minified sample.",
      "Choose **Indent** (2 spaces, 4 spaces or tabs), **Braces** and **Wrap lines at**. Tick **Break chained methods** for long `.then()` chains.",
      "Press **Format JavaScript** (or Ctrl + Enter). The result appears in **Formatted JavaScript** with the before and after line count.",
      "Press **Copy** or **Download** to save `formatted.js`.",
    ],
    example: {
      input: 'function greet(name){if(!name){return"Hello, stranger"}return"Hello, "+name+"!"}',
      output: 'function greet(name) {\n  if (!name) {\n    return "Hello, stranger"\n  }\n  return "Hello, " + name + "!"\n}',
      note: "Indent: 2 spaces, Braces: Same line. The formatter adds line breaks and spaces only; it doesn't add the missing semicolons.",
    },
    sections: [
      {
        heading: "Formatting options",
        body: "| Option | What it changes |\n|---|---|\n| **Indent** | 2 spaces (common in JavaScript projects), 4 spaces, or tabs |\n| **Braces** | `{` on the same line as `if`/`function` (the usual JavaScript style), on a new line, or short blocks kept on one line |\n| **Wrap lines at** | Breaks long expressions near 80 or 120 characters; off by default |\n| **Blank lines** | Keeps up to one or two blank lines you already had, or removes them all |\n| **Break chained methods** | Puts each `.then()`, `.map()` or jQuery call on its own line |\n| **Decode \\x and \\u escapes** | Rewrites `\"\\x48\\x69\"` as `\"Hi\"`, which helps when reading obfuscated scripts |\n\nThe formatter only changes whitespace and line breaks (plus escapes, if you ask). It doesn't change quotes, add semicolons or rename anything.",
      },
      {
        heading: "Unminifying code",
        body: "A minifier removes whitespace and comments and usually renames local variables to single letters. Formatting puts the structure back: one statement per line, nested blocks indented, operators spaced. What it can't restore is information that was deleted: comments, the original names of local variables (`e` stays `e`), and any code a compressor folded together, such as `if` statements turned into `a ? b : c` expressions.\n\nIf the site publishes source maps (a `//# sourceMappingURL=` comment at the end of the file), your browser's developer tools can show the original source, names included. That is the only reliable way to get them back.",
      },
      {
        heading: "Formatting vs linting",
        body: "A **formatter** decides layout: indentation, line breaks, spaces. A **linter** such as ESLint checks meaning: unused variables, `==` where you meant `===`, missing `await`. Formatting never fixes a bug, and a linter doesn't care about indentation unless you configure it to.\n\nIn a project, let one tool own formatting (Prettier is the common choice) and run it on save, so diffs only show real changes. This page is for code you don't control: a minified library, a snippet from a forum, a script inside an HTML page.",
      },
      {
        heading: "JSON and TypeScript",
        body: "JSON is valid JavaScript syntax, so it formats here, but the [JSON viewer](/json-viewer/) is better for data: it validates against the JSON standard, points to the exact line of an error and shows a collapsible tree.\n\nThe beautifier works on JavaScript tokens rather than a full TypeScript parser. Simple type annotations usually come through unchanged, but generics, decorators and JSX can be laid out oddly. Format TypeScript and React files with Prettier or your editor's built-in formatter.",
      },
    ],
    faq: [
      {
        q: "Can it restore original variable names?",
        a: "No. A minifier throws the original local names away, so no formatter can bring them back. Only a source map from the site's build has them.",
      },
      {
        q: "Does formatting change how code runs?",
        a: "No. Only whitespace and line breaks change, which JavaScript ignores. The one exception is the optional escape decoding, which writes the same string values in a different form.",
      },
      {
        q: "Does it support TypeScript?",
        a: "Partly. Plain type annotations usually format fine, but the formatter isn't TypeScript-aware, so use Prettier for .ts and .tsx files.",
      },
      {
        q: "Is my code uploaded?",
        a: "No. The formatter (js-beautify) is downloaded to your browser the first time you press Format and runs there.",
      },
    ],
    sources: [
      { label: "js-beautify documentation (options)", url: "https://github.com/beautifier/js-beautify#options" },
      { label: "MDN: Using source maps in Firefox DevTools", url: "https://firefox-source-docs.mozilla.org/devtools-user/debugger/how_to/use_a_source_map/" },
    ],
    related: ["javascript-minifier", "json-viewer", "html-formatter", "css-formatter", "regex-tester"],
    links: [
      { href: "/javascript-minifier/", anchor: "JavaScript minifier" },
      { href: "/json-viewer/", anchor: "JSON viewer" },
      { href: "/html-formatter/", anchor: "HTML formatter" },
      { href: "/css-formatter/", anchor: "CSS formatter" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Indent with 2 spaces, 4 spaces or tabs",
      "Four brace styles and optional line wrapping",
      "Breaks chained method calls onto separate lines",
      "Decodes \\x and \\u escapes in obfuscated strings",
      "Runs in the browser; code is not uploaded",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["js", "minified js"], to: ["js"] },
  },
  {
    id: "html-formatter",
    path: "/html-formatter/",
    name: "HTML Formatter",
    h1: "HTML Formatter",
    title: "HTML Formatter – Beautify and Indent HTML Code",
    metaDescription:
      "Indent messy or minified HTML so it's readable again: choose spaces or tabs, attribute wrapping and blank-line handling, and compare before and after.",
    summary:
      "Indent minified or messy HTML so each element sits on its own line at the right depth, with embedded CSS and JavaScript formatted too. Choose spaces or tabs and how attributes wrap.",
    category: "development-tools",
    subgroup: "format",
    card: "Indent minified or messy HTML so it is readable again.",
    archetype: "transform",
    widget: "code-ops",
    config: { op: "html-format" },
    aliases: [
      "html beautifier",
      "html prettifier",
      "indent html",
      "format html online",
      "html pretty print",
      "unminify html",
      "clean up html code",
      "html tidy",
      "html formater",
    ],
    keywords: ["beautify", "indent", "markup", "pretty print"],
    processing: "browser",
    limits: ["The formatter re-indents markup; it doesn't repair unclosed or mis-nested tags."],
    steps: [
      "Paste your markup into the **HTML** box, or press **Example**.",
      "Set **Indent**, **Attributes** (wrap only when long, or one per line) and **Wrap lines at**. Tick **Indent <head> and <body>** if your style guide indents them under `<html>`.",
      "Press **Format HTML**. The footer shows how many lines the code had before and after.",
      "Press **Copy**, or **Download** to save `formatted.html`.",
    ],
    example: {
      input: '<ul class="nav"><li><a href="/">Home</a></li><li><a href="/about/">About</a></li></ul>',
      output: '<ul class="nav">\n  <li><a href="/">Home</a></li>\n  <li><a href="/about/">About</a></li>\n</ul>',
      note: "Indent: 2 spaces. Block elements (ul, li) get their own lines; the inline <a> stays inside its <li>.",
    },
    sections: [
      {
        heading: "Indentation options",
        body: "Each nested block element is indented one level: 2 spaces, 4 spaces or a tab. Two spaces keep deeply nested templates readable on narrow screens; tabs let each reader choose the width in their editor. **Blank lines** controls whether empty lines you already had are kept (up to one or two) or removed.\n\nBy default `<head>` and `<body>` aren't indented under `<html>`, because every line of the page would otherwise start one level deep. Tick **Indent <head> and <body>** if your team prefers it.",
      },
      {
        heading: "Attribute wrapping",
        body: "Long tags with many attributes are hard to scan. **Attributes** decides what happens:\n\n- **Wrap only when long** keeps attributes on the tag line until it passes the **Wrap lines at** width.\n- **Each on a new line** puts every attribute on its own line, which makes diffs of templates much clearer.\n- **Each on a new line, > on its own** also moves the closing `>` down, like many JSX style guides.\n- **Aligned when wrapped** lines wrapped attributes up under the first one.\n\nAttribute values themselves are never changed.",
      },
      {
        heading: "Inline vs block elements",
        body: "Whitespace inside text matters to the browser, so the formatter treats elements differently. **Block** elements (`div`, `p`, `ul`, `li`, `table`, `section`) start on a new line. **Inline** elements (`a`, `span`, `b`, `em`, `img`) stay inside the text flow, because a line break between two inline elements renders as a space: `<b>A</b><b>B</b>` shows \"AB\", but with a line break between them it shows \"A B\".\n\n`<pre>` and `<textarea>` contents are left exactly as they are. CSS in `<style>` and JavaScript in `<script>` are formatted with the same indent settings.",
      },
      {
        heading: "Formatting email templates",
        body: "HTML emails are built from nested tables with inline styles, which makes them hard to read and easy to break. Formatting helps you find the cell you need to edit. Two cautions: keep **Wrap lines at** on **Don't wrap**, because some email clients treat long quoted-printable lines differently from what you see; and check the email again after editing, since Outlook's renderer is less forgiving than a browser. Preview the result in the [HTML viewer](/html-viewer/) before sending a test.",
      },
    ],
    faq: [
      {
        q: "Will formatting change how my page renders?",
        a: "Almost never. The exception is whitespace between inline elements: a new line between two inline tags can add a visible space. The formatter avoids splitting inline content for that reason.",
      },
      {
        q: "Can it fix broken HTML?",
        a: "No. It indents what is there. Unclosed tags produce odd indentation, which is often a useful hint about where the problem is, but you have to fix the markup yourself.",
      },
      {
        q: "Does it format embedded CSS and JS?",
        a: "Yes. The contents of `<style>` and `<script>` blocks are formatted with the same indent. JSON in `<script type=\"application/ld+json\">` is indented too.",
      },
    ],
    sources: [
      { label: "js-beautify documentation (HTML options)", url: "https://github.com/beautifier/js-beautify#css--html" },
      { label: "MDN: How whitespace is handled by HTML, CSS, and in the DOM", url: "https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace" },
    ],
    related: ["html-minifier", "html-viewer", "css-formatter", "javascript-formatter", "html-to-text-converter"],
    links: [
      { href: "/html-minifier/", anchor: "HTML minifier" },
      { href: "/html-viewer/", anchor: "preview HTML" },
      { href: "/css-formatter/", anchor: "CSS formatter" },
      { href: "/javascript-formatter/", anchor: "JavaScript formatter" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Indent with spaces or tabs",
      "Four attribute-wrapping styles",
      "Formats embedded <style> and <script> blocks",
      "Leaves <pre> and <textarea> content untouched",
      "Shows line counts before and after",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["html", "minified html"], to: ["html"] },
  },
  {
    id: "css-formatter",
    path: "/css-formatter/",
    name: "CSS Formatter",
    h1: "CSS Formatter",
    title: "CSS Formatter – Beautify and Unminify CSS",
    metaDescription:
      "Turn minified or messy CSS into readable, consistently indented rules. Choose indent size and brace style, optionally sort properties, and copy.",
    summary:
      "Turn minified or messy CSS into one declaration per line with consistent indentation, a blank line between rules and, if you want, properties sorted alphabetically.",
    category: "development-tools",
    subgroup: "format",
    card: "Unminify CSS into readable rules, with optional property sorting.",
    archetype: "transform",
    widget: "code-ops",
    config: { op: "css-format" },
    aliases: [
      "css beautifier",
      "css prettifier",
      "unminify css",
      "format css online",
      "css pretty print",
      "css indent",
      "sort css properties",
      "css formater",
    ],
    keywords: ["beautify", "stylesheet", "indent", "sort"],
    processing: "browser",
    limits: ["Plain CSS (including native nesting). SCSS and Less usually format, but their syntax isn't validated."],
    steps: [
      "Paste the stylesheet into the **CSS** box, or press **Example**.",
      "Choose **Indent** and **Opening brace** (same line or new line). Untick **Blank line between rules** for a denser layout.",
      "Tick **Sort properties A–Z** if you want declarations in alphabetical order inside each rule.",
      "Press **Format CSS**, then **Copy** or **Download** (`formatted.css`).",
    ],
    example: {
      input: ".card{padding:16px;color:#333}.card:hover,.card:focus{color:#000}@media (max-width:600px){.card{padding:8px}}",
      output: ".card {\n  padding: 16px;\n  color: #333\n}\n\n.card:hover,\n.card:focus {\n  color: #000\n}\n\n@media (max-width:600px) {\n  .card {\n    padding: 8px\n  }\n}",
      note: "Each selector in a list gets its own line. Values are not changed, so the last declaration still has no semicolon, exactly as in the input.",
    },
    sections: [
      {
        heading: "Indent and brace style",
        body: "Rules are written with one declaration per line, indented by 2 spaces, 4 spaces or a tab. **Opening brace** puts `{` either after the selector (the most common style) or on a line of its own. Comma-separated selectors go on separate lines, so `.a, .b, .c` becomes three lines that are easy to scan and to diff.\n\nComments are kept where they were. Values are left alone: the formatter doesn't shorten colors, add missing semicolons or change units.",
      },
      {
        heading: "Sorting properties",
        body: "**Sort properties A–Z** orders the declarations inside each rule alphabetically, ignoring vendor prefixes (`-webkit-transition` sorts next to `transition` and stays in front of it). Custom properties (`--brand-color`) are not moved, because later declarations can depend on them.\n\nSorting is safe for most stylesheets, but not all: when the same property appears twice, or a shorthand (`margin`) and a longhand (`margin-top`) appear in the same rule, the later one wins. Swapping their order changes the result. Check rules like that after sorting.",
      },
      {
        heading: "Media queries and nesting",
        body: "Rules inside `@media`, `@supports` and `@layer` are indented one more level, which makes it obvious which breakpoint a rule belongs to. Native CSS nesting, now supported in all current browsers, is indented the same way:\n\n```\n.card {\n  color: #333;\n  &:hover {\n    color: #000;\n  }\n}\n```\n\nSCSS and Less files share most of this syntax and usually format correctly, but the formatter doesn't understand mixins or functions, so unusual constructs may come out with odd spacing.",
      },
      {
        heading: "Formatting vs minifying",
        body: "Formatting is for people: you read, edit and review the code. Minifying is for browsers: the [CSS minifier](/css-minifier/) removes the spaces, comments and line breaks that formatting adds, and shortens values such as `#ff0000` to `red`. Keep the formatted file in your project and let your build step produce the minified one. To turn a downloaded `.min.css` back into something you can read, format it here.",
      },
    ],
    faq: [
      {
        q: "Does it support CSS nesting?",
        a: "Yes. Nested rules are indented under their parent, like rules inside a media query.",
      },
      {
        q: "Will sorting properties change behavior?",
        a: "Only when a rule sets the same property twice, or mixes a shorthand such as `background` with a longhand such as `background-color`. The later declaration wins, so changing the order can change the result.",
      },
      {
        q: "Can I format SCSS?",
        a: "Usually, yes: variables, nesting and `@include` lines are indented normally. The formatter doesn't validate SCSS syntax, so check unusual mixins by eye.",
      },
    ],
    sources: [
      { label: "W3C: CSS Nesting Module", url: "https://www.w3.org/TR/css-nesting-1/" },
      { label: "MDN: Cascade, specificity and inheritance", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Handling_conflicts" },
    ],
    related: ["css-minifier", "html-formatter", "color-code-converter", "javascript-formatter"],
    links: [
      { href: "/css-minifier/", anchor: "CSS minifier" },
      { href: "/html-formatter/", anchor: "HTML formatter" },
      { href: "/color-code-converter/", anchor: "colour converter" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "One declaration per line with 2-space, 4-space or tab indent",
      "Brace on the same line or a new line",
      "Optional alphabetical property sorting that respects vendor prefixes",
      "Indents media queries and native CSS nesting",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["css", "minified css"], to: ["css"] },
  },
  {
    id: "javascript-minifier",
    path: "/javascript-minifier/",
    name: "JavaScript Minifier",
    h1: "JavaScript Minifier",
    title: "JavaScript Minifier – Minify JS and See Size Savings",
    metaDescription:
      "Minify JavaScript by removing whitespace and comments and shortening variable names, then compare the original, minified and gzip sizes.",
    summary:
      "Minify JavaScript with Terser: whitespace and comments removed, local variables shortened and dead code dropped. You see the original, minified and gzipped sizes side by side.",
    category: "development-tools",
    subgroup: "format",
    card: "Minify JavaScript with Terser and see the size and gzip savings.",
    archetype: "transform",
    widget: "code-ops",
    config: { op: "js-minify" },
    aliases: [
      "minify js",
      "js minifier",
      "compress javascript",
      "uglify js",
      "javascript compressor",
      "minify javascript online",
      "terser online",
      "js minify",
      "javascript minifer",
    ],
    keywords: ["minify", "compress", "uglify", "terser", "page speed"],
    processing: "browser",
    limits: [
      "The code must be valid JavaScript (ES2020 or earlier syntax is safest); TypeScript and JSX must be compiled first.",
      "No source map is produced.",
    ],
    steps: [
      "Paste your script into the **JavaScript** box, or press **Example**.",
      "Keep **Shorten variable names** and **Optimize code** ticked for the smallest result. Tick `Remove console.* calls` for production builds.",
      "Leave **Code type** on **Detect**; choose **ES module** if the file uses `import`/`export` but the detection misses it.",
      "Press **Minify JavaScript**. The footer shows the saving and the gzipped sizes; press **Copy** or **Download** (`script.min.js`).",
    ],
    example: {
      input: "// Greeting helper\nfunction greet(name) {\n  if (!name) {\n    return 'Hello, stranger';\n  }\n  const greeting = 'Hello, ' + name + '!';\n  return greeting;\n}\nconsole.log(greet('Ada'));",
      output: 'function greet(e){return e?"Hello, "+e+"!":"Hello, stranger"}console.log(greet("Ada"));',
      note: "Saved 52% (182 B → 87 B); gzipped 147 B → 96 B. The parameter name became e and the if/return pair became one conditional expression. greet keeps its name because it is a top-level function another script could call.",
    },
    sections: [
      {
        heading: "Whitespace removal vs mangling",
        body: "Minification works in three layers, each with its own option:\n\n1. **Whitespace and comments** are always removed. Comments starting with `/*!` or containing `@license` are kept when **Keep license comments** is ticked, because many licenses require the notice to stay with the code.\n2. **Shorten variable names** (mangling) renames local variables and parameters to one or two letters. Top-level names in a classic script are left alone, since other scripts on the page may use them.\n3. **Optimize code** (compression) rewrites code into shorter equivalents: dead branches removed, constant expressions folded, `if` statements turned into `&&` or `?:`. It runs two passes.\n\nIf the minified file throws errors that the original didn't, try again with **Optimize code** off to find out which layer is responsible.",
      },
      {
        heading: "Source maps",
        body: "A source map lets browser developer tools show the original file, with real names and line numbers, when an error happens in minified code. This page doesn't create one, because a source map is only useful if it is deployed next to the minified file and kept in step with it, which is a build-tool job. Webpack, Vite, esbuild and Rollup all generate source maps with a single setting. Use this tool for one-off scripts, snippets for a CMS or tag manager, and checking how much a file would shrink.",
      },
      {
        heading: "Gzip and Brotli: why transfer size differs",
        body: "Servers usually compress text before sending it, with gzip or Brotli. Compression already removes much of the repetition that whitespace adds, so the gain from minifying is smaller over the network than on disk. In the example, minifying saved 52% of the raw size but 35% of the gzipped size.\n\nThe footer shows both numbers. The gzipped figure (level 9) is close to what visitors download from a server with gzip enabled; Brotli is usually a little smaller still. Minifying and compressing together beat either one alone, because a mangled, comment-free file also compresses better.",
      },
      {
        heading: "When your build tool already minifies",
        body: "If your site is built with a bundler (Vite, Next.js, webpack, Parcel), production builds are already minified, usually with Terser or esbuild. Minifying that output again gains little. Check before you add a step: open the deployed `.js` file. If it is one long line with short variable names, it is minified.\n\nWordPress and other CMSs often serve scripts unminified. A caching or optimization plugin can minify them, or you can minify a theme's custom script here and upload the `.min.js` version. Measure the effect with the [website speed test](/website-speed-checker/).",
      },
    ],
    faq: [
      {
        q: "Can minification break my code?",
        a: "Rarely, and usually because the code relies on function or class names at runtime (`fn.name`) or uses `eval`. Terser avoids renaming in scopes that contain `eval`. If something breaks, minify again with **Optimize code** off, then with **Shorten variable names** off.",
      },
      {
        q: "Should I minify if my server uses gzip?",
        a: "Yes. The gain is smaller than the raw numbers suggest, but minified code still transfers smaller and parses faster, and comments never need to reach the browser.",
      },
      {
        q: "Can I get a source map?",
        a: "Not from this page. Generate source maps in your build tool so they stay in sync with the deployed file.",
      },
    ],
    sources: [
      { label: "Terser documentation: minify options", url: "https://terser.org/docs/options/" },
      MDN_COMPRESSION,
    ],
    related: ["javascript-formatter", "css-minifier", "html-minifier", "json-viewer"],
    links: [
      { href: "/javascript-formatter/", anchor: "JavaScript formatter" },
      { href: "/css-minifier/", anchor: "CSS minifier" },
      { href: "/html-minifier/", anchor: "HTML minifier" },
      { href: "/website-speed-checker/", anchor: "website speed test" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Terser-based minification with variable mangling and compression",
      "Original, minified and gzipped sizes compared",
      "Keeps /*! license comments on request",
      "Optional removal of console.* calls",
      "Points to the line and column of syntax errors",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["js"], to: ["min.js"] },
  },
  {
    id: "css-minifier",
    path: "/css-minifier/",
    name: "CSS Minifier",
    h1: "CSS Minifier",
    title: "CSS Minifier – Minify CSS and Compare File Size",
    metaDescription:
      "Minify CSS by removing comments, whitespace and redundant values, and see before, after and gzip sizes. Copy or download the minified stylesheet.",
    summary:
      "Minify a stylesheet with CSSO: comments and whitespace removed, values shortened and duplicate rules merged. The footer compares the original, minified and gzipped sizes.",
    category: "development-tools",
    subgroup: "format",
    card: "Minify CSS, merge duplicate rules and compare file sizes.",
    archetype: "transform",
    widget: "code-ops",
    config: { op: "css-minify" },
    aliases: ["minify css", "css compressor", "compress css", "css minify online", "css optimizer", "shrink css", "csso online", "css minifer"],
    keywords: ["minify", "compress", "stylesheet", "page speed"],
    processing: "browser",
    limits: ["Restructuring assumes the whole stylesheet is pasted; minify files separately if they depend on each other's order."],
    steps: [
      "Paste the stylesheet into the **CSS** box, or press **Example**.",
      "Keep **Merge and restructure rules** ticked for the smallest output; untick it for whitespace-and-value minification only.",
      "Press **Minify CSS**. The footer shows the percentage saved and the gzipped sizes.",
      "Press **Copy**, or **Download** to save `styles.min.css`.",
    ],
    example: {
      input: "/* buttons */\n.btn {\n  color: #ff0000;\n  margin: 0px 0px 0px 0px;\n}\n\n.btn {\n  padding: 10px;\n}",
      output: ".btn{color:red;margin:0;padding:10px}",
      note: "Saved 61% (95 B → 37 B); gzipped 89 B → 57 B. #ff0000 became red, the four 0px values became 0, and the two .btn rules were merged.",
    },
    sections: [
      {
        heading: "What CSS minification removes",
        body: "- **Comments**, except `/*! … */` license comments when `Keep /*! license comments */` is ticked.\n- **Whitespace and the last semicolon** in each rule.\n- **Longer forms of values**: `#ff0000` → `red`, `#ffffff` → `#fff`, `0px` → `0`, `0.5em` → `.5em`, `margin: 0 0 0 0` → `margin: 0`.\n- **Empty rules** and duplicate declarations inside one rule.\n\nNone of this changes how the page looks. The result is still standard CSS that every browser reads the same way as the original.",
      },
      {
        heading: "Safe vs aggressive optimizations",
        body: "**Merge and restructure rules** goes further: it merges rules with the same selector, joins selectors with identical declarations (`.a{color:red}.b{color:red}` → `.a,.b{color:red}`) and removes declarations that a later rule overrides. CSSO only does this when it can prove the cascade result is the same within the stylesheet you pasted.\n\nIt can't see other stylesheets. If your page loads `base.css` and `theme.css` and relies on their order, restructuring one of them on its own is still safe, but merging them into one file first gives the optimizer the full picture. Untick the option if you want output that maps line by line to your source.",
      },
      {
        heading: "Measuring savings",
        body: "The footer shows two comparisons. The first is the raw file size. The second is the gzipped size, which is closer to what a visitor downloads, because servers compress CSS before sending it. Comments and indentation compress well, so the gzip saving is smaller than the raw saving.\n\nFor real-world impact, check how big your CSS is relative to the whole page with the [page size checker](/page-size-checker/). On a page with 2 MB of images, saving 4 KB of CSS matters less than making that CSS non-blocking.",
      },
      {
        heading: "Minifying in your build",
        body: "For a site you build regularly, minify as part of the build so the source stays readable: Vite and Next.js minify CSS in production builds by default (with esbuild or Lightning CSS), and PostCSS users can add cssnano. This page is useful for one-off files, CSS for a CMS theme, or checking how much a stylesheet would shrink before changing your pipeline. To read a minified file, use the [CSS formatter](/css-formatter/).",
      },
    ],
    faq: [
      {
        q: "Does minifying CSS improve page speed?",
        a: "A little. CSS blocks rendering, so smaller files help first paint, but with compression enabled the transfer saving is often a few kilobytes. Removing unused CSS usually saves far more.",
      },
      {
        q: "Will it merge duplicate rules?",
        a: "Yes, with **Merge and restructure rules** ticked: identical selectors are merged and selectors sharing the same declarations are grouped.",
      },
      {
        q: "Is minified CSS still valid?",
        a: "Yes. It is standard CSS without the optional whitespace and comments. Browsers and validators read it the same way.",
      },
    ],
    sources: [{ label: "CSSO: CSS minifier with structural optimizations", url: "https://github.com/css/csso" }, MDN_COMPRESSION],
    related: ["css-formatter", "javascript-minifier", "html-minifier", "color-code-converter"],
    links: [
      { href: "/css-formatter/", anchor: "CSS formatter" },
      { href: "/javascript-minifier/", anchor: "JavaScript minifier" },
      { href: "/html-minifier/", anchor: "HTML minifier" },
      { href: "/page-size-checker/", anchor: "page size checker" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "CSSO minification with value shortening",
      "Optional merging of duplicate rules and selectors",
      "Keeps /*! license comments on request",
      "Raw and gzipped size comparison",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["css"], to: ["min.css"] },
  },
  {
    id: "html-minifier",
    path: "/html-minifier/",
    name: "HTML Minifier",
    h1: "HTML Minifier",
    title: "HTML Minifier – Minify HTML, Inline CSS and JS",
    metaDescription:
      "Minify HTML by collapsing whitespace, removing comments and optional tags, and minifying inline CSS and JavaScript. Compare sizes before and after.",
    summary:
      "Shrink an HTML page by collapsing whitespace, removing comments and, if you choose, optional end tags, while minifying the CSS and JavaScript inside it. Spacing that affects the layout is kept.",
    category: "development-tools",
    subgroup: "format",
    card: "Minify HTML with its inline CSS and JavaScript in one step.",
    archetype: "transform",
    widget: "code-ops",
    config: { op: "html-minify" },
    aliases: ["minify html", "html compressor", "compress html", "html minify online", "remove html comments", "html whitespace remover", "html minifer"],
    keywords: ["minify", "compress", "whitespace", "page speed"],
    processing: "browser",
    limits: [
      "Inline event attributes (onclick=…) and style attributes are not minified.",
      "Template syntax ({{ }}, <?php ?>) is kept, but check templates that put tags inside attribute values.",
    ],
    steps: [
      "Paste the page into the **HTML** box, or press **Example**.",
      "Choose what to do: **Collapse whitespace**, **Remove comments**, **Minify inline <style>** and **Minify inline <script>** are on by default.",
      "Tick **Remove optional end tags** for a few more bytes, if your team is happy to read HTML without `</li>` and `</td>`.",
      "Press **Minify HTML**. The footer lists the size saved, the gzipped sizes and how many comments and tags were removed. Then **Copy** or **Download**.",
    ],
    example: {
      input: '<!-- navigation -->\n<nav   class="top">\n  <ul>\n    <li><a href="/">Home</a></li>\n    <li><a href="/about/">About</a></li>\n  </ul>\n</nav>\n<p>Hello <b>world</b>,   welcome.</p>',
      output: '<nav class="top"><ul><li><a href="/">Home</a></li><li><a href="/about/">About</a></li></ul></nav><p>Hello <b>world</b>, welcome.</p>',
      note: "Saved 25% (175 B → 132 B); gzipped 140 B → 116 B; 1 comment removed. With Remove optional end tags ticked, both </li> tags are dropped as well.",
    },
    sections: [
      {
        heading: "What HTML minification removes",
        body: "- **Comments**, except Internet Explorer conditional comments (`<!--[if IE]>`), which some email templates still rely on.\n- **Whitespace between block elements** such as `</li>` and `<li>`, where the browser ignores it anyway.\n- **Runs of spaces and line breaks inside text**, collapsed to one space, which is how the browser displays them.\n- **Extra spaces inside tags**: `<nav   class=\"top\" >` becomes `<nav class=\"top\">`.\n- **Optional end tags** (when ticked): the HTML standard lets you leave out `</li>`, `</p>` before a block, `</td>`, `</tr>`, `</option>`, `</body>` and `</html>`. Browsers build the same page either way.",
      },
      {
        heading: "Inline CSS and JavaScript",
        body: "The contents of `<style>` blocks are minified with CSSO and `<script>` blocks with Terser, the same engines as the [CSS minifier](/css-minifier/) and [JavaScript minifier](/javascript-minifier/). JSON-LD and other `<script type=\"application/json\">` blocks are compacted as JSON. Scripts of other types (templates such as `text/x-template`) are left alone.\n\nIf a script has a syntax error, it is kept exactly as it was and the footer tells you, rather than failing the whole page.",
      },
      {
        heading: "Whitespace that matters",
        body: "Not all whitespace is decoration. A space between two inline elements is visible: `<b>Hello</b> <i>world</i>` must keep its space or the words run together. The minifier keeps one space wherever text or inline elements meet, and removes whitespace only next to block-level elements.\n\nContent inside `<pre>` and `<textarea>` is never touched, since every space there is displayed. One known edge case: elements styled `display: inline-block` (navigation items, buttons) are spaced by the whitespace between them, and removing it between `<li>` tags closes those gaps. If a horizontal menu shifts after minifying, that is why.",
      },
      {
        heading: "Savings vs compression",
        body: "HTML is highly repetitive, so gzip and Brotli compress it well, and the gain from minifying is smaller over the network than on disk. In the example the raw saving was 25% and the gzipped saving 17%. For server-rendered pages, enabling compression on the server is the bigger win; minifying on top of that trims what remains, and removing comments also stops internal notes from being published. Compare the effect on a whole page with the [page size checker](/page-size-checker/).",
      },
    ],
    faq: [
      {
        q: "Can minifying break my layout?",
        a: "Only where whitespace between inline-block elements created visible gaps, such as menu items or buttons in a row. Fix it in CSS (flexbox with `gap`) rather than relying on spaces in the markup.",
      },
      {
        q: "Should I remove optional closing tags?",
        a: "It is valid HTML and saves a few bytes, but the markup gets harder to read and edit. It is reasonable for generated output, less so for files people maintain.",
      },
      {
        q: "Is minified HTML bad for SEO?",
        a: "No. Search engines parse the same document either way. Removing comments and whitespace doesn't change the text, links or structure they read.",
      },
    ],
    sources: [HTML_SPEC_OPTIONAL, { label: "HTML Living Standard: whitespace in text and inline formatting", url: "https://html.spec.whatwg.org/multipage/dom.html#inter-element-whitespace" }],
    related: ["html-formatter", "css-minifier", "javascript-minifier", "html-viewer"],
    links: [
      { href: "/html-formatter/", anchor: "HTML formatter" },
      { href: "/css-minifier/", anchor: "CSS minifier" },
      { href: "/javascript-minifier/", anchor: "JavaScript minifier" },
      { href: "/page-size-checker/", anchor: "page size checker" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Collapses whitespace without touching <pre> and <textarea>",
      "Removes comments but keeps conditional comments",
      "Minifies inline <style> (CSSO) and <script> (Terser)",
      "Optional removal of end tags the HTML standard makes optional",
      "Raw and gzipped size comparison",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["html"], to: ["min.html"] },
  },

  /* ---------------- JSON and CSV ---------------- */
  {
    id: "json-viewer",
    path: "/json-viewer/",
    name: "JSON Viewer",
    h1: "JSON Viewer",
    title: "JSON Viewer – Format, Validate and Explore JSON",
    metaDescription:
      "Paste or upload JSON to validate it, pretty-print or minify it, and browse it as a collapsible tree. Errors point to the exact line and character.",
    summary:
      "Validate, pretty-print or minify JSON and explore it as a collapsible, searchable tree. If the JSON is invalid, you see the line, the column and a plain-English reason.",
    category: "development-tools",
    subgroup: "data",
    card: "Validate, format and explore JSON as a searchable tree.",
    archetype: "transform",
    widget: "json-viewer",
    config: { mode: "viewer" },
    aliases: [
      "json formatter",
      "json validator",
      "json beautifier",
      "json tree viewer",
      "json pretty print",
      "json lint",
      "format json online",
      "json checker",
      "json minifier",
      "json parser online",
      "jsonviewer",
      "json vewer",
    ],
    keywords: ["json", "validate", "format", "tree", "pretty print", "minify"],
    processing: "browser",
    limits: [
      "Inputs over 1 million characters are processed when you press Format and validate, not as you type.",
      "Standard JSON only: comments, trailing commas and single quotes are reported as errors.",
    ],
    steps: [
      "Paste JSON into the **JSON** box, press **Open file** to load a `.json` file, or press **Example**.",
      "Read the result: valid JSON shows **Valid JSON** with counts of objects, arrays and values; invalid JSON shows the line and column with a caret under the problem. Press **Go to error** to jump there.",
      "Switch **View** between **Formatted**, **Tree** and **Minified**, and set **Indent** and **Sort keys**.",
      "In **Tree** view, type in **Search keys and values** to list every matching path, or use **Expand all** and **Collapse all**.",
      "Press **Copy** or **Download** to save `data.json` or `data.min.json`.",
    ],
    example: {
      input: '{"name":"Ada Lovelace","born":1815,"languages":["English","French"],"id":12345678901234567890}',
      output: '{\n  "name": "Ada Lovelace",\n  "born": 1815,\n  "languages": [\n    "English",\n    "French"\n  ],\n  "id": 12345678901234567890\n}',
      note: "The large id is written back exactly. Tools that round-trip through JavaScript numbers would print 12345678901234567000.",
    },
    sections: [
      {
        heading: "Validating JSON and reading errors",
        body: "The viewer checks your input against the JSON standard (RFC 8259) and stops at the first problem, showing the line, the column and the line itself with a caret. For `{\"name\": \"Ada\", \"born\": 1815,}` it reports **line 1, column 29: Trailing comma before }**.\n\nThe most common causes, each with its own message:\n\n| Error | Fix |\n|---|---|\n| Trailing comma after the last item | Delete the comma before `}` or `]` |\n| Single quotes `'name'` | Use double quotes |\n| Unquoted key `{name: 1}` | Quote it: `{\"name\": 1}` |\n| `True`, `None`, `NaN`, `undefined` | Use `true`, `null` or a string |\n| Comment `// …` | Remove it (JSON has no comments) |\n| Line break inside a string | Write it as `\\n` |\n\nDuplicate keys are valid syntax, but most parsers keep only the last value, so the viewer warns you about them.",
      },
      {
        heading: "Pretty-print and minify",
        body: "**Formatted** indents with 2 spaces, 4 spaces or tabs, one value per line. **Minified** removes every optional space and line break, the form used in API responses and config strings. **Sort keys** orders object keys A → Z or Z → A, which makes two versions of a document easy to compare.\n\nValues are copied exactly as written: `1.50` stays `1.50`, `\\u00e9` stays an escape, and integers larger than JavaScript can hold (above 9,007,199,254,740,991) aren't rounded. Many online formatters silently change such IDs.",
      },
      {
        heading: "Tree view and search",
        body: "**Tree** shows objects and arrays as collapsible branches, each labelled with its size (`{6 keys}`, `[2 items]`). The first two levels open automatically. Hover a node to see its path, such as `$.address.city` or `$.items[3].price`.\n\n**Search keys and values** finds every key or value that contains your text, case-insensitively, and lists the matching paths. That is the quickest way to find where a field lives in a large API response. Arrays with more than 200 items show the first 200, with a button to load more.",
      },
      {
        heading: "Large files",
        body: "Everything runs in your browser, so the limit is your device's memory rather than an upload cap. Inputs up to 1 million characters are validated as you type (with a short delay); larger ones wait until you press **Format and validate**, so typing never freezes. Files of tens of megabytes work on a desktop browser. The formatted view shows the first 3 million characters; **Copy** and **Download** always include everything.",
      },
      {
        heading: "JSON vs JSON5 and comments",
        body: "JSON5 and JSONC (\"JSON with comments\", used by VS Code and `tsconfig.json`) add comments, trailing commas, single quotes and unquoted keys. They are convenient for config files people edit, but they aren't JSON, and `JSON.parse` rejects them. This viewer follows the standard, so it reports those features as errors. That is deliberate: if an API or a library expects JSON, this is exactly what it would reject.",
      },
    ],
    faq: [
      {
        q: "Why is my JSON invalid?",
        a: "Usually a trailing comma, single quotes, an unquoted key, a comment, or Python-style `True`/`None`. The error box names the problem and points to the exact character.",
      },
      {
        q: "Can I load a JSON file?",
        a: "Yes. Press **Open file** and choose a `.json`, `.geojson` or `.jsonld` file. It is read in your browser, not uploaded.",
      },
      {
        q: "Is my data sent anywhere?",
        a: "No. Parsing, formatting and searching all happen on your device. Your input is kept in this browser tab's session storage so a reload doesn't lose it, and is cleared when you close the tab.",
      },
    ],
    sources: [RFC8259, { label: "ECMA-404: The JSON Data Interchange Syntax", url: "https://ecma-international.org/publications-and-standards/standards/ecma-404/" }],
    related: ["json-to-csv", "csv-to-json", "javascript-formatter", "regex-tester", "base64-encoder-decoder"],
    links: [
      { href: "/json-to-csv/", anchor: "JSON to CSV" },
      { href: "/csv-to-json/", anchor: "CSV to JSON" },
      { href: "/javascript-formatter/", anchor: "JavaScript formatter" },
      { href: "/schema-markup-validator/", anchor: "validate JSON-LD" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Validates against RFC 8259 with line, column and a plain-English hint",
      "Formatted, minified and collapsible tree views",
      "Search across keys and values with JSON paths",
      "Keeps large integers and number formats exactly as written",
      "Warns about duplicate keys",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  {
    id: "json-to-csv",
    path: "/json-to-csv/",
    name: "JSON to CSV Converter",
    h1: "JSON to CSV Converter",
    title: "JSON to CSV Converter – Flatten Nested JSON to a Table",
    metaDescription:
      "Convert a JSON array to CSV, flattening nested objects into columns. Preview the table, choose the delimiter and download a file that opens in Excel.",
    summary:
      "Convert a JSON array, a single object or JSON Lines into CSV. Nested objects become dot-path columns such as address.city, and a table preview shows the result before you download.",
    category: "development-tools",
    subgroup: "data",
    card: "Convert JSON to CSV, flattening nested objects into columns.",
    archetype: "transform",
    widget: "json-viewer",
    config: { mode: "json-to-csv" },
    aliases: [
      "json to csv converter",
      "convert json to csv",
      "json to excel",
      "json to spreadsheet",
      "nested json to csv",
      "jsonl to csv",
      "json array to csv",
      "json to tsv",
      "json 2 csv",
    ],
    keywords: ["json", "csv", "excel", "flatten", "spreadsheet"],
    processing: "browser",
    limits: ["The table preview shows the first 50 rows; the CSV contains every record."],
    steps: [
      "Paste JSON into the **JSON** box, press **Open file**, or press **Example**. An array of objects, a single object, an object holding one array, and JSON Lines are all accepted.",
      "Pick a **Delimiter** (comma, semicolon, tab or pipe) and how to handle **Arrays inside records**.",
      "Leave **Header row** and **Excel-friendly download** ticked if the file is going to Excel. Tick **Neutralize formulas** for data from untrusted sources.",
      "Check the **Table preview**, then press **Copy** or **Download** (`data.csv`, or `data.tsv` for tabs).",
    ],
    example: {
      input:
        '[{"id":1,"name":"Ada","address":{"city":"London"},"tags":["math","code"]},\n {"id":2,"name":"Grace","address":{"city":"New York"},"tags":[]}]',
      output: "id,name,address.city,tags\n1,Ada,London,math; code\n2,Grace,New York,",
      note: "Arrays inside records: Join values. With One column per item, tags becomes tags.0 and tags.1 columns instead.",
    },
    sections: [
      {
        heading: "Flattening nested objects",
        body: "CSV is a flat table, so nested objects are spread into columns named by their path: `{\"address\": {\"city\": \"London\", \"zip\": \"N1\"}}` becomes the columns `address.city` and `address.zip`. Nesting can go as deep as you like (`order.customer.address.city`).\n\nThe column list is the union of the keys found in all records, in the order they first appear. A record that lacks a key gets an empty cell, so records with different shapes still line up. An empty object becomes one empty cell, so the column isn't lost.",
      },
      {
        heading: "Arrays inside records",
        body: "Arrays have no natural place in a table, so **Arrays inside records** gives three choices:\n\n| Option | `\"tags\": [\"math\", \"code\"]` becomes |\n|---|---|\n| Join values with \"; \" | one `tags` column: `math; code` |\n| One column per item | `tags.0` = math, `tags.1` = code |\n| Keep as JSON text | one `tags` column: `[\"math\",\"code\"]` |\n\nJoining is easiest to read. One column per item suits short, fixed-length lists such as coordinates. Keeping JSON text is lossless and best when the CSV will be read back by a program. Arrays of objects are always kept as JSON text when joining, since joining them would lose their structure.",
      },
      {
        heading: "Delimiters and Excel compatibility",
        body: "The output follows RFC 4180: fields containing the delimiter, quotes or line breaks are wrapped in double quotes, and quotes inside them are doubled (`\"Said \"\"hello\"\"\"`). Lines end with CRLF.\n\nExcel opens a CSV with the list separator of your system's region settings. In much of Europe that is a semicolon, so a comma-separated file lands in one column; choose **Semicolon** for those users. **Excel-friendly download** adds a UTF-8 byte order mark, without which Excel on Windows shows `é` as `Ã©`. **Neutralize formulas** prefixes cells that start with `=`, `+`, `-` or `@` with an apostrophe, so a malicious value can't run as a spreadsheet formula.",
      },
      {
        heading: "Large files",
        body: "Conversion runs in your browser and updates as you type, with a longer pause for inputs over 200,000 characters. Tens of thousands of records convert in well under a second on a laptop. **Open file** accepts `.json`, `.jsonl` and `.ndjson`. JSON Lines (one JSON object per line, common in log exports and BigQuery) is detected automatically when the input isn't a single JSON value; the footer says \"read as JSON Lines\". If the JSON is invalid, the error shows the exact line and column, as in the [JSON viewer](/json-viewer/).",
      },
    ],
    faq: [
      {
        q: "How are nested objects handled?",
        a: "Each nested field becomes its own column named by its path, such as `address.city`. Records missing a field get an empty cell.",
      },
      {
        q: "Why do special characters look wrong in Excel?",
        a: "Excel on Windows assumes your local code page unless the file starts with a UTF-8 byte order mark. Keep **Excel-friendly download** ticked, or import the file through Data > From Text/CSV and choose UTF-8.",
      },
      {
        q: "Can I convert JSON Lines?",
        a: "Yes. Paste or open a file with one JSON object per line; it is recognized automatically.",
      },
      {
        q: "Can I convert CSV back to JSON?",
        a: "Yes, with the [CSV to JSON converter](/csv-to-json/). Tick **Nest dot.path headers** there to rebuild nested objects from columns like `address.city`.",
      },
    ],
    sources: [RFC4180, RFC8259, { label: "OWASP: CSV Injection", url: "https://owasp.org/www-community/attacks/CSV_Injection" }],
    related: ["csv-to-json", "json-viewer", "delimited-column-extractor", "rss-feed-parser"],
    links: [
      { href: "/csv-to-json/", anchor: "CSV to JSON" },
      { href: "/json-viewer/", anchor: "JSON viewer" },
      { href: "/delimited-column-extractor/", anchor: "column extractor" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Flattens nested objects into dot-path columns",
      "Three ways to handle arrays inside records",
      "Accepts JSON arrays, single objects and JSON Lines",
      "Comma, semicolon, tab or pipe delimiter with RFC 4180 quoting",
      "Excel-friendly UTF-8 download and formula neutralizing",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["json", "jsonl"], to: ["csv", "tsv", "excel"] },
  },
  {
    id: "csv-to-json",
    path: "/csv-to-json/",
    name: "CSV to JSON Converter",
    h1: "CSV to JSON Converter",
    title: "CSV to JSON Converter – Arrays, Objects and Type Detection",
    metaDescription:
      "Convert CSV to a JSON array of objects or arrays, with delimiter detection, number and boolean parsing, and a preview before you copy or download.",
    summary:
      "Convert CSV into a JSON array of objects (one per row, keyed by the header), an array of arrays, or JSON Lines. The delimiter is detected, and numbers and true/false can be typed automatically.",
    category: "development-tools",
    subgroup: "data",
    card: "Convert CSV to JSON objects or arrays, with type detection.",
    archetype: "transform",
    widget: "json-viewer",
    config: { mode: "csv-to-json" },
    aliases: [
      "csv to json converter",
      "convert csv to json",
      "excel to json",
      "spreadsheet to json",
      "tsv to json",
      "csv to json array",
      "csv to jsonl",
      "csv 2 json",
      "csv to jason",
    ],
    keywords: ["csv", "json", "excel", "convert", "parse"],
    processing: "browser",
    steps: [
      "Paste CSV into the **CSV** box, press **Open file** (`.csv`, `.tsv` or `.txt`), or press **Example**.",
      "Leave **Delimiter** on **Detect**, or choose comma, semicolon, tab or pipe. The footer shows which delimiter was used.",
      "Choose the **Output** shape, what to do with **Empty cells**, and whether to **Detect numbers and true/false**. Tick **Nest dot.path headers** to turn `address.city` columns into nested objects.",
      "Check the table preview, then press **Copy** or **Download** (`data.json` or `data.jsonl`).",
    ],
    example: {
      input: 'id;name;city;active;zip\n1;Ada;London;true;01234\n2;"Grace; Admiral";New York;false;10001',
      output:
        '[\n  {\n    "id": 1,\n    "name": "Ada",\n    "city": "London",\n    "active": true,\n    "zip": "01234"\n  },\n  {\n    "id": 2,\n    "name": "Grace; Admiral",\n    "city": "New York",\n    "active": false,\n    "zip": "10001"\n  }\n]',
      note: "The semicolon delimiter was detected. The quoted \"Grace; Admiral\" stays one field. The zip column keeps its leading zero, so every zip stays text.",
    },
    sections: [
      {
        heading: "Headers and output shape",
        body: "With **First row is headers** ticked, each row becomes an object keyed by the header names. Blank headers become `column_1`, `column_2` and so on, and repeated headers get a suffix (`name`, `name_2`) so no value is overwritten. Untick it when the file has no header row.\n\n| Output | Looks like | Use for |\n|---|---|---|\n| Array of objects | `[{\"id\":1,\"name\":\"Ada\"}]` | APIs, JavaScript, most uses |\n| Array of arrays | `[[\"id\",\"name\"],[1,\"Ada\"]]` | Compact data, charts, spreadsheets in code |\n| JSON Lines | one object per line | Logs, streaming imports, BigQuery |\n\n**Nest dot.path headers** rebuilds structure: columns `address.city` and `address.zip` become `\"address\": {\"city\": …, \"zip\": …}`. It is the reverse of the [JSON to CSV](/json-to-csv/) flattening.",
      },
      {
        heading: "Delimiters and quoted fields",
        body: "Parsing uses Papa Parse, which follows RFC 4180: a field wrapped in double quotes can contain the delimiter, line breaks and doubled quotes (`\"Said \"\"hi\"\"\"`). **Detect** tries comma, semicolon, tab and pipe and picks the one that splits the rows most consistently. Semicolons are common in files exported from European versions of Excel, where the comma is the decimal separator.\n\nRows with a different number of fields than the header are still converted, and a warning lists the first few, since they usually mean an unquoted delimiter inside a value.",
      },
      {
        heading: "Type detection",
        body: "CSV has no types: every value is text. With **Detect numbers and true/false** ticked:\n\n- `42`, `-3.5` and `1e6` become numbers.\n- `true`/`false` (any case) become booleans, and `null` becomes `null`.\n- Values with a leading zero (`01234`, `007`) stay text, and so does **every** value in that column, so a zip or phone column never mixes `\"01234\"` and `10001`.\n- Integers too large for JavaScript to hold exactly (over 16 digits) stay text, so IDs aren't rounded.\n\nUntick the option to keep every value as a string. **Empty cells** can become `\"\"`, `null`, or be left out of the object.",
      },
      {
        heading: "Converting Excel files",
        body: "The converter reads text, not `.xlsx` files. In Excel, use **File > Save As > CSV UTF-8 (Comma delimited)**; in Google Sheets, **File > Download > Comma-separated values**. Then open the file here. Choosing the UTF-8 variant keeps accented characters intact. Each sheet has to be saved separately. Formulas are exported as their calculated values, and dates as they are displayed, so set the date column format to `yyyy-mm-dd` first if you want ISO dates in the JSON.",
      },
    ],
    faq: [
      {
        q: "Does it detect the delimiter?",
        a: "Yes. With **Delimiter** on **Detect**, comma, semicolon, tab and pipe are tried and the footer shows which one was used. Choose one yourself if the guess is wrong.",
      },
      {
        q: "Can I keep numbers as strings?",
        a: "Yes. Untick **Detect numbers and true/false** and every value stays text. Columns with leading zeros stay text even when detection is on.",
      },
      {
        q: "How do I convert an Excel file?",
        a: "Save the sheet as **CSV UTF-8** in Excel (or download it as CSV from Google Sheets), then open that file here.",
      },
    ],
    sources: [RFC4180, RFC8259, { label: "Papa Parse documentation", url: "https://www.papaparse.com/docs" }],
    related: ["json-to-csv", "json-viewer", "delimited-column-extractor", "javascript-formatter"],
    links: [
      { href: "/json-to-csv/", anchor: "JSON to CSV" },
      { href: "/json-viewer/", anchor: "JSON viewer" },
      { href: "/delimited-column-extractor/", anchor: "column extractor" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Automatic delimiter detection (comma, semicolon, tab, pipe)",
      "Array of objects, array of arrays or JSON Lines output",
      "Number and boolean detection that keeps leading-zero columns as text",
      "Rebuilds nested objects from dot-path headers",
      "Table preview and malformed-row warnings",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["csv", "tsv", "excel"], to: ["json", "jsonl"] },
  },
  {
    id: "rss-feed-parser",
    path: "/rss-feed-parser/",
    name: "RSS Feed Parser",
    h1: "RSS Feed Parser",
    title: "RSS Feed Parser – View and Export RSS or Atom Feeds",
    metaDescription:
      "Load an RSS or Atom feed by URL or paste its XML to list items with titles, dates, links and media, then export them as JSON or CSV.",
    summary:
      "Load an RSS or Atom feed from its URL, or paste the XML, to see every item with its title, date, author, link and attachments, then export the items as JSON or CSV.",
    category: "development-tools",
    subgroup: "data",
    card: "View an RSS or Atom feed's items and export them as JSON or CSV.",
    archetype: "url",
    widget: "json-viewer",
    config: { mode: "rss" },
    aliases: ["rss feed viewer", "rss reader online", "rss to json", "rss to csv", "atom feed parser", "read rss feed", "feed validator", "podcast feed viewer", "rss parser"],
    keywords: ["rss", "atom", "feed", "xml", "podcast"],
    processing: "server",
    limits: [
      "Feeds larger than 3 MB are cut off when loaded by URL.",
      "Feeds behind a login or blocked to non-browser requests can't be loaded by URL; paste the XML instead.",
    ],
    steps: [
      "Under **Source**, keep **Feed URL** and enter the feed address (or the site's home page), then press **Load feed**. To work offline, choose **Paste XML**, paste the feed or press **Open file**, then press **Parse feed**.",
      "Check the summary: number of **Items**, the **Format** (RSS 2.0, RSS 1.0 or Atom 1.0) and the **Newest item** date.",
      "Use **Sort** (feed order, newest, oldest, title) and **Show** to browse the list.",
      "Press **Copy JSON**, or download the items as **JSON** or **CSV**.",
    ],
    example: {
      input:
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">\n<channel><title>Example Blog</title>\n<atom:link href="https://example.com/feed/" rel="self"/>\n<link>https://example.com/</link>\n<item><title>Compressing images for the web</title>\n<link>https://example.com/compress-images/</link>\n<pubDate>Mon, 05 Oct 2026 09:30:00 GMT</pubDate>\n<dc:creator>Ada Lovelace</dc:creator><category>Images</category>\n<description><![CDATA[<p>How to get a photo under <b>100 KB</b> without visible loss.</p>]]></description>\n</item></channel></rss>',
      output:
        '{\n  "title": "Compressing images for the web",\n  "link": "https://example.com/compress-images/",\n  "date": "2026-10-05T09:30:00.000Z",\n  "author": "Ada Lovelace",\n  "categories": ["Images"],\n  "summary": "How to get a photo under 100 KB without visible loss."\n}',
      note: "One item from the JSON export (shortened). The HTML in the description is reduced to plain text, and the RSS date is converted to ISO 8601.",
    },
    sections: [
      {
        heading: "Loading a feed by URL",
        body: "When you press **Load feed**, our server requests the address, follows redirects and returns the raw XML to your browser, which parses it. Your browser never contacts the feed's site directly, and the line under the form shows the time of the check, the HTTP status, the content type and the final URL after redirects.\n\nIf you enter a web page instead of a feed, the parser looks for `<link rel=\"alternate\" type=\"application/rss+xml\">` tags in the page and offers a button for each feed it finds. WordPress sites usually have a feed at `/feed/`, Blogger at `/feeds/posts/default`, and many others at `/rss.xml` or `/atom.xml`.",
      },
      {
        heading: "RSS vs Atom",
        body: "| | RSS 2.0 | Atom 1.0 |\n|---|---|---|\n| Root element | `<rss><channel>` | `<feed>` |\n| Item | `<item>` | `<entry>` |\n| Date | `<pubDate>` (RFC 822: `Mon, 05 Oct 2026 09:30:00 GMT`) | `<published>` / `<updated>` (ISO 8601) |\n| Content | `<description>`, often HTML in CDATA | `<summary>` / `<content type=\"html\">` |\n| Link | `<link>` text | `<link href=\"…\" rel=\"alternate\"/>` |\n\nThe parser reads both, plus the older RSS 1.0 (RDF) format, and the common extensions: `dc:creator` for authors, `content:encoded` for full text, `enclosure` for podcast audio, and `media:content` or `media:thumbnail` for images. Dates in either format are converted to ISO 8601 for sorting and export.",
      },
      {
        heading: "Exporting items",
        body: "**JSON** contains the feed's title, link, description, language and generator, plus every item with `title`, `link`, `date` (ISO 8601), `dateRaw` (as written in the feed), `author`, `categories`, `summary`, `guid`, `enclosure` (URL, type, length) and `image`. Summaries are plain text, cut at 280 characters.\n\n**CSV** has one row per item with the same fields, comma-separated with a UTF-8 byte order mark so Excel shows accented characters correctly. To reshape the JSON into other columns, run it through the [JSON to CSV converter](/json-to-csv/).",
      },
      {
        heading: "Common feed errors",
        body: "- **The XML isn't well-formed.** Usually an unescaped `&` in a title or URL: XML requires `&amp;`. One bad character makes strict feed readers reject the whole feed, so fix it at the source.\n- **This is an HTML page, not a feed.** The URL returns a web page. Use the feed buttons offered, or look for an RSS icon on the site.\n- **The server answered 403 or 404.** Some hosts block automated requests or have moved the feed. Paste the XML from your browser instead.\n- **Wrong characters (Ã©).** The feed declares one encoding but is saved in another. Our server reads feeds as UTF-8.\n- **Dates missing or unsorted.** Some feeds omit `pubDate` or use non-standard date text; the raw value is kept in `dateRaw`.",
      },
    ],
    faq: [
      {
        q: "How do I find a site's RSS feed?",
        a: "Enter the site's home page here: the parser lists any feeds the page advertises. Otherwise try `/feed/`, `/rss.xml` or `/atom.xml` after the domain.",
      },
      {
        q: "Why won't my feed load?",
        a: "The site may block automated requests, require a login, or return an error status, which the tool shows. Open the feed in your browser, copy the XML and use **Paste XML** instead.",
      },
      {
        q: "Can I convert RSS to JSON?",
        a: "Yes. After loading the feed, press **JSON** to download all items, or **Copy JSON** to paste them elsewhere.",
      },
    ],
    sources: [
      { label: "RSS 2.0 Specification (RSS Advisory Board)", url: "https://www.rssboard.org/rss-specification" },
      { label: "RFC 4287: The Atom Syndication Format", url: "https://www.rfc-editor.org/rfc/rfc4287" },
    ],
    related: ["json-viewer", "json-to-csv", "csv-to-json", "html-to-text-converter"],
    links: [
      { href: "/json-viewer/", anchor: "JSON viewer" },
      { href: "/xml-sitemap-generator/", anchor: "XML sitemap generator" },
      { href: "/json-to-csv/", anchor: "JSON to CSV" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Reads RSS 2.0, RSS 1.0 (RDF) and Atom 1.0",
      "Finds feeds advertised on a web page",
      "Shows authors, categories, podcast enclosures and images",
      "Sorts by date or title",
      "Exports items as JSON or Excel-friendly CSV",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 3,
    formats: { from: ["rss", "atom", "xml"], to: ["json", "csv"] },
  },

  {
    id: "regex-tester",
    path: "/regex-tester/",
    name: "Regex Tester",
    h1: "Regex Tester",
    title: "Regex Tester – Test JavaScript Regular Expressions Live",
    metaDescription:
      "Test regular expressions against sample text with live match highlighting, capture groups, flags and a replace preview, plus a quick syntax reference.",
    summary:
      "Test a JavaScript regular expression against your text as you type: matches are highlighted, each capture group is listed, and a replace preview shows what $1 or $<name> produce.",
    category: "development-tools",
    subgroup: "data",
    card: "Test JavaScript regular expressions with live highlighting and groups.",
    archetype: "analyzer",
    widget: "regex-tester",
    aliases: [
      "regex checker",
      "regular expression tester",
      "regex online",
      "javascript regex tester",
      "regexp tester",
      "regex101 alternative",
      "regex replace online",
      "test regex",
      "regex validator",
      "regx tester",
    ],
    keywords: ["regex", "regexp", "pattern", "match", "replace", "capture group"],
    processing: "browser",
    limits: [
      "JavaScript (ECMAScript) syntax. PCRE-only features such as possessive quantifiers and recursion aren't available.",
      "A pattern that runs longer than 2 seconds is stopped and reported.",
    ],
    steps: [
      "Type the pattern into **Pattern**, without the surrounding slashes, or pick one from **Pattern library**.",
      "Tick the **Flags** you need: **g** for every match, **i** to ignore case, **m** for per-line `^` and `$`, **s** so `.` matches new lines, **u** for Unicode.",
      "Paste your text into **Test text**. Matches are underlined in **Matches**, and **Match details** lists the position and every capture group.",
      "To try a substitution, tick **Show a replace preview** and type into **Replace with**, using `$1` or `$<name>`. Press **Copy** to take the result.",
    ],
    example: {
      input: "Pattern: (?<user>[\\w.+-]+)@(?<domain>[\\w-]+(?:\\.[\\w-]+)+)   Flags: g\nText: Write to ada@example.com or grace.hopper@navy.mil.\nReplace with: $<user> at $<domain>",
      output: "2 matches: ada@example.com (user = ada, domain = example.com), grace.hopper@navy.mil (user = grace.hopper, domain = navy.mil)\nReplace result: Write to ada at example.com or grace.hopper at navy.mil.",
    },
    sections: [
      {
        heading: "Flags: g, i, m, s, u, y",
        body: "| Flag | Name | Effect |\n|---|---|---|\n| `g` | global | Find every match, not just the first. Replace changes all of them. |\n| `i` | ignore case | `cat` matches `Cat` and `CAT`. |\n| `m` | multiline | `^` and `$` match at the start and end of each line, not only of the whole text. |\n| `s` | dotAll | `.` also matches line breaks. |\n| `u` | unicode | Treats emoji as one character and enables `\\p{L}` style property classes. |\n| `y` | sticky | Each match must start exactly where the previous one ended. |\n\nWithout `g`, the tester shows only the first match, just as `String.prototype.match` would.",
      },
      {
        heading: "Capture groups and named groups",
        body: "Parentheses capture what they match: in `(\\d{4})-(\\d{2})`, group 1 is the year and group 2 the month. Named groups make patterns self-documenting: `(?<year>\\d{4})-(?<month>\\d{2})`, read in code as `match.groups.year`.\n\n- `(?:…)` groups without capturing, for alternation or quantifiers: `(?:https?|ftp)://`.\n- `\\1` or `\\k<name>` refers back to an earlier group inside the pattern: `\\b(\\w+)\\s+\\1\\b` finds doubled words.\n- A group that didn't take part in a match is shown as *(no match)*, which is different from an empty match.\n\n**Match details** lists every group of every match (the first 500), with names in the column headers.",
      },
      {
        heading: "Replacing with $1 and named references",
        body: "In **Replace with**, these sequences insert parts of the match:\n\n| Write | Inserts |\n|---|---|\n| `$1`, `$2` … | the numbered group |\n| `$<name>` | a named group |\n| `$&` | the whole match |\n| `$'` | the text after the match (a dollar sign followed by a backtick gives the text before it) |\n| `$$` | a literal dollar sign |\n\nExample: pattern `(\\w+)@(\\S+)` and replacement `$2/$1` turn `ada@example.com` into `example.com/ada`. Without the `g` flag only the first match is replaced, which the preview points out. For bulk edits on plain text without writing a pattern, use [find and replace text](/find-and-replace-text/).",
      },
      {
        heading: "Flavour differences: JavaScript, PCRE, Python",
        body: "This tester uses your browser's JavaScript engine, so results match what `RegExp` does in Node.js and browsers. Most syntax is shared with PCRE (PHP, nginx, Apache) and Python's `re`, but not all:\n\n- **Named groups:** JavaScript and .NET write `(?<name>…)`; Python writes `(?P<name>…)`; PCRE accepts both.\n- **Lookbehind:** JavaScript allows any length; Python and most PCRE versions need a fixed length.\n- **Inline flags**: PCRE and Python accept `(?i)` at the start of a pattern. JavaScript only has the scoped form `(?i:…)`, added in ES2025 and missing from older browsers, so use the flag checkboxes instead.\n- **Possessive quantifiers and atomic groups** (`a++`, `(?>…)`) exist in PCRE, not in JavaScript.\n- **`\\A`, `\\Z`, `\\h`** are PCRE/Python; use `^`, `$` (without `m`) and `[ \\t]` in JavaScript.\n\nFor `.htaccess` patterns, which are PCRE, the [.htaccess tester](/htaccess-tester/) runs rules against a URL.",
      },
      {
        heading: "Quick reference",
        body: "| Token | Matches |\n|---|---|\n| `.` | any character except a line break (any at all with `s`) |\n| `\\d` `\\w` `\\s` | digit, word character (`[A-Za-z0-9_]`), whitespace |\n| `\\D` `\\W` `\\S` | the opposites |\n| `\\b` | a word boundary |\n| `[abc]` `[^abc]` `[a-z]` | one of, none of, a range |\n| `*` `+` `?` | 0 or more, 1 or more, 0 or 1 |\n| `{3}` `{2,5}` `{2,}` | exactly, between, at least |\n| `*?` `+?` | lazy: as few as possible |\n| `^` `$` | start and end (of each line with `m`) |\n| `(?=x)` `(?!x)` | followed by / not followed by x |\n| `(?<=x)` `(?<!x)` | preceded by / not preceded by x |\n| `\\p{L}` | any letter in any script (needs `u`) |\n\nAlternation uses a vertical bar: `cat|dog` matches either word, and `gr(a|e)y` matches gray and grey.",
      },
    ],
    faq: [
      {
        q: "Which regex flavour does this use?",
        a: "JavaScript (ECMAScript), run by your own browser. Patterns behave as they would in Node.js, Chrome, Firefox or Safari.",
      },
      {
        q: "Why does my regex match too much?",
        a: "Quantifiers are greedy: `<.*>` runs to the last `>` on the line. Make it lazy with `<.*?>`, or exclude the closing character: `<[^>]*>`.",
      },
      {
        q: "How do I match a new line?",
        a: "Use `\\n` (or `\\r?\\n` for Windows line endings). To let `.` cross lines, tick the **s** flag; to make `^` and `$` work per line, tick **m**.",
      },
      {
        q: "What happens if my pattern hangs?",
        a: "Matching runs in a background worker. If it takes more than 2 seconds, usually because of nested quantifiers like `(a+)+`, it is stopped and you see a warning instead of a frozen page.",
      },
    ],
    sources: [
      { label: "MDN: Regular expressions (JavaScript guide)", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions" },
      { label: "ECMAScript Language Specification: RegExp objects", url: "https://tc39.es/ecma262/#sec-regexp-regular-expression-objects" },
    ],
    related: ["find-and-replace-text", "remove-lines-containing", "htaccess-tester", "json-viewer", "javascript-formatter"],
    links: [
      { href: "/find-and-replace-text/", anchor: "find and replace text" },
      { href: "/remove-lines-containing/", anchor: "filter lines by pattern" },
      { href: "/json-viewer/", anchor: "JSON viewer" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Live match highlighting as you type",
      "Capture and named groups listed for every match",
      "Replace preview with $1, $<name> and $& references",
      "Library of ten common patterns",
      "Runaway patterns stopped after 2 seconds instead of freezing the page",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },

  /* ---------------- Encoding and decoding ---------------- */
  {
    id: "base64-encoder-decoder",
    path: "/base64-encoder-decoder/",
    name: "Base64 Encoder / Decoder",
    h1: "Base64 Encoder / Decoder",
    title: "Base64 Encode and Decode – Text, Files and Images",
    metaDescription:
      "Encode text or files to Base64 and decode Base64 back to text or a downloadable file. Supports URL-safe Base64, UTF-8 and data URIs for images.",
    summary:
      "Encode text or any file to Base64 and decode Base64 back to text or a file. Text is handled as UTF-8, URL-safe Base64 is detected automatically, and images can be copied as data URIs.",
    category: "development-tools",
    subgroup: "encode",
    card: "Encode and decode Base64 for text, files and image data URIs.",
    archetype: "transform",
    widget: "code-ops",
    config: { op: "base64" },
    aliases: [
      "base64 encoder",
      "base64 decoder",
      "base64 decode",
      "base64 encode",
      "base64 to text",
      "text to base64",
      "image to base64",
      "base64 to image",
      "file to base64",
      "data uri generator",
      "url safe base64",
      "bas64 decode",
    ],
    keywords: ["base64", "encode", "decode", "data uri", "binary to text"],
    processing: "browser",
    limits: ["Files up to 25 MB."],
    steps: [
      "Choose **Mode**: **Text** for strings, **File** for images, PDFs and other files.",
      "In Text mode, set **Action** to **Encode** or **Decode** and type or paste into **Text or Base64**. The result updates as you type. For encoding, pick the **Alphabet** (standard or URL-safe) and optionally **Wrap at 76 characters**.",
      "In File mode, choose a file under **File → Base64**, then press **Copy Base64**, **Copy data URI** or **Download**.",
      "To turn Base64 back into a file, paste it (or a `data:` URI) into **Base64 → file** and press **Decode to file**. The file type is detected from its first bytes.",
    ],
    example: {
      input: "Hello, Wörld!",
      output: "SGVsbG8sIFfDtnJsZCE=",
      note: "13 characters but 14 bytes of UTF-8, because ö takes two bytes. 14 bytes need 19 Base64 characters, rounded up to 20 with one = of padding.",
    },
    sections: [
      {
        heading: "Encoding text to Base64",
        body: "Base64 (RFC 4648) writes binary data using 64 safe characters: A–Z, a–z, 0–9, `+` and `/`. Every 3 bytes become 4 characters: `Man` is the bytes 77, 97, 110, whose 24 bits split into four 6-bit values (19, 22, 5, 46), which are `T`, `W`, `F`, `u`. When the input isn't a multiple of 3 bytes, `=` pads the end.\n\nText is first converted to bytes. This tool uses UTF-8, the encoding of the web, so any character works. The browser's built-in `btoa()` only accepts Latin-1 and throws an error on `€` or emoji, a common surprise when encoding in JavaScript. **Wrap at 76 characters** splits the output into lines, as MIME email (RFC 2045) requires.",
      },
      {
        heading: "Decoding Base64",
        body: "Paste Base64 with **Action** set to **Decode**. Spaces and line breaks are ignored, so wrapped email bodies and PEM blocks decode directly. Missing `=` padding is accepted, and the URL-safe alphabet is recognized automatically. A `data:image/png;base64,` prefix is stripped, and its type is shown.\n\nThe decoder reports problems precisely: a character that isn't Base64 (with its position), `=` in the middle, or a length that can't be valid. If the decoded bytes aren't valid UTF-8 text, it tells you what kind of file they look like (PNG, PDF, ZIP…) and suggests **Decode to file** in File mode.",
      },
      {
        heading: "Files and images (data URIs)",
        body: "In File mode any file up to 25 MB can be encoded. Images get a preview, and **Copy data URI** gives you a string like `data:image/png;base64,iVBORw0KGgo…` that works directly in HTML or CSS:\n\n```\n<img src=\"data:image/png;base64,iVBORw0KGgo…\" alt=\"…\">\nbackground-image: url(\"data:image/svg+xml;base64,…\");\n```\n\nInlining saves a request, but Base64 is about 33% larger than the file and can't be cached separately, so it suits small icons rather than photos. For SVG, URL-encoding the markup is usually smaller than Base64.",
      },
      {
        heading: "URL-safe Base64",
        body: "`+` and `/` have meanings in URLs and file names, so RFC 4648 §5 defines a URL-safe alphabet that uses `-` and `_` instead and usually drops the `=` padding. JSON Web Tokens, many API keys and some cloud storage signatures use it. Choose **Alphabet: URL-safe** to encode that way. Decoding accepts either alphabet, with or without padding, and the footer says when the URL-safe form was detected.\n\nExample: `Hi?>` is `SGk/Pg==` in standard Base64 and `SGk_Pg` in URL-safe Base64.",
      },
      {
        heading: "Base64 is encoding, not encryption",
        body: "Anyone can decode Base64: there is no key. It exists so binary data can travel through systems built for text, such as email, JSON, XML and URLs. Credentials sent with HTTP Basic authentication are only Base64-encoded, which is why that scheme is safe only over HTTPS. To protect data, encrypt it (for example with AES, using a key from the [encryption key generator](/encryption-generator/)); to fingerprint it, use the [hash generator](/hash-generator/).",
      },
    ],
    faq: [
      {
        q: "Is Base64 encryption?",
        a: "No. It is a reversible encoding with no key, so anyone can decode it. Never use it to hide passwords or personal data.",
      },
      {
        q: "Why does Base64 make files bigger?",
        a: "Every 3 bytes become 4 characters, so the output is about 33% larger (plus line breaks if wrapped). A 30 KB image becomes about 40 KB of Base64.",
      },
      {
        q: "Why does decoded text look garbled?",
        a: "Either the data isn't text (it is an image or another file: use **Decode to file**), or the text was encoded in a legacy character set such as Windows-1252 rather than UTF-8.",
      },
    ],
    sources: [
      { label: "RFC 4648: The Base16, Base32, and Base64 Data Encodings", url: "https://www.rfc-editor.org/rfc/rfc4648" },
      { label: "RFC 2397: The \"data\" URL scheme", url: "https://www.rfc-editor.org/rfc/rfc2397" },
      { label: "RFC 2045: MIME Part One (76-character lines)", url: "https://www.rfc-editor.org/rfc/rfc2045#section-6.8" },
    ],
    related: ["url-encoder-decoder", "hash-generator", "json-viewer", "ascii-to-unicode-converter", "uuid-generator"],
    links: [
      { href: "/url-encoder-decoder/", anchor: "URL encoder" },
      { href: "/hash-generator/", anchor: "hash generator" },
      { href: "/encryption-generator/", anchor: "encryption key generator" },
      { href: "/json-viewer/", anchor: "JSON viewer" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "UTF-8 text encoding and decoding, emoji included",
      "Standard and URL-safe alphabets, detected automatically when decoding",
      "Files up to 25 MB to Base64 or a data URI, with image preview",
      "Base64 back to a downloadable file with type detection",
      "Precise error messages for invalid input",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
    formats: { from: ["text", "image", "file", "base64"], to: ["base64", "data uri", "text", "file"] },
  },
  {
    id: "url-encoder-decoder",
    path: "/url-encoder-decoder/",
    name: "URL Encoder / Decoder",
    h1: "URL Encoder / Decoder",
    title: "URL Encoder / Decoder – Percent-Encode or Decode URLs",
    metaDescription:
      "Percent-encode text for URLs and query strings, or decode %-encoded URLs back to readable text. Choose encodeURIComponent or encodeURI and see URL parts.",
    summary:
      "Percent-encode text for URLs and query strings, decode %XX sequences back to readable text, or break a URL into its scheme, host, path and query parameters.",
    category: "development-tools",
    subgroup: "encode",
    card: "Percent-encode or decode URLs and break a URL into its parts.",
    archetype: "transform",
    widget: "code-ops",
    config: { op: "url" },
    aliases: [
      "url encoder",
      "url decoder",
      "url decode",
      "url encode",
      "percent encoding",
      "urlencode online",
      "urldecode online",
      "encodeuricomponent online",
      "query string encoder",
      "url parser",
      "decode url online",
      "url encoding %20",
    ],
    keywords: ["url", "percent-encoding", "query string", "uri", "decode"],
    processing: "browser",
    steps: [
      "Choose **Action**: **Encode**, **Decode** or **Break down URL**.",
      "For encoding and decoding, pick the **Mode**: **Component** for a single value such as a query parameter, **Full URL** to keep `/ ? & =` intact, or **Form data** to write spaces as `+`.",
      "Paste text into **Text or URL**; the result updates as you type. Tick **Each line separately** to process a list.",
      "If a decoded result still contains `%25` or `%20`, tick **Decode until nothing changes** to undo double encoding. Press **Copy** or **Use as input**.",
    ],
    example: {
      input: "café & croissants",
      output: "caf%C3%A9%20%26%20croissants",
      note: "Mode: Component. é is two UTF-8 bytes (C3 A9), the space is %20 and & is %26. Form data mode gives caf%C3%A9+%26+croissants.",
    },
    sections: [
      {
        heading: "Encode vs decode",
        body: "URLs may only contain a limited set of ASCII characters. Everything else is **percent-encoded** (RFC 3986): the character's UTF-8 bytes are written as `%` plus two hex digits. A space becomes `%20`, `é` becomes `%C3%A9`, and `€` becomes `%E2%82%AC`.\n\n**Encode** when you put text into a URL: a search term, a redirect target, a file name. **Decode** to read a URL you were given, such as a tracking link full of `%2F` and `%3D`. Decoding reports a broken sequence (like `%E9` on its own, which isn't valid UTF-8) with its position and leaves it as it is instead of failing.",
      },
      {
        heading: "encodeURIComponent vs encodeURI",
        body: "| Character | Component (`encodeURIComponent`) | Full URL (`encodeURI`) |\n|---|---|---|\n| space | `%20` | `%20` |\n| `/ ? # & = :` | encoded (`%2F %3F %23 %26 %3D %3A`) | kept |\n| `é` | `%C3%A9` | `%C3%A9` |\n| `A-Z a-z 0-9 - _ . ! ~ * ' ( )` | kept | kept |\n\nUse **Component** for one value going into a URL, because a `&` or `=` inside the value would otherwise split it: `?q=` + `fish & chips` must become `?q=fish%20%26%20chips`. Use **Full URL** when you have a whole address with spaces or accents and want to keep its structure. Encoding a full URL in Component mode gives `https%3A%2F%2F…`, which is only right when the URL itself is a parameter value.",
      },
      {
        heading: "Spaces: %20 or +",
        body: "In a URL path a space is always `%20`. In a query string, HTML forms submitted with `application/x-www-form-urlencoded` write spaces as `+`, and most servers decode `+` back to a space there. **Form data** mode does exactly that, in both directions: it encodes spaces as `+`, and when decoding it turns `+` into a space before decoding `%XX`.\n\nIn **Component** decoding a `+` stays a plus sign, which is correct for paths and for APIs that use `%20`. If decoded text shows `+` where words should be, switch to **Form data**.",
      },
      {
        heading: "Breaking a URL into parts",
        body: "**Break down URL** splits an address into scheme, host, port, path (and each path segment), query and fragment, and lists every query parameter with both its raw and decoded value. For `https://example.com/search?q=caf%C3%A9+au+lait&page=2#results` it shows `q` = `café au lait`, `page` = `2` and the fragment `results`. Passwords in URLs are hidden. This makes long marketing links readable and shows exactly which parameters a page receives. To check where a link finally lands, use the [redirect checker](/redirect-checker/).",
      },
      {
        heading: "Double-encoding problems",
        body: "Encoding something that is already encoded turns `%` into `%25`: a space becomes `%20`, then `%2520`, then `%252520`. It happens when two layers of code each encode a value (a CMS and a plugin, or a redirect inside a tracking link). Symptoms are URLs containing `%25` and pages showing `%20` instead of spaces. Tick **Decode until nothing changes** to peel off every layer; the footer says how many rounds it took. Then fix the code so the value is encoded exactly once, at the point where it is put into the URL.",
      },
    ],
    faq: [
      {
        q: "Why is a space %20 in some URLs and + in others?",
        a: "`%20` is the general percent-encoding for a space. `+` is a shortcut used only in query strings from HTML forms (`application/x-www-form-urlencoded`).",
      },
      {
        q: "Which characters need encoding?",
        a: "Everything except letters, digits and `- _ . ~` should be encoded inside a value. Reserved characters such as `/ ? # & =` may appear unencoded only where they play their structural role in the URL.",
      },
      {
        q: "How do I fix a double-encoded URL?",
        a: "Decode with **Decode until nothing changes** ticked to get the original text, then encode it once in the right mode.",
      },
    ],
    sources: [
      { label: "RFC 3986: Uniform Resource Identifier (URI): Generic Syntax", url: "https://www.rfc-editor.org/rfc/rfc3986" },
      { label: "WHATWG URL Standard: application/x-www-form-urlencoded", url: "https://url.spec.whatwg.org/#application/x-www-form-urlencoded" },
      { label: "MDN: encodeURIComponent()", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent" },
    ],
    related: ["base64-encoder-decoder", "url-slug-generator", "ascii-to-unicode-converter", "htaccess-redirect-generator"],
    links: [
      { href: "/base64-encoder-decoder/", anchor: "Base64 encoder" },
      { href: "/url-slug-generator/", anchor: "URL slug generator" },
      { href: "/redirect-checker/", anchor: "redirect checker" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "encodeURIComponent, encodeURI and form (+) encoding",
      "UTF-8 safe decoding with the position of broken sequences",
      "Repeated decoding for double-encoded URLs",
      "URL breakdown with every query parameter decoded",
      "Line-by-line mode for lists",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  {
    id: "ascii-to-unicode-converter",
    path: "/ascii-to-unicode-converter/",
    name: "ASCII to Unicode Converter",
    h1: "ASCII to Unicode Converter",
    title: "Unicode Converter – Text to Code Points, Escapes, Entities",
    metaDescription:
      "Convert text to Unicode code points (U+0041), decimal or hex codes, JavaScript \\u escapes and HTML entities, and convert them back to readable text.",
    summary:
      "Convert text to Unicode code points, decimal or hex codes, UTF-8 bytes, JavaScript, Python or CSS escapes and HTML entities, or turn any of those codes back into readable text.",
    category: "development-tools",
    subgroup: "encode",
    card: "Convert text to Unicode code points, escapes and HTML entities.",
    archetype: "transform",
    widget: "code-ops",
    config: { op: "unicode" },
    aliases: [
      "unicode converter",
      "text to unicode",
      "unicode to text",
      "unicode escape converter",
      "html entity converter",
      "code point converter",
      "unicode lookup",
      "emoji to unicode",
      "javascript unicode escape",
      "ascii to unicode",
      "unicode decoder",
    ],
    keywords: ["unicode", "code point", "escape", "entity", "utf-8", "emoji"],
    processing: "browser",
    limits: ["The character map lists the first 500 characters."],
    steps: [
      "Set **Direction**: **Text → codes**, **Codes → text** or **Character map**.",
      "For Text → codes, choose the **Format** (code points, decimal, hex, UTF-8 bytes, JavaScript, Python, CSS or HTML) and a **Separator** for lists.",
      "Type or paste into **Text or codes**. Tick **Leave ASCII characters as they are** to escape only accented letters, symbols and emoji.",
      "For Codes → text, paste the codes in any of those formats; the footer says which format was read. Press **Copy** or **Use as input**.",
    ],
    example: {
      input: "Café 👍",
      output: "U+0043 U+0061 U+0066 U+00E9 U+0020 U+1F44D",
      note: "Format: code points. In JavaScript \\u escapes the emoji becomes the surrogate pair \\uD83D\\uDC4D; as UTF-8 bytes it is F0 9F 91 8D.",
    },
    sections: [
      {
        heading: "ASCII vs Unicode",
        body: "**ASCII** (1963) defines 128 characters, numbered 0 to 127: English letters, digits, punctuation and control codes. **Unicode** gives a number to every character in every writing system, plus symbols and emoji: over 150,000 characters, with room for 1,114,112. The first 128 Unicode code points are identical to ASCII, so `A` is 65 in both.\n\nSo \"ASCII to Unicode\" really means writing characters as their Unicode numbers or escapes. ASCII text converts one-to-one; anything beyond ASCII (é, €, 中, 👍) needs a code point above 127.",
      },
      {
        heading: "Code points and U+ notation",
        body: "A **code point** is a character's Unicode number, written `U+` and at least four hex digits: `U+0041` is A, `U+00E9` is é, `U+20AC` is €, `U+1F44D` is 👍. Choose **Decimal** for the same numbers in base 10 (`233` for é), or **Hex** for `0xE9` style.\n\n**UTF-8 bytes** shows how the character is stored in a file: one byte for ASCII, two for é (`C3 A9`), three for € (`E2 82 AC`), four for emoji. The **Character map** lists every character of your text with its code point, decimal value, UTF-8 and UTF-16 units, HTML entity and JavaScript escape side by side.",
      },
      {
        heading: "JavaScript, CSS and HTML escapes",
        body: "| Format | é | 👍 |\n|---|---|---|\n| JavaScript `\\u` | `\\u00E9` | `\\uD83D\\uDC4D` (two UTF-16 units) |\n| JavaScript `\\u{…}` (ES2015+) | `\\u00E9` | `\\u{1F44D}` |\n| Python | `\\xe9` | `\\U0001F44D` |\n| CSS | `\\E9 ` | `\\1F44D ` |\n| HTML decimal | `&#233;` | `&#128077;` |\n| HTML hex | `&#xE9;` | `&#x1F44D;` |\n| HTML named | `&eacute;` | `&#x1F44D;` (no name exists) |\n\nThe CSS escape ends with a space so the next character isn't read as part of the hex number. In HTML-entity formats, `<`, `>`, `&` and `\"` are always escaped, even with **Leave ASCII characters as they are** ticked, so the output is safe to paste into markup.",
      },
      {
        heading: "Converting codes back to text",
        body: "**Codes → text** recognizes all the formats above, so you can paste whatever you have: `U+0048 U+0069`, `\\u0048\\u0069`, `&#72;&#105;`, `&eacute;`, `0x48 0x69`, or a list of decimal numbers such as `72 105`. Escapes can be mixed with normal text (`Caf\\u00e9` → Café). A list of two-digit hex pairs such as `C3 A9` is read as UTF-8 bytes. Lists of plain numbers are read as decimal, so write hex values with `0x` or `U+`.",
      },
      {
        heading: "Character map",
        body: "The character map is the quickest way to find out what a strange character really is: a non-breaking space (`U+00A0`) that breaks a search, a zero-width space (`U+200B`) hidden in a copied URL, or a curly apostrophe (`U+2019`) where code needs a straight one (`U+0027`). Spaces, tabs and line feeds are labelled by name. For removing accents from text, use [remove accents](/remove-letter-accents/); for the bits behind each byte, the [text to binary](/text-to-binary/) converter shows them.",
      },
    ],
    faq: [
      {
        q: "What's the difference between ASCII and Unicode?",
        a: "ASCII covers 128 characters; Unicode covers all scripts, symbols and emoji. The first 128 Unicode code points are the ASCII characters, with the same numbers.",
      },
      {
        q: "How do I write an emoji as an escape sequence?",
        a: "In modern JavaScript use `\\u{1F44D}`; older code needs the surrogate pair `\\uD83D\\uDC4D`. In HTML use `&#x1F44D;`, in CSS `\\1F44D`, in Python `\\U0001F44D`.",
      },
      {
        q: "What is UTF-8?",
        a: "The most common way to store Unicode as bytes: ASCII characters take one byte and others take two to four. Choose **UTF-8 bytes** to see the bytes for your text.",
      },
    ],
    sources: [
      { label: "The Unicode Standard, Chapter 3: Conformance", url: "https://www.unicode.org/versions/latest/core-spec/chapter-3/" },
      { label: "RFC 3629: UTF-8, a transformation format of ISO 10646", url: "https://www.rfc-editor.org/rfc/rfc3629" },
      { label: "HTML Living Standard: named character references", url: "https://html.spec.whatwg.org/multipage/named-characters.html" },
    ],
    related: ["ascii-to-binary-converter", "text-to-binary", "remove-letter-accents", "url-encoder-decoder", "base64-encoder-decoder"],
    links: [
      { href: "/ascii-to-binary-converter/", anchor: "ASCII to binary" },
      { href: "/text-to-binary/", anchor: "text to binary" },
      { href: "/remove-letter-accents/", anchor: "remove accents" },
      { href: "/url-encoder-decoder/", anchor: "URL encoder" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Code points, decimal, hex and UTF-8 byte output",
      "JavaScript, Python and CSS escapes",
      "HTML decimal, hex and named entities",
      "Converts any of these formats back to text, mixed with normal text",
      "Character map with UTF-8 and UTF-16 for each character",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 3,
    formats: { from: ["text", "ascii", "unicode"], to: ["unicode", "html entities", "text"] },
  },

  /* ---------------- Time, IDs and hashes ---------------- */
  {
    id: "unix-timestamp-converter",
    path: "/unix-timestamp-converter/",
    name: "Unix Timestamp Converter",
    h1: "Unix Timestamp Converter",
    title: "Unix Timestamp Converter – Epoch to Date and Back",
    metaDescription:
      "Convert Unix epoch timestamps (seconds, milliseconds or microseconds) to readable dates in any time zone, and dates back to timestamps. Live clock.",
    summary:
      "Convert a Unix timestamp to a date in UTC and any time zone, or a date and time back to a timestamp. Seconds, milliseconds, microseconds and nanoseconds are detected from the number of digits.",
    category: "development-tools",
    subgroup: "ids",
    card: "Convert Unix timestamps to dates in any time zone, and back.",
    archetype: "calculator",
    widget: "unix-time",
    aliases: [
      "epoch converter",
      "timestamp to date",
      "date to timestamp",
      "epoch time converter",
      "current unix timestamp",
      "unix time now",
      "epoch to date",
      "milliseconds to date",
      "convert timestamp unix",
      "unix timestamp to date",
      "posix time converter",
      "unix time stamp",
    ],
    keywords: ["epoch", "unix time", "timestamp", "time zone", "milliseconds"],
    processing: "browser",
    steps: [
      "The **Current Unix time** panel shows the live time in seconds and milliseconds; press **Copy seconds** or **Pause clock**.",
      "Choose your **Time zone** (it starts with the one your browser reports).",
      "Under **Timestamp → date**, type a timestamp or press **Now**. **Unit** detects seconds, ms, µs or ns from the digit count; pick one to override. Copy any line of the result.",
      "Under **Date → timestamp**, pick a **Date** and **Time** (or press **Use current date and time**) to get seconds and milliseconds for that moment in the chosen zone.",
      "Use **Time between two timestamps** for durations, and **Batch convert** for a list, one value per line.",
    ],
    example: {
      input: "1700000000",
      output: "UTC: 2023-11-14T22:13:20Z\nAsia/Kolkata: 2023-11-15T03:43:20+05:30\nAmerica/New_York: 2023-11-14T17:13:20-05:00",
      note: "10 digits, so read as seconds. 1700000000000 (13 digits) is read as milliseconds and gives the same moment.",
    },
    sections: [
      {
        heading: "Current Unix time",
        body: "Unix time counts the seconds since **1 January 1970, 00:00:00 UTC** (the \"epoch\"), ignoring leap seconds. It is the same number everywhere on Earth at a given moment, which is why databases, APIs and log files use it: there is no time zone or daylight saving to get wrong. The live clock shows it from your device's clock, so if your computer's time is off, so is the clock. 1,700,000,000 was reached on 14 November 2023 at 22:13:20 UTC; 2,000,000,000 arrives on 18 May 2033.",
      },
      {
        heading: "Timestamp to date",
        body: "Paste any timestamp and you get it in UTC as ISO 8601, in your chosen zone with its offset, as readable text, as an HTTP date (RFC 7231, used in `Last-Modified` headers), and relative to now (\"2 years ago\"). Negative timestamps are dates before 1970: `-86400` is 31 December 1969.\n\nUnderscores, commas and spaces are ignored, so `1_700_000_000` works. Fractions such as `1700000000.5` are accepted and kept to the millisecond.",
      },
      {
        heading: "Date to timestamp",
        body: "Pick a date and a time on the 24-hour clock. It is read as wall-clock time in the selected zone, so 09:00 in Asia/Kolkata and 09:00 in Europe/London give different timestamps. The panel shows the zone's UTC offset on that date.\n\nDaylight-saving changes are handled the way most libraries do: a time that doesn't exist (clocks jump from 02:00 to 03:00) moves forward to the next valid time, and a time that happens twice when clocks go back uses the first occurrence. A note appears in both cases.",
      },
      {
        heading: "Seconds, milliseconds and microseconds",
        body: "| Digits (today) | Unit | Typical source |\n|---|---|---|\n| 10 | seconds | Unix/Linux `date +%s`, PHP `time()`, most APIs, JWT `exp` |\n| 13 | milliseconds | JavaScript `Date.now()`, Java `System.currentTimeMillis()` |\n| 16 | microseconds | Python `time.time_ns() // 1000`, PostgreSQL internals |\n| 19 | nanoseconds | Go `UnixNano()`, Python `time.time_ns()` |\n\nThe detector uses these digit counts, which hold for dates between 1973 and 5138. If a timestamp shows a date in 1970 or the year 55,000, it was read with the wrong unit: choose the unit yourself.",
      },
      {
        heading: "Time zones and daylight saving",
        body: "The zone list is the IANA time zone database built into your browser (`Asia/Kolkata`, `America/New_York`, `Europe/London`), which includes every historical daylight-saving rule. Prefer these names to abbreviations: \"IST\" means India, Ireland or Israel depending on who you ask, and \"EST\" doesn't change in summer while New York does.\n\nIn **Batch convert**, dates without an offset, such as `2026-10-05 12:00`, are read in your browser's own time zone. Add `Z` or an offset (`2026-10-05T12:00:00+05:30`) to be exact.",
      },
      {
        heading: "Code snippets",
        body: "| Language | Current timestamp | Timestamp → date |\n|---|---|---|\n| JavaScript | `Math.floor(Date.now() / 1000)` | `new Date(1700000000 * 1000).toISOString()` |\n| Python | `int(time.time())` | `datetime.fromtimestamp(1700000000, tz=timezone.utc)` |\n| PHP | `time()` | `date('c', 1700000000)` |\n| MySQL | `UNIX_TIMESTAMP()` | `FROM_UNIXTIME(1700000000)` |\n| PostgreSQL | `extract(epoch from now())` | `to_timestamp(1700000000)` |\n| Bash (GNU) | `date +%s` | `date -u -d @1700000000` |\n\nJavaScript works in milliseconds, hence the `* 1000` and `/ 1000`. Forgetting them is the most common timestamp bug.",
      },
    ],
    faq: [
      {
        q: "What is a Unix timestamp?",
        a: "The number of seconds since 1 January 1970 00:00:00 UTC, not counting leap seconds. It identifies a moment independently of time zones.",
      },
      {
        q: "How do I tell if a timestamp is in milliseconds?",
        a: "Count the digits: for current dates, 10 digits are seconds and 13 are milliseconds. The converter detects this automatically and shows how it read the number.",
      },
      {
        q: "What happens in 2038?",
        a: "Systems that store Unix time as a signed 32-bit integer overflow after 2147483647, which is 19 January 2038 at 03:14:07 UTC, and jump back to 1901. 64-bit timestamps, used by modern systems and this tool, last for billions of years.",
      },
    ],
    sources: [
      { label: "The Open Group: Seconds Since the Epoch (POSIX)", url: "https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap04.html#tag_04_19" },
      { label: "RFC 3339: Date and Time on the Internet: Timestamps", url: "https://www.rfc-editor.org/rfc/rfc3339" },
      { label: "IANA Time Zone Database", url: "https://www.iana.org/time-zones" },
    ],
    related: ["uuid-generator", "json-viewer", "hours-calculator", "hash-generator"],
    links: [
      { href: "/json-viewer/", anchor: "JSON viewer" },
      { href: "/uuid-generator/", anchor: "UUID generator" },
      { href: "/hours-calculator/", anchor: "hours between two times" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Live Unix clock in seconds and milliseconds",
      "Detects seconds, milliseconds, microseconds and nanoseconds",
      "Every IANA time zone, with daylight saving handled",
      "Date to timestamp, time difference and batch conversion",
      "ISO 8601, HTTP date and relative-time output",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  {
    id: "uuid-generator",
    path: "/uuid-generator/",
    name: "UUID Generator",
    h1: "UUID Generator",
    title: "UUID Generator – Version 4 and 7 UUIDs/GUIDs in Bulk",
    metaDescription:
      "Generate v4 (random) or v7 (time-ordered) UUIDs one at a time or in bulk, uppercase or without hyphens, using your browser's secure random source.",
    summary:
      "Generate random version 4 or time-ordered version 7 UUIDs, one or up to 10,000 at a time, in the format your code expects. A built-in checker validates any UUID and shows its version.",
    category: "development-tools",
    subgroup: "ids",
    card: "Generate v4 or v7 UUIDs (GUIDs), one at a time or in bulk.",
    archetype: "generator",
    widget: "uuid",
    aliases: [
      "guid generator",
      "uuid v4 generator",
      "uuid v7 generator",
      "random uuid",
      "generate uuid",
      "bulk uuid generator",
      "uuid validator",
      "online guid",
      "unique id generator",
      "uuid without hyphens",
      "uiid generator",
    ],
    keywords: ["uuid", "guid", "unique id", "rfc 9562", "random"],
    processing: "browser",
    steps: [
      "Choose **Version**: **v4 (random)** or **v7 (time-ordered)**. One UUID is ready when the page loads.",
      "Set **How many** (up to 10,000) and the format: **Upper case**, **Hyphens**, **{Braces}**, **Quotes** and **Separate with**.",
      "Press **Generate**, then **Copy all** or **Download** the list as a text file.",
      "To check an existing ID, paste it into **Validate or inspect a UUID** to see its version, variant and, for v1, v6 and v7, when it was created.",
    ],
    example: {
      input: "01920f2c-6e4b-7c3a-9f12-3b4c5d6e7f80 (pasted into Validate or inspect a UUID)",
      output: "Valid UUID format\nVersion: 7 (Unix time + random)\nVariant: RFC 9562 / RFC 4122\nCreated: 2024-09-20T11:23:43.051Z",
      note: "The first 12 hex digits (01920f2c6e4b) are the creation time in milliseconds since 1970; the 7 after the second hyphen is the version.",
    },
    sections: [
      {
        heading: "UUID v4 vs v7 (and v1)",
        body: "A UUID is a 128-bit identifier written as 32 hex digits in the pattern 8-4-4-4-12. The first digit of the third group is the version.\n\n- **v4** is 122 random bits. It reveals nothing about when or where it was made. This page uses `crypto.randomUUID()`, your browser's cryptographically secure generator.\n- **v7** (RFC 9562, 2024) starts with a 48-bit Unix timestamp in milliseconds, followed by random bits. New IDs sort after older ones, which keeps database indexes compact. Here, IDs generated in the same millisecond also use a 12-bit counter so they stay in order.\n- **v1** combines a timestamp with the machine's network card address, which leaks hardware identity. RFC 9562 recommends v7 instead, so it isn't offered.",
      },
      {
        heading: "UUID vs GUID",
        body: "GUID (globally unique identifier) is Microsoft's name for the same thing. Windows, .NET and SQL Server (`uniqueidentifier`) generate standard UUIDs, usually version 4. The differences are presentation: Microsoft tools often show GUIDs in upper case and wrapped in braces, `{6F9619FF-8B86-D011-B42D-00C04FC964FF}`. Tick **Upper case** and **{Braces}** to get that format. One real difference: .NET's `Guid.ToByteArray()` stores the first three groups in little-endian order, so the same GUID has a different byte order in a binary column than in a string.",
      },
      {
        heading: "Bulk generation and formats",
        body: "Generate up to 10,000 IDs at once, for seeding a test database or a spreadsheet. **Separate with** puts them on new lines, or separates them with commas or spaces; with **Quotes** set to double quotes and commas, the output pastes straight into a JSON array or a SQL `IN (…)` list. **Hyphens** off gives the 32-character form that some systems store, and **Upper case** matches Microsoft conventions. Formatting doesn't change the value: `F47AC10B58CC4372A5670E02B2C3D479` and `f47ac10b-58cc-4372-a567-0e02b2c3d479` are the same UUID.",
      },
      {
        heading: "Validating a UUID",
        body: "Paste any value into **Validate or inspect a UUID**. It accepts upper or lower case, with or without hyphens, braces, quotes or a `urn:uuid:` prefix, and shows the canonical lower-case form. It checks the **version** digit (1–8) and the **variant** bits (the first digit of the fourth group should be 8, 9, a or b). For v1, v6 and v7 it decodes the creation time. The nil UUID (all zeros) and the max UUID (all `f`) are recognized as the special values RFC 9562 defines.",
      },
      {
        heading: "Collision odds",
        body: "With 122 random bits there are 5.3 × 10^36 possible v4 UUIDs. By the birthday bound you would need to generate about 103 trillion (1.03 × 10^14) of them for a one-in-a-billion chance that any two match, and about 2.7 × 10^18 for even odds. In practice, collisions come from broken random generators, not from the maths, which is why this page uses the browser's cryptographic source. v7 trades some randomness for the timestamp: 62 random bits per millisecond here, still far more than any single system generates in that time.",
      },
    ],
    faq: [
      {
        q: "Can two UUIDs be the same?",
        a: "In theory yes, in practice no: you would need about 103 trillion v4 UUIDs for a one-in-a-billion chance of a single duplicate, provided they come from a proper random source like this one.",
      },
      {
        q: "Which UUID version should I use for database keys?",
        a: "v7. Its time-ordered prefix means new rows are appended at the end of the index instead of scattered randomly, which keeps inserts fast. Use v4 when the ID mustn't reveal its creation time.",
      },
      {
        q: "Is a GUID the same as a UUID?",
        a: "Yes. GUID is Microsoft's name for a UUID; the format and generation are the same, though GUIDs are often shown in upper case with braces.",
      },
    ],
    sources: [
      { label: "RFC 9562: Universally Unique IDentifiers (UUIDs)", url: "https://www.rfc-editor.org/rfc/rfc9562" },
      { label: "MDN: Crypto.randomUUID()", url: "https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID" },
    ],
    related: ["random-string-generator", "hash-generator", "unix-timestamp-converter", "base64-encoder-decoder"],
    links: [
      { href: "/random-string-generator/", anchor: "random string generator" },
      { href: "/hash-generator/", anchor: "hash generator" },
      { href: "/password-generator/", anchor: "password generator" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Version 4 (random) and version 7 (time-ordered) UUIDs per RFC 9562",
      "Up to 10,000 at once with copy and download",
      "Upper case, no hyphens, braces and quotes formats",
      "Validator that shows version, variant and creation time",
      "Uses the browser's cryptographically secure random source",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },
  {
    id: "hash-generator",
    path: "/hash-generator/",
    name: "Hash Generator",
    h1: "Hash Generator",
    title: "Hash Generator – MD5, SHA-1, SHA-256 and SHA-512",
    metaDescription:
      "Create MD5, SHA-1, SHA-256 and SHA-512 hashes of text or files in your browser, and compare against a known checksum to verify a download.",
    summary:
      "Calculate MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hashes of text or a file, optionally as an HMAC with a secret key, and check a download against its published checksum.",
    category: "development-tools",
    subgroup: "ids",
    card: "Create MD5 and SHA hashes of text or files and verify checksums.",
    archetype: "generator",
    widget: "hash",
    aliases: [
      "md5 hash generator",
      "sha256 generator",
      "sha1 hash",
      "sha512 hash",
      "file checksum calculator",
      "checksum verifier",
      "md5 checksum",
      "sha256 checksum",
      "hmac generator",
      "hash calculator",
      "md5 generator",
      "sha 256 online",
    ],
    keywords: ["hash", "md5", "sha-256", "checksum", "hmac", "integrity"],
    processing: "browser",
    limits: ["Files up to 512 MB. SHA hashes need the whole file in memory, so very large files may fail on phones."],
    steps: [
      "Choose **Hash: Text** or **File**, and tick the **Algorithms** you need (MD5, SHA-1, SHA-256 and SHA-512 are on by default).",
      "Type or paste text into **Text to hash**, or choose a file. Text hashes update as you type; file hashes show a progress bar.",
      "Pick an **Output** format (lower-case hex, upper-case HEX or Base64) and press **Copy** next to the hash you need.",
      "To verify a download, paste the published checksum into **Compare with a checksum**. A matching row is highlighted and the panel says **Match** or **No match**.",
    ],
    example: {
      input: "hello world",
      output:
        "MD5      5eb63bbbe01eeed093cb22bb8f5acdc3\nSHA-1    2aae6c35c94fcfb415dbe95f408b9ce91ee846ed\nSHA-256  b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
      note: "11 bytes of UTF-8. Adding a line break at the end (as many editors do) gives completely different hashes.",
    },
    sections: [
      {
        heading: "Choosing an algorithm",
        body: "| Algorithm | Length | Status | Use it for |\n|---|---|---|---|\n| MD5 | 128 bits, 32 hex | broken (collisions in seconds) | matching old checksums, cache keys |\n| SHA-1 | 160 bits, 40 hex | broken for signatures (2017) | Git object IDs, legacy systems |\n| SHA-256 | 256 bits, 64 hex | secure | file checksums, signatures, APIs |\n| SHA-384 | 384 bits, 96 hex | secure | TLS, Subresource Integrity |\n| SHA-512 | 512 bits, 128 hex | secure | as SHA-256; faster on 64-bit CPUs |\n\nSHA-1 and the SHA-2 family (SHA-256/384/512) are defined in FIPS 180-4 and computed with your browser's Web Crypto API. MD5 isn't in Web Crypto, so this page uses its own RFC 1321 implementation, labelled *not for security*. When you have a choice, use SHA-256.",
      },
      {
        heading: "Hashing files and verifying checksums",
        body: "Software downloads often publish a checksum next to the file, such as `SHA256: 9f86d0…`. After downloading, choose the file here and paste the published value into **Compare with a checksum**. If the hashes are identical, the file is byte-for-byte what was published; if not, it was corrupted or replaced.\n\nThe file is read on your device and never uploaded, so this works for private documents too. The comparison ignores case, spaces and colons, accepts Base64, and works out the algorithm from the checksum's length. On the command line the same check is `sha256sum file` (Linux), `shasum -a 256 file` (macOS) or `Get-FileHash file` (PowerShell).",
      },
      {
        heading: "Hashing vs encryption vs encoding",
        body: "- A **hash** is a fixed-length fingerprint. The same input always gives the same hash, any change gives a completely different one, and there is no way back from the hash to the input.\n- **Encryption** is reversible with a key: it hides data so only the key holder can read it.\n- **Encoding** such as [Base64](/base64-encoder-decoder/) is reversible by anyone; it only changes the representation.\n\n**HMAC** (RFC 2104) mixes a secret key into the hash. GitHub and Shopify, for example, sign webhook payloads with HMAC-SHA256 of the raw request body: compute the HMAC of the exact body with your signing secret and compare it with the signature header. (Stripe signs the timestamp, a dot and the body, so prepend those first.) Tick **HMAC (keyed hash)** to do that here.",
      },
      {
        heading: "Why MD5 and SHA-1 aren't safe for passwords",
        body: "MD5, SHA-1 and SHA-256 are all designed to be fast: a single graphics card computes billions of them per second. That is good for checksums and fatal for passwords, because an attacker who steals a table of hashed passwords can try every common password in minutes. Unsalted MD5 hashes of common passwords can simply be looked up online.\n\nStore passwords with a deliberately slow, salted algorithm made for the purpose: **Argon2id**, **scrypt** or **bcrypt**, as OWASP recommends. MD5 and SHA-1 also have practical collision attacks (two different inputs with the same hash), so don't use them for signatures or certificates either.",
      },
    ],
    faq: [
      {
        q: "Can a hash be reversed?",
        a: "No. A hash keeps no copy of the input. Short or common inputs can still be guessed by hashing candidates and comparing, which is why fast hashes are unsafe for passwords.",
      },
      {
        q: "Which hash should I use?",
        a: "SHA-256 for checksums, signatures and HMAC. MD5 and SHA-1 only when another system requires them.",
      },
      {
        q: "Why do I get a different hash for the same text?",
        a: "Something in the bytes differs: a trailing line break, Windows (CRLF) vs Unix (LF) line endings, a non-breaking space, or a different text encoding. Try **Line endings: Ignore trailing line breaks** or **Convert CRLF to LF**.",
      },
    ],
    sources: [
      { label: "NIST FIPS 180-4: Secure Hash Standard (SHA-1, SHA-2)", url: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final" },
      { label: "RFC 1321: The MD5 Message-Digest Algorithm", url: "https://www.rfc-editor.org/rfc/rfc1321" },
      { label: "RFC 2104: HMAC: Keyed-Hashing for Message Authentication", url: "https://www.rfc-editor.org/rfc/rfc2104" },
      { label: "OWASP Password Storage Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html" },
    ],
    related: ["base64-encoder-decoder", "uuid-generator", "random-string-generator", "url-encoder-decoder"],
    links: [
      { href: "/encryption-generator/", anchor: "encryption key generator" },
      { href: "/base64-encoder-decoder/", anchor: "Base64 encoder" },
      { href: "/uuid-generator/", anchor: "UUID generator" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "MD5, SHA-1, SHA-256, SHA-384 and SHA-512 at once",
      "Text and files up to 512 MB, hashed on your device",
      "HMAC with a secret key for webhook signatures",
      "Checksum comparison that detects the algorithm from its length",
      "Hex, upper-case hex or Base64 output",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
    isNew: true,
  },

  /* ---------------- HTML tools ---------------- */
  {
    id: "html-viewer",
    path: "/html-viewer/",
    name: "HTML Viewer",
    h1: "HTML Viewer",
    title: "HTML Viewer – Write and Preview HTML Live",
    metaDescription:
      "Paste or write HTML and see it render instantly in a sandboxed preview. Open .html files, switch auto-preview on or off, and download your code.",
    summary:
      "Write or paste HTML and see it rendered next to the code as you type. The preview runs in a sandbox, JavaScript only runs if you allow it, and you can check phone and tablet widths.",
    category: "development-tools",
    subgroup: "html",
    card: "Write or paste HTML and see a live, sandboxed preview.",
    archetype: "transform",
    widget: "html-viewer",
    config: { mode: "viewer" },
    aliases: [
      "html previewer",
      "online html editor",
      "html code viewer",
      "render html online",
      "html preview",
      "live html editor",
      "open html file online",
      "html runner",
      "view html code",
      "html veiwer",
    ],
    keywords: ["html", "preview", "render", "editor", "sandbox"],
    processing: "browser",
    limits: [
      "Relative links to your own images, stylesheets and scripts don't resolve; use absolute https:// URLs or inline them.",
      "There is no share link. Download the file to keep or send your code.",
    ],
    steps: [
      "Type or paste markup into the **HTML** box, press **Open .html** to load a file, or press **Example**.",
      "With **Auto-preview** ticked the **Preview** updates as you type. Untick it for large pages and press **Run** (or Ctrl + Enter) when you want to refresh.",
      "Tick **Run JavaScript** only if you need scripts to run, and choose a **Preview width**: **Full**, **Tablet 768** or **Phone 375**.",
      "Press **Copy** or **Download** under the editor to save your code as `page.html`.",
    ],
    sections: [
      {
        heading: "Live preview and sandboxing",
        body: "The preview is an `<iframe>` built from your code (`srcdoc`) with the `sandbox` attribute, and without `allow-same-origin`. That gives it a unique, empty origin: it can't read this site's cookies or storage, can't reach the page around it, and can't navigate the browser window. Forms, pop-ups and downloads are blocked.\n\nScripts are blocked too unless you tick **Run JavaScript**, which adds `allow-scripts` and nothing else. Code you paste from an unknown source is therefore safe to look at; only allow scripts for code you trust or want to test.",
      },
      {
        heading: "Opening and saving .html files",
        body: "**Open .html** reads a `.html` or `.htm` file from your device into the editor; nothing is uploaded. **Download** saves the editor content as `page.html`, which opens in any browser. Your code also stays in this tab's session storage, so reloading the page doesn't lose it; it is cleared when you close the tab.\n\nThe preview has no address, so relative URLs such as `images/logo.png` or `style.css` have nothing to resolve against. Use full `https://` URLs, put the CSS in a `<style>` block, or add `<base href=\"https://your-site.com/\">` to the `<head>`.",
      },
      {
        heading: "Using CSS and JavaScript",
        body: "Write CSS in a `<style>` block or `style` attributes, and scripts in `<script>` blocks; both apply exactly as in a normal page. External stylesheets and fonts (Google Fonts, CDN libraries) load over the network like on any page. With **Run JavaScript** on, `console.log` output goes to your browser's developer console (F12), and `alert()` is suppressed by the sandbox.\n\n**Preview width** sets the frame to 768 px or 375 px so media queries for tablets and phones apply. The frame is narrower, not a real device, so touch behavior and device fonts can still differ.",
      },
      {
        heading: "Viewer vs formatter",
        body: "This page shows what the code **looks like when rendered**. The [HTML formatter](/html-formatter/) changes how the code **itself is laid out**: indentation and line breaks, without rendering it. A common workflow is to format minified markup first so you can find what to change, then edit and check it here. To create HTML rather than edit it, use [Word to HTML](/word-to-html-converter/) for documents and [text to HTML](/text-to-html-converter/) for plain text; [placeholder text](/lorem-ipsum-generator/) fills a layout before the real copy exists.",
      },
    ],
    faq: [
      {
        q: "Is JavaScript run in the preview?",
        a: "Only if you tick **Run JavaScript**. Even then it runs in a sandboxed frame with its own empty origin, so it can't access this site, your cookies or your storage.",
      },
      {
        q: "Can I preview an HTML email?",
        a: "Yes, as a browser renders it. Email clients, Outlook especially, ignore a lot of modern CSS, so treat the preview as a first check and send a test email before a campaign.",
      },
      {
        q: "Can I share my code?",
        a: "Not with a link; nothing is stored on our server. Press **Download** and send the `page.html` file, or copy the code.",
      },
    ],
    sources: [
      { label: "HTML Living Standard: the iframe sandbox attribute", url: "https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox" },
      { label: "MDN: <iframe> srcdoc and sandbox", url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe" },
    ],
    related: ["html-formatter", "word-to-html-converter", "text-to-html-converter", "html-minifier", "lorem-ipsum-generator"],
    links: [
      { href: "/html-formatter/", anchor: "format the code" },
      { href: "/lorem-ipsum-generator/", anchor: "placeholder text" },
      { href: "/word-to-html-converter/", anchor: "Word to HTML" },
      { href: "/text-to-html-converter/", anchor: "text to HTML" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Live preview as you type, or on demand",
      "Sandboxed preview with JavaScript off by default",
      "Phone (375 px) and tablet (768 px) preview widths",
      "Open .html files and download your code",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },
  {
    id: "word-to-html-converter",
    path: "/word-to-html-converter/",
    name: "Word to HTML Converter",
    h1: "Word to HTML Converter",
    title: "Word to HTML Converter – Clean HTML From Word or Docs",
    metaDescription:
      "Paste content from Word or Google Docs and get clean HTML with headings, lists and links kept and Word's inline styles and junk markup removed.",
    summary:
      "Paste formatted text from Word, Google Docs or a web page, or open a .docx file, and get clean HTML: headings, lists, tables, links, bold and italic kept, fonts, colors and Office markup removed.",
    category: "development-tools",
    subgroup: "html",
    card: "Turn Word or Google Docs content into clean, simple HTML.",
    archetype: "transform",
    widget: "html-viewer",
    config: { mode: "word-to-html" },
    aliases: [
      "word to html",
      "docx to html",
      "convert word document to html",
      "rich text to html",
      "google docs to html",
      "paste from word",
      "clean word html",
      "doc to html converter",
      "word html cleaner",
      "word to html convertor",
    ],
    keywords: ["word", "docx", "google docs", "html", "clean", "cms"],
    processing: "browser",
    limits: [
      "Only .docx files can be opened; save older .doc files as .docx first.",
      "Images pasted from Word point to files on your computer and are left out; open the .docx to keep images.",
    ],
    steps: [
      "Under **Source**, keep **Paste formatted text**, click the dashed box and press Ctrl + V (⌘V on a Mac). Or choose **Open a .docx file** and pick the document.",
      "Choose what to keep: **Keep tables**, **Keep images** (embedded as data URIs) and **Replace &nbsp; with spaces**.",
      "Check the result under **Clean HTML**; switch **Show** to **Preview** to see it rendered. The footer shows how much markup was removed.",
      "Press **Copy** and paste into your CMS's HTML or code view, or **Download** `document.html`.",
    ],
    example: {
      input:
        '<h1 style="mso-margin-top-alt:auto"><span style="font-family:Calibri">Quarterly report</span></h1>\n<p class="MsoNormal"><span style="font-size:11.0pt;font-family:Calibri">Sales rose <b>12%</b> in <i>Q3</i>.<o:p></o:p></span></p>\n<p class="MsoListParagraphCxSpFirst" style="mso-list:l0 level1 lfo1"><![if !supportLists]><span style="mso-list:Ignore">·<span>&nbsp;&nbsp;</span></span><![endif]>New stores</p>\n<p class="MsoListParagraphCxSpLast" style="mso-list:l0 level1 lfo1"><![if !supportLists]><span style="mso-list:Ignore">·<span>&nbsp;&nbsp;</span></span><![endif]>Online growth</p>',
      output: "<h1>Quarterly report</h1>\n<p>Sales rose <strong>12%</strong> in <em>Q3</em>.</p>\n<ul>\n  <li>New stores</li>\n  <li>Online growth</li>\n</ul>",
      note: "Shortened clipboard HTML from Word. Word writes bullet lists as styled paragraphs with a fake bullet character; the converter rebuilds them as a real <ul>.",
    },
    sections: [
      {
        heading: "Pasting from Word or Google Docs",
        body: "When you copy from Word, Google Docs, Pages or a web page, the clipboard holds HTML as well as plain text. The paste box reads that HTML directly, so the structure survives: headings stay headings and lists stay lists. If the clipboard has no HTML (text copied from Notepad, for example), the text is converted into paragraphs instead.\n\nThe box accepts pastes only; typing into it is ignored, because the point is to convert existing formatted content. To write HTML by hand, use the [HTML viewer](/html-viewer/).",
      },
      {
        heading: "What gets cleaned",
        body: "Word's clipboard HTML is often ten times the size of the content. The converter removes:\n\n- `style` attributes (fonts, sizes, colors, margins, `mso-` properties) and `class` names such as `MsoNormal`\n- `<span>` and `<font>` wrappers, Office XML (`<o:p>`, `<w:…>`), conditional comments and `<style>` blocks\n- empty paragraphs, non-breaking spaces used for spacing (optional) and `javascript:` or `file:` links\n\nFormatting that carries meaning is converted to semantic tags: bold to `<strong>`, italic to `<em>`. Google Docs marks bold and italic with `font-weight` and `font-style` styles on spans rather than tags, and those are converted too.",
      },
      {
        heading: "Headings, lists, tables and links",
        body: "Kept: `<h1>`–`<h6>`, paragraphs, bulleted and numbered lists (including Word's fake lists, rebuilt as `<ul>` or `<ol>` from their bullet or number), `<blockquote>`, `<pre>`, links with their `href`, `<sub>`, `<sup>` and line breaks. Tables keep their rows, header cells and `colspan`/`rowspan`, but lose borders and widths; untick **Keep tables** to turn each row into a paragraph instead.\n\nWhen you open a **.docx**, the Mammoth library converts it using Word's paragraph styles, so use real Heading 1/Heading 2 styles in Word rather than large bold text if you want `<h1>`/`<h2>` in the output. Images in a .docx are embedded as Base64 data URIs.",
      },
      {
        heading: "Using the HTML in a CMS",
        body: "Paste the result into the HTML, Code or Text view of your editor (WordPress: **Code editor** or a Custom HTML block; Shopify and most others have a `<>` button). Pasting into the visual view would treat the tags as text. Because all inline styles are gone, the content picks up your site's own fonts and spacing, which is usually what you want.\n\nData-URI images make the HTML very large and are poor for page speed; upload the images to your media library and replace the `src` values. Run the result through the [HTML formatter](/html-formatter/) if you want it indented for editing.",
      },
    ],
    faq: [
      {
        q: "Why does Word HTML contain so much junk?",
        a: "Word exports HTML that can be reopened in Word without losing anything, so it stores every font, margin and list setting as Office-specific markup. Web pages need none of it.",
      },
      {
        q: "Are images converted?",
        a: "From a .docx file, yes: they are embedded as data URIs. Images in pasted content usually point to temporary files on your computer, so they are left out and the footer counts them.",
      },
      {
        q: "Can I keep tables?",
        a: "Yes, with **Keep tables** ticked: rows, cells, header cells and merged cells are kept as plain HTML tables without Word's borders and widths.",
      },
    ],
    sources: [
      { label: "Mammoth .docx to HTML converter", url: "https://github.com/mwilliamson/mammoth.js" },
      { label: "MDN: Clipboard data (text/html) on paste", url: "https://developer.mozilla.org/en-US/docs/Web/API/ClipboardEvent/clipboardData" },
    ],
    related: ["html-formatter", "html-viewer", "text-to-html-converter", "html-to-text-converter", "word-to-pdf"],
    links: [
      { href: "/html-formatter/", anchor: "HTML formatter" },
      { href: "/html-viewer/", anchor: "HTML viewer" },
      { href: "/text-to-html-converter/", anchor: "text to HTML" },
      { href: "/word-to-pdf/", anchor: "Word to PDF" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Paste from Word, Google Docs or web pages, or open a .docx",
      "Removes inline styles, classes, spans and Office markup",
      "Rebuilds Word's fake bullet and numbered lists as real lists",
      "Keeps headings, links, tables and bold/italic as semantic tags",
      "Code and rendered preview of the result",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["docx", "word", "google docs", "rich text"], to: ["html"] },
  },
  {
    id: "text-to-html-converter",
    path: "/text-to-html-converter/",
    name: "Text to HTML Converter",
    h1: "Text to HTML Converter",
    title: "Text to HTML Converter – Paragraphs, Line Breaks and Links",
    metaDescription:
      "Convert plain text into HTML paragraphs and line breaks, turn URLs into links and escape special characters, ready to paste into a page or email.",
    summary:
      "Convert plain text into HTML: blank lines become paragraphs, single line breaks become <br>, special characters are escaped, and web and email addresses become links.",
    category: "development-tools",
    subgroup: "html",
    card: "Convert plain text into HTML paragraphs, line breaks and links.",
    archetype: "transform",
    widget: "code-ops",
    config: { op: "text-to-html" },
    aliases: [
      "text to html",
      "plain text to html",
      "convert text to html paragraphs",
      "line breaks to br",
      "nl2br online",
      "txt to html",
      "text to html with links",
      "escape html online",
      "markdown to html",
    ],
    keywords: ["html", "paragraphs", "line breaks", "escape", "links"],
    processing: "browser",
    steps: [
      "Paste or type text into **Plain text**, or press **Example**. The HTML appears as you type.",
      "Choose how **Line breaks** are handled: blank line = new paragraph with `<br>` for single breaks, every line as its own paragraph, or `<br>` only.",
      "Keep **Escape < > &** ticked for normal text, and **Turn URLs and emails into links** if you want clickable links (optionally **Open links in a new tab**). Tick **Markdown-style formatting** for **bold**, headings and lists.",
      "Press **Copy** or **Download** (`text.html`).",
    ],
    example: {
      input: "Opening hours\nMon–Fri: 9am–5pm\n\nEmail hello@example.com or visit www.example.com/contact.\nPrices < £10 & free returns.",
      output:
        '<p>Opening hours<br>\nMon–Fri: 9am–5pm</p>\n<p>Email <a href="mailto:hello@example.com">hello@example.com</a> or visit <a href="https://www.example.com/contact">www.example.com/contact</a>.<br>\nPrices &lt; £10 &amp; free returns.</p>',
      note: "The full stop after the URL isn't included in the link, and www. addresses get https:// added.",
    },
    sections: [
      {
        heading: "Paragraphs vs line breaks",
        body: "In plain text, a blank line usually separates paragraphs and a single line break is just a new line inside one (an address, a poem). The default setting follows that convention: each block of text becomes a `<p>`, and line breaks within it become `<br>`, which is the same as PHP's `nl2br` plus paragraphs.\n\nChoose **Every line is a <p>** for lists of short items where each line is its own paragraph, or **Only <br>, no paragraphs** when the HTML goes inside an existing element, such as a table cell or an email template slot.",
      },
      {
        heading: "Escaping special characters",
        body: "Three characters have special meaning in HTML and must be escaped in text: `<` becomes `&lt;`, `>` becomes `&gt;` and `&` becomes `&amp;`. Without that, `a < b` can swallow the rest of the line as a broken tag, and pasted text containing `<script>` would become real code. Accented letters, curly quotes and emoji don't need escaping in a UTF-8 page and are left as they are, which keeps the HTML readable.\n\nUntick **Escape < > &** only when the text already contains HTML tags you want to keep. For converting characters to entities such as `&eacute;`, use the [Unicode converter](/ascii-to-unicode-converter/).",
      },
      {
        heading: "Auto-linking URLs",
        body: "Addresses starting with `http://`, `https://` or `www.` become links, and `www.` addresses get `https://` added to the `href`. Email addresses become `mailto:` links. Punctuation at the end of a URL, such as a full stop or closing bracket, is left outside the link, because it almost always belongs to the sentence.\n\n**Open links in a new tab** adds `target=\"_blank\" rel=\"noopener\"`. Use it sparingly: opening new tabs takes control away from visitors, and it is mainly useful in emails or for links to documents.",
      },
      {
        heading: "Markdown-style formatting",
        body: "Tick **Markdown-style formatting** to convert the common basics:\n\n| You type | You get |\n|---|---|\n| `# Title` to `###### Title` | `<h1>` to `<h6>` |\n| `**bold**` | `<strong>bold</strong>` |\n| `*italic*` or `_italic_` | `<em>italic</em>` |\n| a word between backticks | `<code>…</code>` |\n| lines starting `- ` or `1. ` | `<ul>` or `<ol>` lists |\n| lines starting `> ` | `<blockquote>` |\n| `[text](https://…)` | a link |\n\nIt is a practical subset, not full CommonMark: nested lists, tables and code blocks aren't converted. Check the result in the [HTML viewer](/html-viewer/).",
      },
    ],
    faq: [
      {
        q: "How do I convert line breaks to <br>?",
        a: "Paste your text with **Line breaks** on the default setting: single line breaks become `<br>` and blank lines start new paragraphs. Choose **Only <br>, no paragraphs** to get `<br>` without any `<p>` tags.",
      },
      {
        q: "Which characters need escaping in HTML?",
        a: "In text, `<`, `>` and `&`. Inside attribute values, also the quote character that delimits the value (`&quot;`).",
      },
      {
        q: "Can I convert Markdown?",
        a: "The common parts: headings, bold, italic, inline code, simple lists, quotes and links. Tick **Markdown-style formatting**.",
      },
    ],
    sources: [{ label: "HTML Living Standard: the p element and paragraphs", url: "https://html.spec.whatwg.org/multipage/grouping-content.html#the-p-element" }, { label: "OWASP: Cross Site Scripting Prevention Cheat Sheet (output encoding)", url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html" }],
    related: ["html-to-text-converter", "word-to-html-converter", "html-viewer", "ascii-to-unicode-converter", "add-remove-line-breaks"],
    links: [
      { href: "/html-to-text-converter/", anchor: "HTML to text" },
      { href: "/word-to-html-converter/", anchor: "Word to HTML" },
      { href: "/html-viewer/", anchor: "HTML viewer" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Paragraphs and <br> line breaks in three styles",
      "Escapes <, > and & so text displays safely",
      "Turns URLs and email addresses into links",
      "Optional Markdown-style headings, bold, italic and lists",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 3,
    formats: { from: ["text", "txt", "markdown"], to: ["html"] },
  },
  {
    id: "html-to-text-converter",
    path: "/html-to-text-converter/",
    name: "HTML to Text Converter",
    h1: "HTML to Text Converter",
    title: "HTML to Text Converter – Strip Tags, Keep Readable Text",
    metaDescription:
      "Strip HTML tags and get clean plain text with paragraphs, lists and links kept as readable text. Decodes entities such as &amp; and &nbsp;.",
    summary:
      "Strip the tags from HTML and get readable plain text: paragraphs and line breaks kept, lists as bullets or numbers, links as text with their URL, and entities such as &amp; decoded.",
    category: "development-tools",
    subgroup: "html",
    card: "Strip HTML tags and keep clean, readable plain text.",
    archetype: "transform",
    widget: "code-ops",
    config: { op: "html-to-text" },
    aliases: [
      "strip html tags",
      "html to plain text",
      "remove html tags",
      "html tag remover",
      "html to txt",
      "extract text from html",
      "html email to plain text",
      "html stripper",
      "convert html to text",
    ],
    keywords: ["html", "plain text", "strip tags", "entities"],
    processing: "browser",
    limits: ["Paste HTML source; the tool doesn't fetch pages from a URL."],
    steps: [
      "Paste HTML into the **HTML** box, or press **Example**. The text appears as you type.",
      "Choose how **Links** appear: **Text only**, **Text (URL)** or **Markdown [text](URL)**.",
      "Set **Headings** (plain, Markdown `#` or UPPER CASE) and **Table cells** (tabs or `|`), and decide on **Bullets and numbers for lists** and **Keep image alt text**.",
      "Press **Copy** or **Download** (`text.txt`). The footer shows the word count.",
    ],
    example: {
      input:
        '<h1>Spring sale</h1>\n<p>Everything is <strong>20%&nbsp;off</strong> until Friday. <a href="https://example.com/sale">See the sale</a> &amp; save.</p>\n<ul><li>Shirts</li><li>Shoes</li></ul>\n<script>trackVisit()</script>',
      output: "Spring sale\n\nEverything is 20% off until Friday. See the sale (https://example.com/sale) & save.\n\n- Shirts\n- Shoes",
      note: "Links: Text (URL). The script is removed with its content; &nbsp; and &amp; are decoded.",
    },
    sections: [
      {
        heading: "What's kept and what's removed",
        body: "All tags are removed, but the structure they express is turned into plain-text layout: paragraphs, headings and block elements are separated by blank lines, `<br>` becomes a line break, and `<hr>` becomes `---`. Text inside `<pre>` keeps its spacing exactly.\n\nElements whose content isn't readable text are removed entirely, content included: `<script>`, `<style>`, `<head>`, `<noscript>`, `<template>`, `<svg>`, `<iframe>`, `<canvas>`, `<select>` and `<button>`. Comments are dropped. Inline formatting (bold, italic, spans) disappears without leaving gaps.",
      },
      {
        heading: "Line breaks, lists and tables",
        body: "List items each go on their own line. With **Bullets and numbers for lists** ticked they start with `- ` or `1. ` (respecting an `<ol start>`), and nested lists are indented by two spaces per level. Untick it for one item per line without markers.\n\nTable rows become lines, and cells are separated by a tab (pastes into a spreadsheet as columns) or by ` | ` for something readable in an email. Runs of spaces and line breaks in the source are collapsed the way a browser displays them, so the text matches what the page shows rather than how its code was indented.",
      },
      {
        heading: "Links: keep URLs or drop them",
        body: "**Links** controls what happens to `<a href>`:\n\n| Option | Result |\n|---|---|\n| Text only | See the sale |\n| Text (URL) | See the sale (https://example.com/sale) |\n| Markdown | [See the sale](https://example.com/sale) |\n\nWith **Text (URL)**, the URL isn't repeated when the link text already is the URL, and `mailto:` is dropped from email links. Links that only jump within the page (`#top`) or run JavaScript are kept as text only. The text-plus-URL form is the usual choice for the plain-text part of an HTML email.",
      },
      {
        heading: "Entities and special characters",
        body: "HTML entities are decoded to the characters they stand for: `&amp;` → &, `&lt;` → <, `&eacute;` → é, `&#8364;` and `&#x20AC;` → €, `&mdash;` → —. A non-breaking space (`&nbsp;`) becomes a normal space, so words don't stick together in the text. Invalid numeric references become the replacement character �, as browsers do. With **Keep image alt text** ticked, images appear as `[image: alt text]`, which keeps the meaning of image-only links. To count the words in the result, use the [word counter](/word-counter/).",
      },
    ],
    faq: [
      {
        q: "How do I remove HTML tags but keep line breaks?",
        a: "Paste the HTML here: `<br>` becomes a line break and paragraphs, headings and list items are separated by line breaks automatically.",
      },
      {
        q: "Are scripts and styles removed?",
        a: "Yes, together with their content, along with `<head>`, `<noscript>`, `<svg>` and `<iframe>`. Only text a reader would see remains.",
      },
      {
        q: "Can I paste a URL?",
        a: "No, this tool converts HTML you paste. Open the page, view its source (Ctrl + U in most browsers), copy it and paste it here.",
      },
    ],
    sources: [
      { label: "HTML Living Standard: named character references", url: "https://html.spec.whatwg.org/multipage/named-characters.html" },
      { label: "RFC 2046: multipart/alternative (plain-text and HTML email parts)", url: "https://www.rfc-editor.org/rfc/rfc2046#section-5.1.4" },
    ],
    related: ["text-to-html-converter", "word-counter", "html-formatter", "remove-extra-spaces", "word-to-html-converter"],
    links: [
      { href: "/text-to-html-converter/", anchor: "text to HTML" },
      { href: "/word-counter/", anchor: "word counter" },
      { href: "/html-formatter/", anchor: "HTML formatter" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Keeps paragraphs, line breaks, lists and table rows as plain-text layout",
      "Links as text, text with URL, or Markdown",
      "Removes scripts, styles and other non-text elements with their content",
      "Decodes named and numeric HTML entities",
      "Word count of the result",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["html"], to: ["text", "txt", "markdown"] },
  },

  /* ---------------- Colour tools ---------------- */
  {
    id: "color-code-converter",
    path: "/color-code-converter/",
    name: "Color Code Converter",
    h1: "Color Code Converter",
    title: "Color Converter – HEX, RGB, HSL, HSV and CMYK",
    metaDescription:
      "Convert any colour between HEX, RGB, HSL, HSV and CMYK, including alpha values and CSS colour names, with sliders and a live swatch to copy from.",
    summary:
      "Type a color in any format (HEX, rgb(), hsl(), hwb(), hsv(), cmyk() or a CSS name) and get it in all the others, with alpha, sliders, tints and shades, and a contrast check.",
    category: "development-tools",
    subgroup: "colour",
    card: "Convert colors between HEX, RGB, HSL, HWB, HSV and CMYK.",
    archetype: "calculator",
    widget: "color",
    config: { mode: "convert" },
    aliases: [
      "color converter",
      "colour converter",
      "hex to hsl",
      "rgb to hsl",
      "cmyk to hex",
      "hex to cmyk",
      "hsv converter",
      "color name to hex",
      "hsl to hex",
      "rgba converter",
      "colour code converter",
    ],
    keywords: ["color", "hex", "rgb", "hsl", "cmyk", "css"],
    processing: "browser",
    limits: ["CMYK uses the simple device formula without a print profile, so it is an approximation of printed color."],
    steps: [
      "Type or paste a color into **Color (any format)**, for example `#ff5722`, `rgb(255 87 34)`, `hsl(14 100% 57%)`, `cmyk(0% 66% 87% 0%)` or `tomato`. Or click the swatch button to use your system's color picker.",
      "Fine-tune with the **Red**, **Green**, **Blue** and **Alpha** sliders or number fields.",
      "Copy the format you need from **Codes**: HEX, HEX with alpha, RGB, HSL, HWB, HSV or CMYK. **CSS name** shows the exact or nearest named color.",
      "Pick a lighter or darker version under **Tints and shades**, and check text legibility in the **Contrast checker**.",
    ],
    example: {
      input: "#ff5722",
      output: "rgb(255, 87, 34)\nhsl(14, 100%, 57%)\nhwb(14 13% 0%)\nhsv(14, 87%, 100%)\ncmyk(0%, 66%, 87%, 0%)",
      note: "No CSS named color matches exactly; the nearest is shown.",
    },
    sections: [
      {
        heading: "Supported formats",
        body: "| Format | Example | Notes |\n|---|---|---|\n| HEX | `#ff5722`, `#f52`, `#ff572280` | 3, 4, 6 or 8 digits; the # is optional |\n| RGB | `rgb(255, 87, 34)`, `rgb(255 87 34 / 50%)` | 0–255 or percentages; `rgba()` too |\n| HSL | `hsl(14, 100%, 57%)` | hue in degrees (or `turn`, `rad`, `grad`) |\n| HWB | `hwb(14 13% 0%)` | hue, whiteness, blackness (CSS Color 4) |\n| HSV / HSB | `hsv(14, 87%, 100%)` | used by Photoshop and most picker dialogs |\n| CMYK | `cmyk(0%, 66%, 87%, 0%)` | percentages, or 0–1 fractions |\n| Name | `tomato`, `rebeccapurple` | all 148 CSS named colors |\n\nBoth the comma syntax and the modern space syntax of CSS Color 4 are accepted, and three bare numbers such as `255, 87, 34` are read as RGB.",
      },
      {
        heading: "Alpha and transparency",
        body: "Alpha (opacity) runs from 0 (transparent) to 1 (opaque). Set it with the **Alpha** slider or type it: `rgba(255, 87, 34, 0.5)`, `rgb(255 87 34 / 50%)` or the 8-digit hex `#ff572280`. In 8-digit hex the last pair is alpha on a 0–255 scale, so `80` (128) is 50% and `cc` (204) is 80%.\n\nThe swatch shows transparency over a checkerboard. When alpha is below 1, every output includes it (`rgba()`, `hsla()`, `hwb(… / 0.5)`), except HSV and CMYK, which have no standard alpha notation.",
      },
      {
        heading: "Why CMYK conversions are approximate",
        body: "Screens mix red, green and blue light; printers lay cyan, magenta, yellow and black ink on paper. The CMYK shown here uses the standard device formula (K = 1 − max(R, G, B), then C, M and Y from what remains), which is what most design tools display without a color profile. Real print output depends on the ink, the paper and the ICC profile the printer uses, and many bright screen colors (vivid greens, oranges, blues) can't be printed at all. For print work, convert in your layout software with the printer's profile and check a proof.",
      },
      {
        heading: "CSS color names",
        body: "CSS defines 148 named colors, from `aliceblue` to `yellowgreen`, plus `transparent`. Type a name to get its codes; for any color, **CSS name** shows the exact name if there is one and otherwise the nearest by RGB distance (#ff5722 is close to `orangered` and `tomato`, but matches neither). Some names are surprising: `gray` (#808080) is darker than `darkgray` (#a9a9a9), and `grey` and `gray` are identical.",
      },
      {
        heading: "Choosing a format for CSS",
        body: "All formats render identically; pick by what you need to do with them. **HEX** is compact and what design tools hand over. **HSL** is easiest to adjust by hand: change only the lightness to get hover or disabled states that stay in the same hue. **RGB with alpha** is common for overlays and shadows. Newer CSS spaces such as `oklch()` give more even lightness steps; this converter works in sRGB, which every browser supports. To read and tidy color values in a whole stylesheet, use the [CSS formatter](/css-formatter/).",
      },
    ],
    faq: [
      {
        q: "Why does my CMYK color print differently?",
        a: "The conversion here doesn't know your printer, paper or ICC profile, and some screen colors are outside what ink can reproduce. Use your print shop's profile in your layout software for final colors.",
      },
      {
        q: "What's the difference between HSL and HSV?",
        a: "Both use hue and saturation, but in HSL 100% lightness is always white, while in HSV 100% value is the brightest version of the hue. CSS uses HSL; picker dialogs in design tools usually use HSV.",
      },
      {
        q: "How do I add transparency to a hex color?",
        a: "Add two hex digits for alpha: `#ff5722` at 50% is `#ff572280`. Set the **Alpha** slider and copy **HEX** to get the right digits.",
      },
    ],
    sources: [CSS_COLOR_4, { label: "MDN: <named-color>", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/named-color" }],
    related: ["rgb-to-hex-color-converter", "color-picker-tool", "css-formatter", "favicon-generator"],
    links: [
      { href: "/rgb-to-hex-color-converter/", anchor: "RGB to HEX" },
      { href: "/color-picker-tool/", anchor: "colour picker" },
      { href: "/css-formatter/", anchor: "CSS formatter" },
    ],
    appCategory: "DesignApplication",
    features: [
      "Reads HEX, rgb(), hsl(), hwb(), hsv(), cmyk() and CSS names",
      "Outputs every format, with alpha where the format supports it",
      "RGB and alpha sliders with a live swatch",
      "Exact or nearest CSS color name",
      "Tints, shades and a WCAG contrast check",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["hex", "rgb", "hsl", "hsv", "cmyk"], to: ["hex", "rgb", "hsl", "hsv", "cmyk", "hwb"] },
  },
  {
    id: "rgb-to-hex-color-converter",
    path: "/rgb-to-hex-color-converter/",
    name: "RGB to HEX Color Converter",
    h1: "RGB to HEX Color Converter",
    title: "RGB to HEX Converter – and HEX to RGB",
    metaDescription:
      "Convert RGB values to a HEX colour code or a HEX code back to RGB, with a live swatch, alpha support and the formula worked through for each channel.",
    summary:
      "Enter red, green and blue values (0–255) to get the HEX code, or a HEX code to get RGB. The table below works through the division by 16 for each channel, so you can check it by hand.",
    category: "development-tools",
    subgroup: "colour",
    card: "Convert RGB to a HEX color code and HEX back to RGB.",
    archetype: "calculator",
    widget: "color",
    config: { mode: "rgb-hex" },
    aliases: [
      "rgb to hex",
      "hex to rgb",
      "rgb to hex converter",
      "hex to rgb converter",
      "rgb to hex color code",
      "hex color to rgb",
      "rgba to hex",
      "hex to rgba",
      "rgb2hex",
      "rgb to hexadecimal",
    ],
    keywords: ["rgb", "hex", "color code", "css", "alpha"],
    processing: "browser",
    steps: [
      "Set **Red**, **Green** and **Blue** with the sliders or type values from 0 to 255. Set **Alpha** below 1 for a transparent color.",
      "Read the HEX code under **Codes**, or in the last line of **The formula, channel by channel**.",
      "For the other direction, type a code into **HEX code**, such as `#ff5722`, `#f52` or `#ff572280`; the sliders and RGB values update.",
      "Press **Copy** next to the value you need.",
    ],
    example: {
      input: "rgb(255, 87, 34)",
      output: "#FF5722",
      note: "255 = 15 × 16 + 15 → FF; 87 = 5 × 16 + 7 → 57; 34 = 2 × 16 + 2 → 22.",
    },
    sections: [
      {
        heading: "RGB to HEX formula",
        body: "Each channel (0–255) becomes two hexadecimal digits. Divide by 16: the whole-number result is the first digit and the remainder the second, with 10–15 written as A–F.\n\n| Channel | Value | ÷ 16 | Remainder | Hex |\n|---|---|---|---|---|\n| Red | 255 | 15 → F | 15 → F | FF |\n| Green | 87 | 5 → 5 | 7 → 7 | 57 |\n| Blue | 34 | 2 → 2 | 2 → 2 | 22 |\n\nJoin them after a `#`: **#FF5722**. Values below 16 need a leading zero: 10 is `0A`, so rgb(10, 10, 10) is `#0A0A0A`, not `#AAA`. The table in the tool shows these steps for whatever color you set. For more on base 16, see [how hexadecimal works](/binary-to-hex-converter/).",
      },
      {
        heading: "HEX to RGB",
        body: "Reverse it: split the code into three pairs and convert each from base 16 by multiplying the first digit by 16 and adding the second. `#1E90FF`: `1E` = 1 × 16 + 14 = 30, `90` = 9 × 16 + 0 = 144, `FF` = 255, so rgb(30, 144, 255), which is `dodgerblue`.\n\nCase doesn't matter (`#ff5722` = `#FF5722`), and the `#` is optional when you type a code here.",
      },
      {
        heading: "Shorthand and 8-digit hex (alpha)",
        body: "**3-digit shorthand** doubles each digit: `#F52` = `#FF5522`, and `#FFF` = `#FFFFFF` = rgb(255, 255, 255). Only colors whose pairs are doubled digits can be shortened, so `#FF5722` has no shorthand.\n\n**8-digit hex** adds alpha as a fourth pair, on the same 0–255 scale: `#FF572280` is #FF5722 at 128/255 ≈ 50% opacity, `FF` is fully opaque and `00` fully transparent. The 4-digit form `#F528` is its shorthand. Set **Alpha** below 1 and the formula table adds the alpha row.",
      },
      {
        heading: "Using the codes in CSS",
        body: "All of these mean the same color in CSS:\n\n```\ncolor: #ff5722;\ncolor: rgb(255 87 34);\ncolor: rgb(255, 87, 34);\nbackground: #ff572280;          /* 50% opacity */\nbackground: rgb(255 87 34 / 50%);\n```\n\nEvery current browser supports 8-digit hex and the space-separated `rgb()` syntax. For HSL, HSV and CMYK versions of the same color, use the [color converter](/color-code-converter/); to pick a color visually, use the [color picker](/color-picker-tool/).",
      },
    ],
    faq: [
      {
        q: "How do I convert RGB to hex by hand?",
        a: "Divide each value by 16. The quotient is the first hex digit and the remainder the second (10–15 are A–F). Write the three pairs after a #.",
      },
      {
        q: "What is #FFF in RGB?",
        a: "rgb(255, 255, 255), which is white. `#FFF` is shorthand for `#FFFFFF`.",
      },
      {
        q: "What do the last two digits of an 8-digit hex mean?",
        a: "Opacity on a 0–255 scale: `FF` is fully opaque, `80` about 50% and `00` fully transparent.",
      },
    ],
    sources: [CSS_COLOR_4, { label: "MDN: <hex-color>", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/hex-color" }],
    related: ["color-code-converter", "color-picker-tool", "binary-to-hex-converter", "css-formatter"],
    links: [
      { href: "/color-code-converter/", anchor: "colour converter" },
      { href: "/color-picker-tool/", anchor: "colour picker" },
      { href: "/binary-to-hex-converter/", anchor: "how hexadecimal works" },
    ],
    appCategory: "DesignApplication",
    features: [
      "RGB to HEX and HEX to RGB in one place",
      "Channel-by-channel working of the base-16 conversion",
      "3, 4, 6 and 8-digit hex with alpha",
      "Sliders, number fields and a live swatch",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
    formats: { from: ["rgb", "hex"], to: ["hex", "rgb"] },
  },
  {
    id: "color-picker-tool",
    path: "/color-picker-tool/",
    name: "Color Picker",
    h1: "Color Picker",
    title: "Color Picker – HEX, RGB and HSL Codes, Shades and Contrast",
    metaDescription:
      "Pick a colour visually and copy its HEX, RGB, HSL or CMYK code. See shades and tints and check text contrast against WCAG levels.",
    summary:
      "Pick a color with a visual picker, from anywhere on screen (in Chrome and Edge) or from an image, and copy its HEX, RGB, HSL or CMYK code. Tints, shades and a WCAG contrast check help you use it.",
    category: "development-tools",
    subgroup: "colour",
    card: "Pick a color, copy its codes and check its contrast for text.",
    archetype: "calculator",
    widget: "color",
    config: { mode: "picker" },
    aliases: [
      "html color picker",
      "hex color picker",
      "color picker online",
      "pick color from image",
      "colour picker",
      "eyedropper tool online",
      "contrast checker",
      "color contrast checker",
      "shades and tints generator",
      "rgb color picker",
      "colour picker from image",
    ],
    keywords: ["color picker", "eyedropper", "contrast", "wcag", "shades", "tints"],
    processing: "browser",
    limits: ["Picking from anywhere on screen needs the EyeDropper API (Chrome and Edge on desktop); other browsers can pick from an image."],
    steps: [
      "Click the swatch next to **Color (any format)** to open your system's color picker, type a code, or press **Pick from screen** where your browser supports it.",
      "Adjust with the **Red**, **Green**, **Blue** and **Alpha** sliders and copy a code from **Codes**.",
      "Click any swatch under **Tints and shades** to switch to a lighter or darker version.",
      "In the **Contrast checker**, set the **Text color** (or press **Use white** / **Use black**) and read the ratio and the AA and AAA results.",
      "To sample a photo or logo, choose a file under **Pick a color from an image** and click the pixel you want.",
    ],
    example: {
      input: "#ff5722 background with white text, then black text",
      output: "White text: 3.16:1 (passes AA large text and UI components only)\nBlack text: 6.63:1 (passes AA normal text, fails AAA normal text)",
      note: "Ratios are cut, not rounded, to two decimals, so a 4.499:1 color never shows as passing 4.5:1.",
    },
    sections: [
      {
        heading: "Picking colors",
        body: "There are three ways to choose a color. The swatch button opens your operating system's own picker, which often has an eyedropper built in. **Pick from screen** uses the browser's EyeDropper API to sample any pixel on your screen, including other windows; it is available in Chrome and Edge on desktop, and the button only appears where it works. Or type a code you already have in any format (HEX, RGB, HSL, HWB, HSV, CMYK or a CSS name).\n\nThe **Codes** panel then gives every format at once, with the closest CSS color name.",
      },
      {
        heading: "Shades, tints and palettes",
        body: "A **tint** mixes the color with white and a **shade** mixes it with black. The tool shows five of each, in even steps from about 17% to 83%, so you can build hover, pressed and background states from one brand color. Click a swatch to make it the current color and copy its codes.\n\nMixing in RGB keeps the hue but can make mid-tones look a little grayish. For a design system, check each step in the contrast checker: a tint that works as a background may need dark rather than white text.",
      },
      {
        heading: "Contrast ratio and WCAG",
        body: "WCAG 2.2 measures text legibility as a contrast ratio from 1:1 (no contrast) to 21:1 (black on white), based on the relative luminance of the two colors.\n\n| Level | Normal text | Large text (24 px, or 18.7 px bold) | UI components and icons |\n|---|---|---|---|\n| AA | 4.5:1 | 3:1 | 3:1 |\n| AAA | 7:1 | 4.5:1 | not defined |\n\nAA is the usual legal and accessibility target. #767676 is the lightest gray that passes AA for body text on white (4.54:1). Semi-transparent colors are measured as laid over the background, and a transparent background as laid over white. The panel also says whether white or black text gives more contrast.",
      },
      {
        heading: "Picking a color from an image",
        body: "Choose a photo, screenshot or logo under **Pick a color from an image** (or paste an image), then click any point: that pixel's exact color becomes the current color. The image is drawn on a canvas in your browser and never uploaded; large images are scaled to 1,200 px for display, which can blend neighbouring pixels slightly at fine edges. JPEG compression also shifts colors a little, so for exact brand colors, sample a PNG or SVG export or ask for the official codes. Once you have the color, the [favicon generator](/favicon-generator/) can use it as a background.",
      },
    ],
    faq: [
      {
        q: "What contrast ratio do I need for body text?",
        a: "At least 4.5:1 for WCAG AA, or 7:1 for AAA. Large text (24 px, or about 18.7 px bold) needs 3:1 for AA.",
      },
      {
        q: "Can I pick a color from my screen?",
        a: "Yes in Chrome and Edge on desktop: press **Pick from screen** and click anywhere. In other browsers, take a screenshot and pick from it as an image.",
      },
      {
        q: "How do I make a color darker?",
        a: "Click one of the **shades**, which mix it with black, or lower the lightness in its HSL value, which keeps the hue. The [color converter](/color-code-converter/) shows the HSL code.",
      },
    ],
    sources: [WCAG_CONTRAST, { label: "WCAG 2.2: Relative luminance definition", url: "https://www.w3.org/TR/WCAG22/#dfn-relative-luminance" }, { label: "MDN: EyeDropper API", url: "https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API" }],
    related: ["color-code-converter", "rgb-to-hex-color-converter", "favicon-generator", "css-formatter"],
    links: [
      { href: "/color-code-converter/", anchor: "colour converter" },
      { href: "/rgb-to-hex-color-converter/", anchor: "RGB to HEX" },
      { href: "/favicon-generator/", anchor: "favicon generator" },
    ],
    appCategory: "DesignApplication",
    features: [
      "System color picker plus screen eyedropper where supported",
      "Pick any pixel from an uploaded image",
      "HEX, RGB, HSL, HWB, HSV and CMYK codes",
      "Five tints and five shades",
      "WCAG 2.2 contrast ratio with AA and AAA results",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },

  /* ---------------- Apache .htaccess tools ---------------- */
  {
    id: "htaccess-redirect-generator",
    path: "/htaccess-redirect-generator/",
    name: ".htaccess Redirect Generator",
    h1: ".htaccess Redirect Generator",
    title: ".htaccess Redirect Generator – 301 Rules for Apache",
    metaDescription:
      "Generate Apache .htaccess rules for 301 and 302 redirects: single pages, whole domains, HTTP to HTTPS, www to non-www and trailing slashes.",
    summary:
      "Generate Apache .htaccess rules for page, folder and domain redirects plus HTTPS, www and trailing-slash rules, ordered so every old address reaches its new one in a single redirect.",
    category: "development-tools",
    subgroup: "apache",
    card: "Generate .htaccess 301 redirects, HTTPS and www rules for Apache.",
    archetype: "generator",
    widget: "code-ops",
    config: { op: "htaccess-generator" },
    aliases: [
      "301 redirect htaccess",
      "htaccess redirect",
      "apache redirect generator",
      "redirect generator",
      "htaccess https redirect",
      "redirect http to https htaccess",
      "www to non-www htaccess",
      "htaccess 301 generator",
      "mod_rewrite generator",
      "htacess redirect",
    ],
    keywords: ["htaccess", "301", "redirect", "apache", "mod_rewrite", "https"],
    processing: "browser",
    limits: ["Rules are for Apache (and LiteSpeed). Nginx, IIS and most managed hosts with their own redirect settings need a different format."],
    steps: [
      "Enter **Your domain** and choose the site-wide rules: **Redirect HTTP to HTTPS**, **www** (remove or add), **Trailing slash** and the **/index.html** option.",
      "Under **Redirects**, choose each row's type (**Page**, **Folder**, **Whole domain** or **Removed (410 Gone)**), its **Status**, the **Old path** and the **New path or URL**. Press **Add redirect** for more rows.",
      "Read any warnings above the code, then press **Copy** or **Download** (saved as `htaccess.txt`; rename it to `.htaccess`).",
      "Press **Test these rules in the .htaccess tester** to try URLs against the rules before uploading.",
    ],
    example: {
      input: "Domain example.com, Redirect HTTP to HTTPS, Remove www, and a 301 from /old-page/ to /new-page/",
      output:
        "RewriteEngine On\n\n# Individual redirects (first, and straight to the final address, so there is only one hop)\nRewriteRule ^old-page/?$ https://example.com/new-page/ [R=301,L,NE]\n\n# Everything else: send to the canonical address in one redirect (https://example.com)\nRewriteCond %{HTTPS} off [OR]\nRewriteCond %{HTTP_HOST} ^www\\. [NC]\nRewriteRule ^ https://example.com%{REQUEST_URI} [R=301,L,NE]",
      note: "http://www.example.com/old-page/ goes to https://example.com/new-page/ in one redirect instead of two.",
    },
    sections: [
      {
        heading: "Redirect vs RewriteRule",
        body: "Apache has two ways to redirect. **mod_alias** (`Redirect 301 /old /new`, `RedirectMatch`) is simple but can only look at the path. **mod_rewrite** (`RewriteCond` + `RewriteRule`) can also test the host, HTTPS, query string or whether a file exists, which the HTTPS and www rules need.\n\nThe generator uses mod_rewrite throughout, because mixing the two in one file is a classic source of bugs: Apache runs all mod_rewrite rules first and mod_alias after, regardless of their order in the file. If your existing `.htaccess` has `Redirect` lines, convert them or keep them in mind when testing.",
      },
      {
        heading: "Page, folder and domain redirects",
        body: "- **Page** redirects one path. `/old-page/` matches with or without its trailing slash. A query string in the old path (`/product.php?id=5`) adds a `RewriteCond %{QUERY_STRING}` and the `QSD` flag, so the old parameters aren't carried over.\n- **Folder** redirects a directory and everything in it, keeping the rest of the path: `/blog/2026/post` → `/news/2026/post`.\n- **Whole domain** sends every URL on an old domain to the same path on the new one, matching with or without `www`. Use it when the old domain points at the same hosting.\n- **Removed (410 Gone)** tells search engines a page is permanently gone, which drops it from results faster than a 404.\n\nUse **301** (or **308**) for permanent moves and **302** (or **307**) for temporary ones. 307 and 308 also keep POST requests as POST. See [301 vs 302 redirects](/blog/301-vs-302-redirects/) for when each fits.",
      },
      {
        heading: "HTTPS and www rules",
        body: "One combined rule handles both: if the request isn't HTTPS **or** the host isn't the canonical one, it redirects to `https://` + canonical host + the original path, so `http://www.example.com/page` needs one hop, not two. The `NE` flag stops Apache from escaping characters in the path a second time.\n\nIf your site is behind Cloudflare or a load balancer that terminates TLS, `%{HTTPS}` is always `off` at your server and this rule loops forever. In that case use the proxy's \"Always use HTTPS\" setting, or replace the condition with `RewriteCond %{HTTP:X-Forwarded-Proto} !https`.",
      },
      {
        heading: "Avoiding chains and loops",
        body: "A **chain** is one redirect leading to another (`http://www` → `https://www` → `https://` → new page). Each hop adds a round trip, and search engines stop following after several. The generator avoids them in two ways: individual redirects come first and point straight at the final `https://` canonical address, and the HTTPS and www fixes share a single rule.\n\nA **loop** redirects back to itself. The generator warns when a page redirects to its own path. The trailing-slash rules skip real files (`!-f`), so `/style.css` never becomes `/style.css/`, and the /index.html rule only acts on what the browser actually requested (`THE_REQUEST`), so it can't fight with internal rewrites.",
      },
      {
        heading: "Testing your rules",
        body: "Before uploading, paste the code into the [.htaccess tester](/htaccess-tester/) (the link under the code does it for you) and try your old URLs: it shows which line matches and where each request ends up. After uploading, keep a copy of the old file, then check real responses with the [redirect checker](/redirect-checker/), which shows every hop and status code. A `500 Internal Server Error` straight after uploading usually means a typo or that mod_rewrite isn't enabled; restore the old file and check the server's error log.",
      },
    ],
    faq: [
      {
        q: "Where do I put the .htaccess file?",
        a: "In your site's document root, the folder that contains your home page (often `public_html` or `www`). If a file is already there, add the rules near the top, above any CMS rules such as WordPress's block.",
      },
      {
        q: "Why isn't my redirect working?",
        a: "The usual causes: mod_rewrite isn't enabled or `AllowOverride` doesn't allow .htaccess files, an earlier rule with `[L]` matches first, the browser cached an old 301, or the host ignores .htaccess (Nginx). Test in a private window and in the [.htaccess tester](/htaccess-tester/).",
      },
      {
        q: "Does Nginx use .htaccess?",
        a: "No. Nginx reads redirects from its server configuration, for example `location = /old-page/ { return 301 https://example.com/new-page/; }`. The rules here work on Apache and LiteSpeed servers.",
      },
    ],
    sources: [MOD_REWRITE, { label: "Apache HTTP Server: Redirecting and Remapping with mod_rewrite", url: "https://httpd.apache.org/docs/current/rewrite/remapping.html" }, { label: "Google Search Central: Redirects and Google Search", url: "https://developers.google.com/search/docs/crawling-indexing/301-redirects" }],
    related: ["htaccess-tester", "url-encoder-decoder", "regex-tester", "url-slug-generator"],
    links: [
      { href: "/htaccess-tester/", anchor: ".htaccess tester" },
      { href: "/redirect-checker/", anchor: "redirect checker" },
      { href: "/blog/301-vs-302-redirects/", anchor: "301 vs 302 redirects" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Page, folder, whole-domain and 410 Gone redirects",
      "Combined HTTPS and www rule without chains",
      "Trailing-slash and /index.html rules that skip real files",
      "301, 302, 307 and 308 status codes",
      "Warnings for self-redirects and missing domains",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },
  {
    id: "htaccess-tester",
    path: "/htaccess-tester/",
    name: ".htaccess Tester",
    h1: ".htaccess Tester",
    title: ".htaccess Tester – Test RewriteRules Against a URL",
    metaDescription:
      "Paste .htaccess rules and a URL to see which RewriteCond and RewriteRule lines match, the resulting URL and status code, before deploying to Apache.",
    summary:
      "Paste .htaccess rules and a URL to see, line by line, which RewriteCond and RewriteRule directives match, and whether the request is redirected, rewritten or left alone. It simulates Apache; it doesn't contact a server.",
    category: "development-tools",
    subgroup: "apache",
    card: "Test .htaccess rewrite and redirect rules against a URL.",
    archetype: "analyzer",
    widget: "htaccess-tester",
    aliases: [
      "htaccess checker",
      "test htaccess rewrite rules",
      "mod_rewrite tester",
      "htaccess validator",
      "rewriterule tester",
      "htaccess simulator",
      "apache rewrite tester",
      "test 301 redirect rules",
      "htacess tester",
    ],
    keywords: ["htaccess", "mod_rewrite", "rewriterule", "rewritecond", "redirect", "apache"],
    processing: "browser",
    limits: [
      "Simulates RewriteEngine, RewriteBase, RewriteCond, RewriteRule, Redirect, RedirectMatch, RedirectPermanent and RedirectTemp. Other directives are listed as not simulated.",
      "Patterns run as JavaScript regular expressions; PCRE-only syntax (possessive quantifiers, atomic groups) is reported as an error.",
    ],
    steps: [
      "Paste your rules into **.htaccess rules**, or press **Example**. Rules made with the [.htaccess redirect generator](/htaccess-redirect-generator/) arrive here automatically from its link.",
      "Enter the full **URL** to test, including `http://` or `https://`. Optionally set the **Request method**, **User agent** and **Referer**.",
      "Under **The requested path is on the server as…**, tick **An existing file** or **An existing folder** if that is true for this URL, so `-f` and `-d` conditions behave as on your server.",
      "Read the **Result** (redirect, internal rewrite, 403, 410 or unchanged) and the table showing each line's result and why.",
      "To check many addresses at once, paste them into **Test several URLs**, one per line, and press **Copy results** to take the summary.",
    ],
    example: {
      input:
        "RewriteEngine On\nRewriteCond %{HTTPS} off [OR]\nRewriteCond %{HTTP_HOST} ^www\\. [NC]\nRewriteRule ^ https://example.com%{REQUEST_URI} [R=301,L,NE]\nRewriteRule ^blog/(.*)$ /news/$1 [R=301,L]\n\nURL: http://www.example.com/blog/2026/hello",
      output:
        "301 redirect to https://example.com/blog/2026/hello\n(then, testing that URL: 301 redirect to https://example.com/news/2026/hello)",
      note: "Two hops: the HTTPS rule matches first and stops with [L]. Moving the blog rule above it, with an absolute https://example.com target, makes it one redirect.",
    },
    sections: [
      {
        heading: "How rules are evaluated",
        body: "In an `.htaccess` file, Apache strips the directory prefix and the leading slash before matching, so for `https://example.com/blog/post` a `RewriteRule` pattern sees `blog/post`, not `/blog/post`. That is the most common reason a rule copied from a server config doesn't match in .htaccess, and the trace shows the exact string each pattern was tested against.\n\nRules run top to bottom. For each `RewriteRule`, Apache first tests the pattern and only then its `RewriteCond` lines, so conditions above a non-matching rule show as *not evaluated*. A redirect (`R`) with `L` ends processing. An internal rewrite with `L` ends this pass, but Apache then runs the whole file again on the new path, which the tester shows as **Pass 2**; if the rules keep rewriting, it reports a loop, as Apache would with a 500 error.",
      },
      {
        heading: "RewriteCond and server variables",
        body: "Each condition tests a string, usually a server variable, against a pattern. The simulator fills these from your request:\n\n| Variable | Value for `http://www.example.com/a?x=1` |\n|---|---|\n| `%{HTTP_HOST}` | `www.example.com` |\n| `%{HTTPS}` | `off` |\n| `%{REQUEST_URI}` | `/a` |\n| `%{QUERY_STRING}` | `x=1` |\n| `%{THE_REQUEST}` | `GET /a?x=1 HTTP/1.1` |\n| `%{REQUEST_METHOD}`, `%{HTTP_USER_AGENT}`, `%{HTTP_REFERER}` | from the form |\n\nConditions are joined with AND unless a line has `[OR]`. `!` negates a pattern, `=` compares exactly, and `%1`–`%9` in the substitution refer to groups from the last matched condition (`$1`–`$9` refer to the rule's own pattern). `-f` and `-d` use your answers in the form, since a simulator can't see your server's files.",
      },
      {
        heading: "Flags: L, R=301, NC, QSA",
        body: "| Flag | Effect |\n|---|---|\n| `L` | Last: stop processing rules in this pass |\n| `R=301` | Redirect with this status (plain `R` is 302) |\n| `NC` | Case-insensitive pattern |\n| `QSA` | Append the original query string to one in the substitution |\n| `QSD` | Discard the original query string |\n| `NE` | Don't escape the substitution |\n| `F` / `G` | Respond 403 Forbidden / 410 Gone |\n| `S=n` | Skip the next n rules |\n| `END` | Stop all rewriting, including later passes |\n\nWithout `QSA`, a query string in the substitution replaces the original; with no `?` in the substitution, the original query is kept. A redirect without `L` keeps processing later rules, which the tester points out because it is rarely intended.",
      },
      {
        heading: "What a simulator can't test",
        body: "This is a rule simulator, not your server. It doesn't know:\n\n- your **server configuration**: `AllowOverride`, whether mod_rewrite is enabled, `<VirtualHost>` rules, or `.htaccess` files in subfolders;\n- your **file system**, beyond the file/folder answers you give (after an internal rewrite it assumes paths with a file extension exist);\n- other modules: `Header`, `ErrorDocument`, `Options`, `<If>` expressions, authentication and caching directives are listed under **Not simulated**;\n- **PCRE features** JavaScript lacks, and Apache's escaping of the substitution when `NE` isn't set.\n\nAfter uploading, confirm real behavior with the [redirect checker](/redirect-checker/), which requests the URL from a server and shows each hop.",
      },
    ],
    faq: [
      {
        q: "Why doesn't my RewriteRule match?",
        a: "Most often because the pattern starts with a slash: in .htaccess the path is matched without it, so use `^old-page$`, not `^/old-page$`. Also check that `RewriteEngine On` comes first and that an earlier rule with `[L]` isn't matching.",
      },
      {
        q: "Is this identical to Apache's behavior?",
        a: "For the supported directives it follows Apache's per-directory rules: pattern before conditions, [OR] chaining, back-references, query-string handling and repeated passes after a rewrite. Differences come from PCRE vs JavaScript regex details, the file system and server-level settings it can't see.",
      },
      {
        q: "How do I test on my real server?",
        a: "Upload the file to a staging copy of the site (or keep the old file ready to restore), then request the URLs with the [redirect checker](/redirect-checker/) or `curl -I`, and read Apache's error log if you get a 500.",
      },
    ],
    sources: [MOD_REWRITE, MOD_ALIAS, { label: "Apache HTTP Server: RewriteRule flags", url: "https://httpd.apache.org/docs/current/rewrite/flags.html" }],
    related: ["htaccess-redirect-generator", "regex-tester", "url-encoder-decoder", "url-slug-generator"],
    links: [
      { href: "/htaccess-redirect-generator/", anchor: ".htaccess redirect generator" },
      { href: "/redirect-checker/", anchor: "redirect checker" },
      { href: "/regex-tester/", anchor: "regex tester" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Line-by-line trace of RewriteCond and RewriteRule results",
      "Redirect, internal rewrite, 403, 410 and loop outcomes",
      "Server variables, back-references, [OR], QSA and repeated passes",
      "Redirect and RedirectMatch (mod_alias) support",
      "Tests up to 100 URLs at once",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 3,
  },
];
