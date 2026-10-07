/*
 * QR payload builders (de-facto formats read by iOS/Android camera apps) and rendering helpers.
 * Encoding itself is done by qrcode-generator (ISO/IEC 18004) loaded on demand in the widget.
 */

export type QrKind = "url" | "text" | "wifi" | "email" | "phone" | "vcard";

/** Wi-Fi: WIFI:T:WPA;S:ssid;P:password;H:true;; — \ ; , : " are escaped with a backslash. */
const wifiEsc = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");

export function wifiPayload(o: { ssid: string; password: string; security: "WPA" | "WEP" | "nopass"; hidden: boolean }): string {
  const parts = [`T:${o.security}`, `S:${wifiEsc(o.ssid)}`];
  if (o.security !== "nopass") parts.push(`P:${wifiEsc(o.password)}`);
  if (o.hidden) parts.push("H:true");
  return `WIFI:${parts.join(";")};;`;
}

export function emailPayload(o: { to: string; subject: string; body: string }): string {
  const q: string[] = [];
  if (o.subject) q.push(`subject=${encodeURIComponent(o.subject)}`);
  if (o.body) q.push(`body=${encodeURIComponent(o.body)}`);
  return `mailto:${o.to.trim()}${q.length ? `?${q.join("&")}` : ""}`;
}

export function phonePayload(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** vCard 3.0 (RFC 2426). Text values escape \ , ; and newlines. */
const vEsc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");

export function vcardPayload(o: { first: string; last: string; org: string; title: string; phone: string; email: string; url: string }): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${vEsc(o.last)};${vEsc(o.first)};;;`, `FN:${vEsc([o.first, o.last].filter(Boolean).join(" "))}`];
  if (o.org) lines.push(`ORG:${vEsc(o.org)}`);
  if (o.title) lines.push(`TITLE:${vEsc(o.title)}`);
  if (o.phone) lines.push(`TEL;TYPE=CELL:${o.phone.trim()}`);
  if (o.email) lines.push(`EMAIL:${o.email.trim()}`);
  if (o.url) lines.push(`URL:${o.url.trim()}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/** Adds https:// when the user typed a bare domain. */
export function urlPayload(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
  return `https://${s}`;
}

/* ---------------- Colour contrast (WCAG 2 relative luminance) ---------------- */

function lum(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return NaN;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrastRatio(a: string, b: string): number {
  const la = lum(a);
  const lb = lum(b);
  if (!Number.isFinite(la) || !Number.isFinite(lb)) return NaN;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export const isLighter = (a: string, b: string) => lum(a) > lum(b);

/* ---------------- Rendering ---------------- */

export interface Matrix {
  size: number;
  dark: (r: number, c: number) => boolean;
}

/** SVG with one path; `margin` is the quiet zone in modules (the standard asks for 4). */
export function matrixToSvg(m: Matrix, opts: { margin: number; fg: string; bg: string; px: number }): string {
  const total = m.size + opts.margin * 2;
  let d = "";
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (m.dark(r, c)) d += `M${c + opts.margin} ${r + opts.margin}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.px}" height="${opts.px}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="${opts.bg}"/><path d="${d}" fill="${opts.fg}"/></svg>`;
}

/** Whole-pixel module size closest to the requested width, so the PNG stays sharp. */
export function pngScale(modules: number, margin: number, px: number): { scale: number; width: number } {
  const total = modules + margin * 2;
  const scale = Math.max(1, Math.round(px / total));
  return { scale, width: scale * total };
}
