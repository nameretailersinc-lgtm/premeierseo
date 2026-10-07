/*
 * Minimal, forgiving HTML tokenizer (WHATWG-style rules for the parts we need):
 * tags with quoted/unquoted attributes, comments, doctype/CDATA, and raw-text elements
 * (script, style, textarea, title) whose contents are not parsed. Pure functions, no DOM.
 */

export type Token =
  | { type: "text"; text: string }
  | { type: "comment"; text: string; raw: string }
  | { type: "decl"; raw: string }
  | { type: "open"; name: string; attrs: Attr[]; selfClosing: boolean; raw: string }
  | { type: "close"; name: string; raw: string }
  | { type: "raw"; parent: string; text: string };

export interface Attr {
  name: string;
  /** Value exactly as written, without quotes; null for a bare attribute. */
  value: string | null;
  quote: '"' | "'" | "";
}

const RAW_TEXT = new Set(["script", "style", "textarea", "title", "xmp", "plaintext"]);
const ATTR_RE = /\s*([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/y;

export function tokenize(html: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const n = html.length;
  let textStart = 0;
  const flushText = (end: number) => {
    if (end > textStart) out.push({ type: "text", text: html.slice(textStart, end) });
  };
  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt < 0) break;
    i = lt;
    const next = html[i + 1];
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i + 4);
      const stop = end < 0 ? n : end + 3;
      flushText(i);
      const raw = html.slice(i, stop);
      out.push({ type: "comment", text: raw.slice(4, end < 0 ? undefined : -3), raw });
      i = textStart = stop;
      continue;
    }
    if (next === "!" || next === "?") {
      const end = html.indexOf(">", i);
      const stop = end < 0 ? n : end + 1;
      flushText(i);
      out.push({ type: "decl", raw: html.slice(i, stop) });
      i = textStart = stop;
      continue;
    }
    if (next === "/") {
      const m = /^<\/([A-Za-z][^\s/>]*)[^>]*>/.exec(html.slice(i, i + 200));
      if (m) {
        flushText(i);
        out.push({ type: "close", name: m[1].toLowerCase(), raw: m[0] });
        i = textStart = i + m[0].length;
        continue;
      }
      i++;
      continue;
    }
    if (next && /[A-Za-z]/.test(next)) {
      const nm = /^<([A-Za-z][^\s/>]*)/.exec(html.slice(i, i + 100));
      if (!nm) {
        i++;
        continue;
      }
      let j = i + nm[0].length;
      const attrs: Attr[] = [];
      for (;;) {
        ATTR_RE.lastIndex = j;
        const am = ATTR_RE.exec(html);
        if (!am || am[0].length === 0) break;
        const value = am[2] ?? am[3] ?? am[4] ?? null;
        attrs.push({ name: am[1], value, quote: am[2] !== undefined ? '"' : am[3] !== undefined ? "'" : "" });
        j = ATTR_RE.lastIndex;
      }
      while (j < n && /\s/.test(html[j])) j++;
      let selfClosing = false;
      if (html[j] === "/") {
        selfClosing = true;
        j++;
      }
      if (html[j] !== ">") {
        // Not a well-formed tag; treat "<" as text.
        i++;
        continue;
      }
      j++;
      flushText(i);
      const name = nm[1].toLowerCase();
      out.push({ type: "open", name, attrs, selfClosing, raw: html.slice(i, j) });
      i = textStart = j;
      if (RAW_TEXT.has(name) && !selfClosing) {
        const re = new RegExp(`</${name}[\\s>/]`, "ig");
        re.lastIndex = i;
        const m = re.exec(html);
        const end = m ? m.index : n;
        if (end > i) out.push({ type: "raw", parent: name, text: html.slice(i, end) });
        i = textStart = end;
      }
      continue;
    }
    i++;
  }
  flushText(n);
  return out;
}

export function attr(t: Extract<Token, { type: "open" }>, name: string): string | null {
  const a = t.attrs.find((x) => x.name.toLowerCase() === name);
  return a ? (a.value ?? "") : null;
}

/* ---------- Entities ---------- */

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©", reg: "®", trade: "™", hellip: "…",
  mdash: "—", ndash: "–", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", sbquo: "‚", bdquo: "„", laquo: "«", raquo: "»",
  lsaquo: "‹", rsaquo: "›", bull: "•", middot: "·", deg: "°", plusmn: "±", times: "×", divide: "÷", frac12: "½", frac14: "¼",
  frac34: "¾", sup1: "¹", sup2: "²", sup3: "³", micro: "µ", para: "¶", sect: "§", cent: "¢", pound: "£", yen: "¥",
  euro: "€", curren: "¤", iexcl: "¡", iquest: "¿", shy: "­", ensp: " ", emsp: " ", thinsp: " ", zwnj: "‌", zwj: "‍",
  lrm: "‎", rlm: "‏", dagger: "†", Dagger: "‡", permil: "‰", prime: "′", Prime: "″", larr: "←", rarr: "→", uarr: "↑",
  darr: "↓", harr: "↔", rArr: "⇒", lArr: "⇐", hArr: "⇔", infin: "∞", ne: "≠", le: "≤", ge: "≥", asymp: "≈",
  minus: "−", radic: "√", sum: "∑", prod: "∏", part: "∂", int: "∫", alpha: "α", beta: "β", gamma: "γ", delta: "δ",
  epsilon: "ε", theta: "θ", lambda: "λ", mu: "μ", pi: "π", sigma: "σ", tau: "τ", phi: "φ", omega: "ω", Omega: "Ω",
  Delta: "Δ", Sigma: "Σ", Pi: "Π", hearts: "♥", spades: "♠", clubs: "♣", diams: "♦", check: "✓", star: "☆",
  Agrave: "À", Aacute: "Á", Acirc: "Â", Atilde: "Ã", Auml: "Ä", Aring: "Å", AElig: "Æ", Ccedil: "Ç", Egrave: "È", Eacute: "É",
  Ecirc: "Ê", Euml: "Ë", Igrave: "Ì", Iacute: "Í", Icirc: "Î", Iuml: "Ï", Ntilde: "Ñ", Ograve: "Ò", Oacute: "Ó", Ocirc: "Ô",
  Otilde: "Õ", Ouml: "Ö", Oslash: "Ø", Ugrave: "Ù", Uacute: "Ú", Ucirc: "Û", Uuml: "Ü", Yacute: "Ý", szlig: "ß", agrave: "à",
  aacute: "á", acirc: "â", atilde: "ã", auml: "ä", aring: "å", aelig: "æ", ccedil: "ç", egrave: "è", eacute: "é", ecirc: "ê",
  euml: "ë", igrave: "ì", iacute: "í", icirc: "î", iuml: "ï", ntilde: "ñ", ograve: "ò", oacute: "ó", ocirc: "ô", otilde: "õ",
  ouml: "ö", oslash: "ø", ugrave: "ù", uacute: "ú", ucirc: "û", uuml: "ü", yacute: "ý", yuml: "ÿ", OElig: "Œ", oelig: "œ",
  Scaron: "Š", scaron: "š", Yuml: "Ÿ", fnof: "ƒ", circ: "ˆ", tilde: "˜", ordf: "ª", ordm: "º", not: "¬", macr: "¯",
  acute: "´", cedil: "¸", uml: "¨", brvbar: "¦", ETH: "Ð", eth: "ð", THORN: "Þ", thorn: "þ",
};

/** Reverse map for encoding to named entities (only unambiguous, common ones). */
export const CHAR_TO_NAMED: Record<string, string> = Object.fromEntries(
  Object.entries(NAMED)
    .filter(([k]) => !["apos"].includes(k))
    .map(([k, v]) => [v, k]),
);

export function decodeEntities(s: string): string {
  if (s.indexOf("&") < 0) return s;
  return s.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[A-Za-z][A-Za-z0-9]*);?/g, (m, body: string) => {
    if (body[0] === "#") {
      const cp = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(cp) || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return "�";
      if (cp === 0) return "�";
      return String.fromCodePoint(cp);
    }
    const v = NAMED[body];
    return v !== undefined && (m.endsWith(";") || ["amp", "lt", "gt", "quot", "nbsp", "copy", "reg"].includes(body)) ? v : m;
  });
}

export function escapeHtml(s: string, quotes = false): string {
  let r = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (quotes) r = r.replace(/"/g, "&quot;");
  return r;
}

export const BLOCK = new Set(
  "address article aside blockquote body caption center col colgroup dd details dialog dir div dl dt fieldset figcaption figure footer form frameset h1 h2 h3 h4 h5 h6 head header hgroup hr html iframe legend li link main menu meta nav noscript ol optgroup option p pre script section style summary table tbody td template tfoot th thead title tr ul base !doctype".split(
    " ",
  ),
);

export const VOID = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
