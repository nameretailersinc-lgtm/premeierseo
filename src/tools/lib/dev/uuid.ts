/*
 * UUIDs (RFC 9562). v4 from crypto.randomUUID / crypto.getRandomValues; v7 = 48-bit Unix
 * millisecond timestamp + random bits, with a 12-bit counter in rand_a so IDs generated in the
 * same millisecond still sort in creation order (RFC 9562 §6.2, method 1).
 */

function rand(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

function fmt(b: Uint8Array): string {
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function uuidV4(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = rand(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  return fmt(b);
}

let lastMs = -1;
let counter = 0;

export function uuidV7(now = Date.now()): string {
  let ms = now;
  if (ms <= lastMs) {
    counter++;
    if (counter > 0xfff) {
      // Counter exhausted within one millisecond: borrow the next millisecond (still monotonic).
      lastMs++;
      counter = 0;
    }
    ms = lastMs;
  } else {
    lastMs = ms;
    counter = rand(2)[0] & 0x7f; // random start leaves room to count upwards
  }
  const b = rand(16);
  const hi = Math.floor(ms / 2 ** 16);
  const lo = ms % 2 ** 16;
  b[0] = (hi >>> 24) & 255;
  b[1] = (hi >>> 16) & 255;
  b[2] = (hi >>> 8) & 255;
  b[3] = hi & 255;
  b[4] = (lo >>> 8) & 255;
  b[5] = lo & 255;
  b[6] = 0x70 | ((counter >>> 8) & 0x0f);
  b[7] = counter & 255;
  b[8] = (b[8] & 0x3f) | 0x80;
  return fmt(b);
}

export interface UuidFormat {
  upper: boolean;
  hyphens: boolean;
  braces: boolean;
  quotes: "none" | "double" | "single";
}

export function formatUuid(u: string, f: UuidFormat): string {
  let s = f.hyphens ? u : u.replace(/-/g, "");
  if (f.upper) s = s.toUpperCase();
  if (f.braces) s = `{${s}}`;
  if (f.quotes === "double") s = `"${s}"`;
  if (f.quotes === "single") s = `'${s}'`;
  return s;
}

export interface UuidInfo {
  valid: boolean;
  canonical?: string;
  version?: number;
  variant?: string;
  time?: Date;
  note?: string;
  error?: string;
}

export function inspectUuid(input: string): UuidInfo {
  const t = input.trim().replace(/^urn:uuid:/i, "").replace(/^[{"']+|[}"']+$/g, "");
  const hex = t.replace(/-/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(hex) || (t.includes("-") && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)))
    return { valid: false, error: "Not a UUID. A UUID has 32 hex digits, usually written 8-4-4-4-12, for example 123e4567-e89b-12d3-a456-426614174000." };
  const h = hex.toLowerCase();
  const canonical = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  if (/^0+$/.test(h)) return { valid: true, canonical, note: "This is the nil UUID (all zeros), a placeholder meaning “no value”." };
  if (/^f+$/.test(h)) return { valid: true, canonical, note: "This is the max UUID (all ones), defined in RFC 9562 as a sentinel value." };
  const version = parseInt(h[12], 16);
  const v = parseInt(h[16], 16);
  const variant = v < 8 ? "NCS (reserved, pre-1990)" : v < 12 ? "RFC 9562 / RFC 4122" : v < 14 ? "Microsoft (reserved)" : "Future (reserved)";
  const info: UuidInfo = { valid: true, canonical, version, variant };
  if (version === 7) info.time = new Date(parseInt(h.slice(0, 12), 16));
  if (version === 1 || version === 6) {
    const ts = version === 1 ? h.slice(13, 16) + h.slice(8, 12) + h.slice(0, 8) : h.slice(0, 12) + h.slice(13, 16);
    // 100-ns intervals since 1582-10-15
    const ticks = BigInt("0x" + ts);
    const ms = Number(ticks / BigInt(10000)) - 12219292800000;
    info.time = new Date(ms);
  }
  if (variant !== "RFC 9562 / RFC 4122") info.note = "The variant bits don't follow RFC 9562, so the version number may not mean anything.";
  else if (version < 1 || version > 8) info.note = `Version ${version} isn't defined in RFC 9562.`;
  return info;
}
