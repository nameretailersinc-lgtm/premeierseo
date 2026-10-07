/*
 * Color parsing and conversion (CSS Color Module Level 4 syntaxes for sRGB):
 * hex (#rgb, #rgba, #rrggbb, #rrggbbaa), rgb()/rgba(), hsl()/hsla(), hwb(), named colors,
 * plus HSV and naive CMYK (no ICC profile). WCAG 2.x relative luminance and contrast ratio.
 */

export interface RGBA {
  r: number; // 0–255 (may be fractional internally)
  g: number;
  b: number;
  a: number; // 0–1
}

export const NAMED_COLORS: Record<string, string> = {
  aliceblue: "f0f8ff", antiquewhite: "faebd7", aqua: "00ffff", aquamarine: "7fffd4", azure: "f0ffff", beige: "f5f5dc", bisque: "ffe4c4",
  black: "000000", blanchedalmond: "ffebcd", blue: "0000ff", blueviolet: "8a2be2", brown: "a52a2a", burlywood: "deb887", cadetblue: "5f9ea0",
  chartreuse: "7fff00", chocolate: "d2691e", coral: "ff7f50", cornflowerblue: "6495ed", cornsilk: "fff8dc", crimson: "dc143c", cyan: "00ffff",
  darkblue: "00008b", darkcyan: "008b8b", darkgoldenrod: "b8860b", darkgray: "a9a9a9", darkgreen: "006400", darkgrey: "a9a9a9", darkkhaki: "bdb76b",
  darkmagenta: "8b008b", darkolivegreen: "556b2f", darkorange: "ff8c00", darkorchid: "9932cc", darkred: "8b0000", darksalmon: "e9967a",
  darkseagreen: "8fbc8f", darkslateblue: "483d8b", darkslategray: "2f4f4f", darkslategrey: "2f4f4f", darkturquoise: "00ced1", darkviolet: "9400d3",
  deeppink: "ff1493", deepskyblue: "00bfff", dimgray: "696969", dimgrey: "696969", dodgerblue: "1e90ff", firebrick: "b22222", floralwhite: "fffaf0",
  forestgreen: "228b22", fuchsia: "ff00ff", gainsboro: "dcdcdc", ghostwhite: "f8f8ff", gold: "ffd700", goldenrod: "daa520", gray: "808080",
  green: "008000", greenyellow: "adff2f", grey: "808080", honeydew: "f0fff0", hotpink: "ff69b4", indianred: "cd5c5c", indigo: "4b0082",
  ivory: "fffff0", khaki: "f0e68c", lavender: "e6e6fa", lavenderblush: "fff0f5", lawngreen: "7cfc00", lemonchiffon: "fffacd", lightblue: "add8e6",
  lightcoral: "f08080", lightcyan: "e0ffff", lightgoldenrodyellow: "fafad2", lightgray: "d3d3d3", lightgreen: "90ee90", lightgrey: "d3d3d3",
  lightpink: "ffb6c1", lightsalmon: "ffa07a", lightseagreen: "20b2aa", lightskyblue: "87cefa", lightslategray: "778899", lightslategrey: "778899",
  lightsteelblue: "b0c4de", lightyellow: "ffffe0", lime: "00ff00", limegreen: "32cd32", linen: "faf0e6", magenta: "ff00ff", maroon: "800000",
  mediumaquamarine: "66cdaa", mediumblue: "0000cd", mediumorchid: "ba55d3", mediumpurple: "9370db", mediumseagreen: "3cb371",
  mediumslateblue: "7b68ee", mediumspringgreen: "00fa9a", mediumturquoise: "48d1cc", mediumvioletred: "c71585", midnightblue: "191970",
  mintcream: "f5fffa", mistyrose: "ffe4e1", moccasin: "ffe4b5", navajowhite: "ffdead", navy: "000080", oldlace: "fdf5e6", olive: "808000",
  olivedrab: "6b8e23", orange: "ffa500", orangered: "ff4500", orchid: "da70d6", palegoldenrod: "eee8aa", palegreen: "98fb98",
  paleturquoise: "afeeee", palevioletred: "db7093", papayawhip: "ffefd5", peachpuff: "ffdab9", peru: "cd853f", pink: "ffc0cb", plum: "dda0dd",
  powderblue: "b0e0e6", purple: "800080", rebeccapurple: "663399", red: "ff0000", rosybrown: "bc8f8f", royalblue: "4169e1", saddlebrown: "8b4513",
  salmon: "fa8072", sandybrown: "f4a460", seagreen: "2e8b57", seashell: "fff5ee", sienna: "a0522d", silver: "c0c0c0", skyblue: "87ceeb",
  slateblue: "6a5acd", slategray: "708090", slategrey: "708090", snow: "fffafa", springgreen: "00ff7f", steelblue: "4682b4", tan: "d2b48c",
  teal: "008080", thistle: "d8bfd8", tomato: "ff6347", turquoise: "40e0d0", violet: "ee82ee", wheat: "f5deb3", white: "ffffff",
  whitesmoke: "f5f5f5", yellow: "ffff00", yellowgreen: "9acd32",
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, d = 0) => {
  const p = 10 ** d;
  return Math.round(v * p) / p;
};

/** A number, or a percentage of `pctScale` ("50%" of 255 = 127.5). */
function num(s: string, pctScale: number): number {
  const t = s.trim();
  const v = parseFloat(t);
  if (!Number.isFinite(v)) throw new Error(`“${t}” isn't a number.`);
  return t.endsWith("%") ? (v / 100) * pctScale : v;
}

function hue(s: string): number {
  const t = s.trim().toLowerCase();
  const v = parseFloat(t);
  if (!Number.isFinite(v)) throw new Error(`“${s}” isn't a hue.`);
  if (t.endsWith("turn")) return v * 360;
  if (t.endsWith("grad")) return v * 0.9;
  if (t.endsWith("rad")) return (v * 180) / Math.PI;
  return v;
}

function fnArgs(body: string): { parts: string[]; alpha?: string } {
  const b = body.trim();
  if (b.includes(",")) {
    const p = b.split(",").map((x) => x.trim());
    return { parts: p.slice(0, 3), alpha: p[3] };
  }
  const [main, alpha] = b.split("/").map((x) => x.trim());
  return { parts: main.split(/\s+/), alpha };
}

function alphaOf(s: string | undefined): number {
  if (s === undefined || s === "") return 1;
  const t = s.trim();
  return clamp(t.endsWith("%") ? parseFloat(t) / 100 : parseFloat(t), 0, 1);
}

export function parseColor(input: string): { color?: RGBA; error?: string; format?: string } {
  const s = input.trim().toLowerCase().replace(/;$/, "");
  if (!s) return {};
  try {
    if (NAMED_COLORS[s]) return { color: hexToRgba(NAMED_COLORS[s]), format: "name" };
    if (s === "transparent") return { color: { r: 0, g: 0, b: 0, a: 0 }, format: "name" };
    const hx = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
    if (hx) return { color: hexToRgba(hx[1]), format: "hex" };
    const fn = /^([a-z]+)\((.*)\)$/.exec(s);
    if (fn) {
      const [, name, body] = fn;
      const { parts, alpha } = fnArgs(body);
      if (parts.length !== 3 && name !== "cmyk" && name !== "device-cmyk") throw new Error(`${name}() needs three values.`);
      if (name === "rgb" || name === "rgba") {
        const [r, g, b] = parts.map((p) => clamp(num(p, 255), 0, 255));
        return { color: { r, g, b, a: alphaOf(alpha) }, format: "rgb" };
      }
      if (name === "hsl" || name === "hsla") {
        const h = hue(parts[0]);
        const sat = clamp(parseFloat(parts[1]), 0, 100);
        const l = clamp(parseFloat(parts[2]), 0, 100);
        return { color: { ...hslToRgb(h, sat, l), a: alphaOf(alpha) }, format: "hsl" };
      }
      if (name === "hwb") {
        const h = hue(parts[0]);
        return { color: { ...hwbToRgb(h, parseFloat(parts[1]), parseFloat(parts[2])), a: alphaOf(alpha) }, format: "hwb" };
      }
      if (name === "hsv" || name === "hsb") {
        return { color: { ...hsvToRgb(hue(parts[0]), parseFloat(parts[1]), parseFloat(parts[2])), a: alphaOf(alpha) }, format: "hsv" };
      }
      if (name === "cmyk" || name === "device-cmyk") {
        const raw = body.split(/[\s,/]+/).filter(Boolean);
        // Plain numbers are percentages, unless every value is between 0 and 1 (fractions).
        const fractions = raw.every((p) => !p.endsWith("%") && parseFloat(p) <= 1);
        const all = raw.map((p) => (fractions ? parseFloat(p) * 100 : parseFloat(p)));
        if (all.some((v) => !Number.isFinite(v))) throw new Error("cmyk() values must be numbers or percentages.");
        if (all.length < 4) throw new Error("cmyk() needs four values: cyan, magenta, yellow and black.");
        return { color: { ...cmykToRgb(all[0], all[1], all[2], all[3]), a: 1 }, format: "cmyk" };
      }
      throw new Error(`${name}() isn't a supported color function. Use HEX, rgb(), hsl(), hwb(), hsv() or cmyk().`);
    }
    // Bare "255, 87, 34" or "255 87 34" → RGB
    const bare = /^(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})$/.exec(s);
    if (bare) {
      const [r, g, b] = bare.slice(1).map(Number);
      if (r > 255 || g > 255 || b > 255) throw new Error("RGB values run from 0 to 255.");
      return { color: { r, g, b, a: 1 }, format: "rgb" };
    }
    throw new Error("Enter a color such as #ff5722, rgb(255 87 34), hsl(14 100% 57%) or a CSS name like tomato.");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "That color couldn't be read." };
  }
}

export function hexToRgba(h: string): RGBA {
  let x = h.replace(/^#/, "");
  if (x.length <= 4) x = x.split("").map((c) => c + c).join("");
  const n = (i: number) => parseInt(x.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: x.length === 8 ? round(n(6) / 255, 3) : 1 };
}

const h2 = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");

export function toHex(c: RGBA, o: { upper?: boolean; alpha?: boolean } = {}): string {
  let s = "#" + h2(c.r) + h2(c.g) + h2(c.b);
  if (o.alpha || c.a < 1) s += h2(c.a * 255);
  return o.upper ? s.toUpperCase() : s;
}

/** #aabbcc → #abc when possible. */
export function shortHex(hex: string): string | null {
  const m = /^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3(?:([0-9a-f])\4)?$/i.exec(hex);
  return m ? `#${m[1]}${m[2]}${m[3]}${m[4] ?? ""}` : null;
}

export function rgbToHsl(c: RGBA): { h: number; s: number; l: number } {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hh = (((h % 360) + 360) % 360) / 60;
  const ss = s / 100;
  const ll = l / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = ll - c / 2;
  const [r, g, b] = hh < 1 ? [c, x, 0] : hh < 2 ? [x, c, 0] : hh < 3 ? [0, c, x] : hh < 4 ? [0, x, c] : hh < 5 ? [x, 0, c] : [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function rgbToHsv(c: RGBA): { h: number; s: number; v: number } {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const { h } = rgbToHsl(c);
  return { h, s: max ? (d / max) * 100 : 0, v: max * 100 };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const ss = s / 100;
  const vv = v / 100;
  const l = vv * (1 - ss / 2);
  const sl = l === 0 || l === 1 ? 0 : (vv - l) / Math.min(l, 1 - l);
  return hslToRgb(h, sl * 100, l * 100);
}

export function rgbToHwb(c: RGBA): { h: number; w: number; b: number } {
  const { h } = rgbToHsl(c);
  const w = Math.min(c.r, c.g, c.b) / 255;
  const bl = 1 - Math.max(c.r, c.g, c.b) / 255;
  return { h, w: w * 100, b: bl * 100 };
}

export function hwbToRgb(h: number, w: number, bl: number): { r: number; g: number; b: number } {
  let ww = w / 100;
  let bb = bl / 100;
  if (ww + bb >= 1) {
    const g = (ww / (ww + bb)) * 255;
    return { r: g, g, b: g };
  }
  const base = hslToRgb(h, 100, 50);
  const f = (v: number) => (v / 255) * (1 - ww - bb) * 255 + ww * 255;
  ww = clamp(ww, 0, 1);
  bb = clamp(bb, 0, 1);
  return { r: f(base.r), g: f(base.g), b: f(base.b) };
}

/** Naive CMYK (no color profile): the common formula used by design tools for screen previews. */
export function rgbToCmyk(c: RGBA): { c: number; m: number; y: number; k: number } {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  return { c: ((1 - r - k) / (1 - k)) * 100, m: ((1 - g - k) / (1 - k)) * 100, y: ((1 - b - k) / (1 - k)) * 100, k: k * 100 };
}

export function cmykToRgb(c: number, m: number, y: number, k: number): { r: number; g: number; b: number } {
  const kk = clamp(k, 0, 100) / 100;
  return { r: 255 * (1 - clamp(c, 0, 100) / 100) * (1 - kk), g: 255 * (1 - clamp(m, 0, 100) / 100) * (1 - kk), b: 255 * (1 - clamp(y, 0, 100) / 100) * (1 - kk) };
}

export function nameOf(c: RGBA): string | null {
  const hex = toHex({ ...c, a: 1 }).slice(1);
  if (c.a < 1) return null;
  for (const [n, v] of Object.entries(NAMED_COLORS)) if (v === hex) return n;
  return null;
}

/** Closest CSS named color (Euclidean distance in RGB). */
export function nearestName(c: RGBA): { name: string; exact: boolean } {
  let best = "";
  let bd = Infinity;
  for (const [n, v] of Object.entries(NAMED_COLORS)) {
    const x = hexToRgba(v);
    const d = (x.r - c.r) ** 2 + (x.g - c.g) ** 2 + (x.b - c.b) ** 2;
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return { name: best, exact: bd < 1 };
}

const fmtA = (a: number) => String(round(a, 2));

export interface Formats {
  hex: string;
  hex8: string;
  rgb: string;
  hsl: string;
  hwb: string;
  hsv: string;
  cmyk: string;
  name: string | null;
}

export function formats(c: RGBA): Formats {
  const r = Math.round(c.r);
  const g = Math.round(c.g);
  const b = Math.round(c.b);
  const hsl = rgbToHsl(c);
  const hwb = rgbToHwb(c);
  const hsv = rgbToHsv(c);
  const cmyk = rgbToCmyk(c);
  const a = c.a < 1 ? ` / ${fmtA(c.a)}` : "";
  const ac = c.a < 1 ? `, ${fmtA(c.a)}` : "";
  return {
    hex: toHex(c),
    hex8: toHex(c, { alpha: true }),
    rgb: c.a < 1 ? `rgba(${r}, ${g}, ${b}${ac})` : `rgb(${r}, ${g}, ${b})`,
    hsl: c.a < 1 ? `hsla(${round(hsl.h)}, ${round(hsl.s)}%, ${round(hsl.l)}%${ac})` : `hsl(${round(hsl.h)}, ${round(hsl.s)}%, ${round(hsl.l)}%)`,
    hwb: `hwb(${round(hwb.h)} ${round(hwb.w)}% ${round(hwb.b)}%${a})`,
    hsv: `hsv(${round(hsv.h)}, ${round(hsv.s)}%, ${round(hsv.v)}%)`,
    cmyk: `cmyk(${round(cmyk.c)}%, ${round(cmyk.m)}%, ${round(cmyk.y)}%, ${round(cmyk.k)}%)`,
    name: nameOf(c),
  };
}

/* ---------- WCAG ---------- */

export function luminance(c: RGBA): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

/** Composite a translucent color over an opaque background. */
export function over(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}

export function contrast(a: RGBA, b: RGBA): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function wcag(ratio: number) {
  return {
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
    ui: ratio >= 3,
  };
}

/** Tints (mixed with white) and shades (mixed with black) in 10% steps. */
export function tintsAndShades(c: RGBA, steps = 5): { tints: RGBA[]; shades: RGBA[] } {
  const mix = (x: RGBA, y: RGBA, t: number): RGBA => ({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t, a: 1 });
  const white = { r: 255, g: 255, b: 255, a: 1 };
  const black = { r: 0, g: 0, b: 0, a: 1 };
  return {
    tints: Array.from({ length: steps }, (_, i) => mix(c, white, (i + 1) / (steps + 1))),
    shades: Array.from({ length: steps }, (_, i) => mix(c, black, (i + 1) / (steps + 1))),
  };
}
