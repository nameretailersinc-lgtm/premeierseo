/*
 * Encoders: Base64 (RFC 4648, standard and URL-safe), percent-encoding (RFC 3986 and
 * application/x-www-form-urlencoded) and Unicode escapes. Pure functions, no DOM.
 */
import { CHAR_TO_NAMED, decodeEntities } from "./html";

/* ---------- Base64 ---------- */

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function base64Encode(bytes: Uint8Array, o: { urlSafe?: boolean; pad?: boolean; wrap?: number } = {}): string {
  const A = o.urlSafe ? B64URL : B64;
  const pad = o.pad ?? !o.urlSafe;
  const parts: string[] = [];
  let s = "";
  const n = bytes.length;
  let i = 0;
  for (; i + 2 < n; i += 3) {
    const v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    s += A[v >> 18] + A[(v >> 12) & 63] + A[(v >> 6) & 63] + A[v & 63];
    if (s.length > 65_536) {
      parts.push(s);
      s = "";
    }
  }
  if (i < n) {
    const v = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8);
    s += A[v >> 18] + A[(v >> 12) & 63];
    s += i + 1 < n ? A[(v >> 6) & 63] + (pad ? "=" : "") : pad ? "==" : "";
  }
  parts.push(s);
  let out = parts.join("");
  if (o.wrap && o.wrap > 0) out = out.replace(new RegExp(`(.{${o.wrap}})(?=.)`, "g"), "$1\r\n");
  return out;
}

export interface B64Decoded {
  bytes?: Uint8Array;
  error?: string;
  /** MIME type from a data: URI prefix, if present. */
  mime?: string;
  urlSafe?: boolean;
}

export function base64Decode(input: string): B64Decoded {
  let s = input.trim();
  let mime: string | undefined;
  const data = /^data:([^;,]*)(?:;[^,]*)?;base64,/i.exec(s);
  if (data) {
    mime = data[1] || undefined;
    s = s.slice(data[0].length);
  }
  s = s.replace(/\s+/g, "");
  if (!s) return { bytes: new Uint8Array(0), mime };
  const bad = /[^A-Za-z0-9+/\-_=]/.exec(s);
  if (bad) return { error: `“${bad[0]}” at position ${bad.index + 1} isn't a Base64 character. Base64 uses A–Z, a–z, 0–9, + and / (or - and _ in the URL-safe form), with = as padding.` };
  const eq = s.indexOf("=");
  if (eq >= 0 && /[^=]/.test(s.slice(eq))) return { error: `Padding “=” can only appear at the end, but there is more data after position ${eq + 1}.` };
  const body = s.replace(/=+$/, "");
  if (body.length % 4 === 1) return { error: `The data is ${body.length} characters long, which can't be valid Base64 (one character too many or a character is missing).` };
  const urlSafe = /[-_]/.test(body);
  const out = new Uint8Array(Math.floor((body.length * 3) / 4));
  let buf = 0;
  let bits = 0;
  let o = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body.charCodeAt(i);
    const v =
      c >= 65 && c <= 90 ? c - 65 : c >= 97 && c <= 122 ? c - 71 : c >= 48 && c <= 57 ? c + 4 : c === 43 || c === 45 ? 62 : 63;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buf >> bits) & 255;
    }
  }
  return { bytes: out.subarray(0, o), mime, urlSafe };
}

export function utf8Encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** Decode bytes as UTF-8; reports whether the bytes were valid UTF-8. */
export function utf8Decode(bytes: Uint8Array): { text: string; valid: boolean } {
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), valid: true };
  } catch {
    return { text: new TextDecoder("utf-8").decode(bytes), valid: false };
  }
}

/** Guess a file type from its first bytes. */
export function sniffMime(b: Uint8Array): { mime: string; ext: string } | null {
  const starts = (...sig: number[]) => sig.every((x, i) => b[i] === x);
  if (starts(0x89, 0x50, 0x4e, 0x47)) return { mime: "image/png", ext: "png" };
  if (starts(0xff, 0xd8, 0xff)) return { mime: "image/jpeg", ext: "jpg" };
  if (starts(0x47, 0x49, 0x46, 0x38)) return { mime: "image/gif", ext: "gif" };
  if (starts(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { mime: "image/webp", ext: "webp" };
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (/avif|avis/.test(brand)) return { mime: "image/avif", ext: "avif" };
    if (/heic|heix|mif1/.test(brand)) return { mime: "image/heic", ext: "heic" };
    return { mime: "video/mp4", ext: "mp4" };
  }
  if (starts(0x25, 0x50, 0x44, 0x46)) return { mime: "application/pdf", ext: "pdf" };
  if (starts(0x50, 0x4b, 0x03, 0x04)) return { mime: "application/zip", ext: "zip" };
  if (starts(0x1f, 0x8b)) return { mime: "application/gzip", ext: "gz" };
  if (starts(0x00, 0x61, 0x73, 0x6d)) return { mime: "application/wasm", ext: "wasm" };
  if (starts(0x49, 0x44, 0x33) || starts(0xff, 0xfb)) return { mime: "audio/mpeg", ext: "mp3" };
  if (starts(0x4f, 0x67, 0x67, 0x53)) return { mime: "audio/ogg", ext: "ogg" };
  if (starts(0x77, 0x4f, 0x46, 0x32)) return { mime: "font/woff2", ext: "woff2" };
  if (starts(0x77, 0x4f, 0x46, 0x46)) return { mime: "font/woff", ext: "woff" };
  if (starts(0x42, 0x4d)) return { mime: "image/bmp", ext: "bmp" };
  if (starts(0x00, 0x00, 0x01, 0x00)) return { mime: "image/x-icon", ext: "ico" };
  const head = new TextDecoder().decode(b.subarray(0, 256)).trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return { mime: "image/svg+xml", ext: "svg" };
  return null;
}

/* ---------- URL encoding ---------- */

export type UrlMode = "component" | "uri" | "form";

export function urlEncode(s: string, mode: UrlMode): string {
  if (mode === "uri") return encodeURI(s);
  if (mode === "form") return new URLSearchParams([["", s]]).toString().slice(1);
  return encodeURIComponent(s);
}

export function urlDecode(s: string, mode: UrlMode): { text: string; error?: string } {
  const src = mode === "form" ? s.replace(/\+/g, " ") : s;
  try {
    return { text: mode === "uri" ? decodeURI(src) : decodeURIComponent(src) };
  } catch {
    // Decode valid sequences one by one and report the first broken one.
    let first = -1;
    const text = src.replace(/(%[0-9A-Fa-f]{2})+|%/g, (m, _g, off: number) => {
      try {
        return decodeURIComponent(m);
      } catch {
        if (first < 0) first = off;
        return m;
      }
    });
    return {
      text,
      error: `The sequence at position ${first + 1} (“${src.slice(first, first + 9)}”) isn't valid percent-encoding: “%” must be followed by two hex digits forming valid UTF-8. It was left as it was.`,
    };
  }
}

export interface UrlPart {
  part: string;
  raw: string;
  decoded: string;
}

export function urlParts(input: string): { parts?: UrlPart[]; error?: string; assumed?: boolean } {
  let s = input.trim();
  let assumed = false;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) {
    s = "https://" + s.replace(/^\/\//, "");
    assumed = true;
  }
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return { error: "This doesn't look like a URL. Include the host, for example https://example.com/path?x=1." };
  }
  const dec = (x: string) => urlDecode(x, "component").text;
  const parts: UrlPart[] = [{ part: "Scheme", raw: u.protocol.replace(/:$/, ""), decoded: u.protocol.replace(/:$/, "") }];
  if (u.username) parts.push({ part: "Username", raw: u.username, decoded: dec(u.username) });
  if (u.password) parts.push({ part: "Password", raw: "•••", decoded: "(hidden)" });
  parts.push({ part: "Host", raw: u.hostname, decoded: u.hostname });
  parts.push({ part: "Port", raw: u.port, decoded: u.port || `(default${u.protocol === "https:" ? ": 443" : u.protocol === "http:" ? ": 80" : ""})` });
  parts.push({ part: "Path", raw: u.pathname, decoded: dec(u.pathname) });
  const segs = u.pathname.split("/").filter(Boolean);
  segs.forEach((seg, i) => parts.push({ part: `  Segment ${i + 1}`, raw: seg, decoded: dec(seg) }));
  if (u.search) {
    parts.push({ part: "Query", raw: u.search.slice(1), decoded: dec(u.search.slice(1).replace(/\+/g, " ")) });
    for (const pair of u.search.slice(1).split("&")) {
      if (!pair) continue;
      const [k, ...rest] = pair.split("=");
      const v = rest.join("=");
      parts.push({ part: `  ${urlDecode(k, "form").text}`, raw: v, decoded: urlDecode(v, "form").text });
    }
  }
  if (u.hash) parts.push({ part: "Fragment", raw: u.hash.slice(1), decoded: dec(u.hash.slice(1)) });
  return { parts, assumed };
}

/* ---------- Unicode ---------- */

export type CodeFormat = "uplus" | "dec" | "hex" | "utf8" | "js" | "es6" | "css" | "html-dec" | "html-hex" | "html-named" | "python";

const hex = (n: number, w = 4) => n.toString(16).toUpperCase().padStart(w, "0");

export function charCode(ch: string, f: CodeFormat): string {
  const cp = ch.codePointAt(0)!;
  switch (f) {
    case "uplus":
      return "U+" + hex(cp);
    case "dec":
      return String(cp);
    case "hex":
      return "0x" + hex(cp, 2);
    case "utf8":
      return Array.from(utf8Encode(ch), (b) => hex(b, 2)).join(" ");
    case "js":
      return Array.from({ length: ch.length }, (_, i) => "\\u" + hex(ch.charCodeAt(i))).join("");
    case "es6":
      return cp > 0xffff ? `\\u{${hex(cp, 1)}}` : "\\u" + hex(cp);
    case "css":
      return "\\" + hex(cp, 1) + " ";
    case "html-dec":
      return `&#${cp};`;
    case "html-hex":
      return `&#x${hex(cp, 1)};`;
    case "html-named":
      return CHAR_TO_NAMED[ch] ? `&${CHAR_TO_NAMED[ch]};` : `&#x${hex(cp, 1)};`;
    case "python":
      return cp > 0xffff ? "\\U" + hex(cp, 8) : cp > 0xff ? "\\u" + hex(cp) : "\\x" + hex(cp, 2).toLowerCase();
  }
}

const LIST_FORMATS = new Set<CodeFormat>(["uplus", "dec", "hex", "utf8"]);

export function textToCodes(text: string, f: CodeFormat, o: { sep: string; onlyNonAscii: boolean }): string {
  const chars = Array.from(text);
  if (LIST_FORMATS.has(f)) return chars.map((c) => charCode(c, f)).join(o.sep);
  return chars
    .map((c) => {
      const cp = c.codePointAt(0)!;
      if (o.onlyNonAscii && cp < 128 && !(f.startsWith("html") && /[<>&"]/.test(c))) return c;
      if (f === "css" && o.onlyNonAscii) return charCode(c, f);
      return charCode(c, f);
    })
    .join("");
}

/** Convert codes or escapes back to text. Detects U+XXXX, \uXXXX, \u{…}, \UXXXXXXXX, \xHH, &#…;, &name;, 0xHH and decimal lists. */
export function codesToText(input: string): { text: string; detected: string; error?: string } {
  const s = input.trim();
  if (!s) return { text: "", detected: "" };
  const fromCp = (cp: number): string => {
    if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) throw new RangeError(`${cp} is outside the Unicode range (0 to 10FFFF hex).`);
    return String.fromCodePoint(cp);
  };
  try {
    if (/^(\d+)([\s,;]+\d+)*$/.test(s)) return { text: s.split(/[\s,;]+/).map((x) => fromCp(Number(x))).join(""), detected: "decimal code points" };
    if (/^(U\+[0-9A-Fa-f]{1,6})([\s,;]+U\+[0-9A-Fa-f]{1,6})*$/i.test(s)) return { text: s.split(/[\s,;]+/).map((x) => fromCp(parseInt(x.slice(2), 16))).join(""), detected: "U+ code points" };
    if (/^(0x[0-9A-Fa-f]{1,6})([\s,;]+0x[0-9A-Fa-f]{1,6})*$/i.test(s)) return { text: s.split(/[\s,;]+/).map((x) => fromCp(parseInt(x.slice(2), 16))).join(""), detected: "hex code points" };
    if (/^([0-9A-Fa-f]{2})(\s+[0-9A-Fa-f]{2})+$/.test(s)) {
      const bytes = new Uint8Array(s.split(/\s+/).map((x) => parseInt(x, 16)));
      const r = utf8Decode(bytes);
      return { text: r.text, detected: r.valid ? "UTF-8 bytes (hex)" : "UTF-8 bytes (hex, some invalid)" };
    }
    const found = new Set<string>();
    let text = s
      .replace(/\\u\{([0-9A-Fa-f]{1,6})\}/g, (_, h: string) => (found.add("\\u{…}"), fromCp(parseInt(h, 16))))
      .replace(/\\U([0-9A-Fa-f]{8})/g, (_, h: string) => (found.add("\\U"), fromCp(parseInt(h, 16))))
      .replace(/\\u([0-9A-Fa-f]{4})/g, (_, h: string) => (found.add("\\u"), String.fromCharCode(parseInt(h, 16))))
      .replace(/\\x([0-9A-Fa-f]{2})/g, (_, h: string) => (found.add("\\x"), String.fromCharCode(parseInt(h, 16))))
      .replace(/U\+([0-9A-Fa-f]{4,6})/g, (_, h: string) => (found.add("U+"), fromCp(parseInt(h, 16))));
    if (/&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i.test(text)) {
      found.add("HTML entities");
      text = decodeEntities(text);
    }
    if (/\\[0-9A-Fa-f]{1,6}\s?/.test(text) && !found.size) {
      found.add("CSS escapes");
      text = text.replace(/\\([0-9A-Fa-f]{1,6})\s?/g, (_, h: string) => fromCp(parseInt(h, 16)));
    }
    if (!found.size) return { text: s, detected: "", error: "No codes or escape sequences found. Try U+0041, \\u0041, &#65;, &eacute; or a list of numbers such as 72 105." };
    return { text, detected: [...found].join(", ") };
  } catch (e) {
    return { text: "", detected: "", error: e instanceof Error ? e.message : "Invalid code." };
  }
}

export interface CharInfo {
  char: string;
  cp: string;
  dec: number;
  utf8: string;
  utf16: string;
  html: string;
  js: string;
}

export function charTable(text: string, limit = 500): CharInfo[] {
  return Array.from(text)
    .slice(0, limit)
    .map((c) => ({
      char: c,
      cp: charCode(c, "uplus"),
      dec: c.codePointAt(0)!,
      utf8: charCode(c, "utf8"),
      utf16: Array.from({ length: c.length }, (_, i) => hex(c.charCodeAt(i))).join(" "),
      html: charCode(c, "html-named"),
      js: charCode(c, "es6"),
    }));
}
