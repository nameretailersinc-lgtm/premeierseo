/*
 * Hashing. SHA-1/256/384/512 use Web Crypto (crypto.subtle). MD5 (RFC 1321) is implemented here
 * because Web Crypto doesn't offer it; it is for checksums only, not security.
 * HMAC (RFC 2104) uses crypto.subtle for SHA and the generic construction for MD5.
 */

export type Algo = "MD5" | "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
export const ALGOS: Algo[] = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512"];
export const HEX_LENGTH: Record<Algo, number> = { MD5: 32, "SHA-1": 40, "SHA-256": 64, "SHA-384": 96, "SHA-512": 128 };

/* ---------- MD5 (incremental) ---------- */

const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

export class MD5 {
  private h = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]);
  private buf = new Uint8Array(64);
  private bufLen = 0;
  private total = 0;
  private w = new Uint32Array(16);

  update(data: Uint8Array): this {
    let i = 0;
    this.total += data.length;
    if (this.bufLen) {
      const take = Math.min(64 - this.bufLen, data.length);
      this.buf.set(data.subarray(0, take), this.bufLen);
      this.bufLen += take;
      i = take;
      if (this.bufLen === 64) {
        this.block(this.buf, 0);
        this.bufLen = 0;
      }
    }
    for (; i + 64 <= data.length; i += 64) this.block(data, i);
    if (i < data.length) {
      this.buf.set(data.subarray(i), 0);
      this.bufLen = data.length - i;
    }
    return this;
  }

  digest(): Uint8Array {
    const bits = this.total * 8;
    const pad = new Uint8Array(this.bufLen < 56 ? 64 - this.bufLen : 128 - this.bufLen);
    pad[0] = 0x80;
    const len = new Uint8Array(8);
    const lo = bits >>> 0;
    const hi = Math.floor(bits / 2 ** 32) >>> 0;
    for (let k = 0; k < 4; k++) {
      len[k] = (lo >>> (8 * k)) & 255;
      len[k + 4] = (hi >>> (8 * k)) & 255;
    }
    const total = this.total;
    this.update(pad.subarray(0, pad.length - 8));
    this.update(len);
    this.total = total;
    const out = new Uint8Array(16);
    for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) out[k * 4 + j] = (this.h[k] >>> (8 * j)) & 255;
    return out;
  }

  private block(d: Uint8Array, o: number) {
    const w = this.w;
    for (let k = 0; k < 16; k++) w[k] = d[o + k * 4] | (d[o + k * 4 + 1] << 8) | (d[o + k * 4 + 2] << 16) | (d[o + k * 4 + 3] << 24);
    let a = this.h[0];
    let b = this.h[1];
    let c = this.h[2];
    let dd = this.h[3];
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & dd);
        g = i;
      } else if (i < 32) {
        f = (dd & b) | (~dd & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ dd;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~dd);
        g = (7 * i) % 16;
      }
      const tmp = dd;
      dd = c;
      c = b;
      const x = (a + f + K[i] + w[g]) | 0;
      b = (b + ((x << S[i]) | (x >>> (32 - S[i])))) | 0;
      a = tmp;
    }
    this.h[0] = (this.h[0] + a) | 0;
    this.h[1] = (this.h[1] + b) | 0;
    this.h[2] = (this.h[2] + c) | 0;
    this.h[3] = (this.h[3] + dd) | 0;
  }
}

export function md5(data: Uint8Array): Uint8Array {
  return new MD5().update(data).digest();
}

export function hmacMd5(key: Uint8Array, data: Uint8Array): Uint8Array {
  let k = key.length > 64 ? md5(key) : key;
  const kk = new Uint8Array(64);
  kk.set(k);
  k = kk;
  const ipad = k.map((b) => b ^ 0x36);
  const opad = k.map((b) => b ^ 0x5c);
  const inner = new MD5().update(ipad).update(data).digest();
  return new MD5().update(opad).update(inner).digest();
}

/* ---------- Web Crypto ---------- */

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error("This browser doesn't provide Web Crypto (crypto.subtle). SHA hashes need a secure (https) page in a current browser.");
  return s;
}

export async function digest(algo: Algo, data: Uint8Array): Promise<Uint8Array> {
  if (algo === "MD5") return md5(data);
  return new Uint8Array(await subtle().digest(algo, data as unknown as BufferSource));
}

export async function hmac(algo: Algo, key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  if (algo === "MD5") return hmacMd5(key, data);
  // Web Crypto rejects empty HMAC keys; an empty key is equivalent to one block of zero bytes (RFC 2104 §2).
  const raw = key.length ? key : new Uint8Array(algo === "SHA-384" || algo === "SHA-512" ? 128 : 64);
  const k = await subtle().importKey("raw", raw as unknown as BufferSource, { name: "HMAC", hash: algo }, false, ["sign"]);
  return new Uint8Array(await subtle().sign("HMAC", k, data as unknown as BufferSource));
}

/* ---------- Output and comparison ---------- */

export function toHexStr(b: Uint8Array, upper = false): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
  return upper ? s.toUpperCase() : s;
}

export function toBase64(b: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin);
}

/** Normalise a pasted checksum: hex (any case, spaces/colons allowed) or Base64. */
export function normalizeExpected(s: string): { hex?: string; error?: string } {
  const t = s.trim().replace(/^(md5|sha-?\d+)\s*[:=]\s*/i, "").split(/\s+/)[0] ?? "";
  if (!t) return {};
  const hexOnly = t.replace(/[:\-]/g, "");
  if (/^[0-9a-fA-F]+$/.test(hexOnly) && [32, 40, 64, 96, 128].includes(hexOnly.length)) return { hex: hexOnly.toLowerCase() };
  try {
    if (/^[A-Za-z0-9+/]+=*$/.test(t)) {
      const bin = atob(t);
      if ([16, 20, 32, 48, 64].includes(bin.length)) return { hex: Array.from(bin, (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("") };
    }
  } catch {
    /* fall through */
  }
  return { error: "That doesn't look like an MD5, SHA-1 or SHA-2 checksum. Paste the hex string (32, 40, 64, 96 or 128 characters) or its Base64 form." };
}
