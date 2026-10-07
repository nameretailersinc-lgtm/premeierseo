/*
 * Key material helpers for the encryption key generator. Random bytes come from
 * crypto.getRandomValues (via ./random); AES-GCM test encryption uses crypto.subtle.
 */
import { randomBytes } from "./random";

export type KeyFormat = "hex" | "base64" | "base64url";

export function toHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export function toBase64(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}

export const toBase64Url = (b: Uint8Array) => toBase64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function encodeBytes(b: Uint8Array, f: KeyFormat): string {
  return f === "hex" ? toHex(b) : f === "base64" ? toBase64(b) : toBase64Url(b);
}

/** Accepts hex, Base64 or Base64url and returns the bytes, or null if the text is none of these. */
export function decodeBytes(s: string): Uint8Array | null {
  const t = s.trim();
  if (!t) return null;
  if (/^(?:[0-9a-fA-F]{2})+$/.test(t)) return Uint8Array.from(t.match(/../g)!, (h) => parseInt(h, 16));
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(t)) return null;
  try {
    const b64 = t.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export interface KeySet {
  key: Uint8Array;
  /** 12 bytes: the size NIST SP 800-38D recommends for AES-GCM. */
  ivGcm: Uint8Array;
  /** 16 bytes: one AES block, for CBC/CTR. */
  ivBlock: Uint8Array;
  salt: Uint8Array;
}

export function generateKeySet(bits: 128 | 192 | 256): KeySet {
  return { key: randomBytes(bits / 8), ivGcm: randomBytes(12), ivBlock: randomBytes(16), salt: randomBytes(16) };
}

/** JSON Web Key (RFC 7517/7518) for a symmetric AES-GCM key. */
export function toJwk(key: Uint8Array): string {
  return JSON.stringify({ kty: "oct", k: toBase64Url(key), alg: `A${key.length * 8}GCM`, ext: true, key_ops: ["encrypt", "decrypt"] }, null, 2);
}

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error("Web Crypto encryption isn't available here. It needs a secure (https) page in a current browser.");
  return s;
}

async function importAes(key: Uint8Array): Promise<CryptoKey> {
  try {
    return await subtle().importKey("raw", key as BufferSource, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  } catch {
    throw new Error(
      key.length === 24
        ? "This browser's Web Crypto doesn't support 192-bit AES keys (Chrome and Edge only accept 128 and 256). The key itself is valid for other libraries; choose 128 or 256 bits to run the test here."
        : "The browser rejected this key.",
    );
  }
}

/** AES-GCM encrypt; returns Base64 of ciphertext followed by the 16-byte authentication tag. */
export async function gcmEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: string): Promise<string> {
  const k = await importAes(key);
  const ct = await subtle().encrypt({ name: "AES-GCM", iv: iv as BufferSource }, k, new TextEncoder().encode(plaintext));
  return toBase64(new Uint8Array(ct));
}

export async function gcmDecrypt(key: Uint8Array, iv: Uint8Array, ciphertext: string): Promise<string> {
  const bytes = decodeBytes(ciphertext);
  if (!bytes || bytes.length < 16) throw new Error("The ciphertext isn't valid Base64 or hex, or it's too short to contain the 16-byte authentication tag.");
  const k = await importAes(key);
  try {
    const pt = await subtle().decrypt({ name: "AES-GCM", iv: iv as BufferSource }, k, bytes as BufferSource);
    return new TextDecoder().decode(pt);
  } catch {
    throw new Error("Decryption failed: the key, the IV or the ciphertext doesn't match. AES-GCM refuses to return anything when the authentication tag doesn't verify.");
  }
}
