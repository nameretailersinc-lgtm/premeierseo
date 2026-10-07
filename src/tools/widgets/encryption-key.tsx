"use client";

import { useId, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, CopyButton, Field, Panel, Segmented, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { encodeBytes, gcmDecrypt, gcmEncrypt, generateKeySet, toJwk, type KeyFormat, type KeySet } from "../lib/text/keys";

/*
 * Encryption key generator. Key, IV and salt bytes come from crypto.getRandomValues; the optional
 * AES-GCM test uses crypto.subtle. Nothing is persisted or sent anywhere: the key lives only in
 * this component's state and disappears when the page is closed. Only the chosen length and
 * format are remembered.
 */

type Bits = "128" | "192" | "256";

function Row({ label, value, help }: { label: string; value: string; help: string }) {
  const id = useId();
  return (
    <div className="grid gap-1 border-b border-line px-3 py-3 last:border-b-0 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span id={id} className="text-sm font-semibold">
          {label}
        </span>
        <CopyButton text={value} disabled={!value} />
      </div>
      <output aria-labelledby={id} className="mono block min-h-6 text-base break-all">
        {value || <span className="text-ink-3">—</span>}
      </output>
      <p className="text-sm text-ink-3">{help}</p>
    </div>
  );
}

export default function EncryptionKey({ toolId }: WidgetProps) {
  const id = useId();
  const { used, announce, completed, error: trackError } = useTool();
  const [o, setO] = usePersistentOptions(toolId, { bits: "256" as Bits, format: "hex" as KeyFormat });
  const [ks, setKs] = useState<KeySet | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [plain, setPlain] = useState("Meet at the north entrance at 10:00.");
  const [cipher, setCipher] = useState("");
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [testErr, setTestErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = () => {
    used("generate");
    try {
      setKs(generateKeySet(Number(o.bits) as 128 | 192 | 256));
      setErr(null);
      setCipher("");
      setDecrypted(null);
      setTestErr(null);
      announce(`New ${o.bits}-bit key, IV and salt generated`);
      completed("generate", { bits: Number(o.bits) });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "This browser can't generate secure random numbers.");
      trackError("NO_CRYPTO", "generate");
    }
  };

  const keyMatches = ks && ks.key.length * 8 === Number(o.bits);
  const fmt = (b?: Uint8Array) => (b ? encodeBytes(b, o.format) : "");

  const encrypt = async () => {
    if (!ks) return;
    setBusy(true);
    setTestErr(null);
    setDecrypted(null);
    try {
      const c = await gcmEncrypt(ks.key, ks.ivGcm, plain);
      setCipher(c);
      announce("Encrypted with AES-GCM");
      completed("encrypt");
    } catch (e) {
      setTestErr(e instanceof Error ? e.message : "Encryption failed.");
      trackError("ENCRYPT_FAILED", "test");
    } finally {
      setBusy(false);
    }
  };
  const decrypt = async () => {
    if (!ks) return;
    setBusy(true);
    setTestErr(null);
    try {
      const p = await gcmDecrypt(ks.key, ks.ivGcm, cipher);
      setDecrypted(p);
      announce("Decrypted successfully");
    } catch (e) {
      setDecrypted(null);
      setTestErr(e instanceof Error ? e.message : "Decryption failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="panel flex flex-wrap items-end gap-x-6 gap-y-3 p-3 sm:p-4">
        <Segmented
          legend="Key length"
          value={o.bits}
          onChange={(v) => setO({ ...o, bits: v })}
          options={[
            { value: "128", label: "128-bit" },
            { value: "192", label: "192-bit" },
            { value: "256", label: "256-bit" },
          ]}
        />
        <Segmented
          legend="Output format"
          value={o.format}
          onChange={(v) => setO({ ...o, format: v })}
          options={[
            { value: "hex", label: "Hex" },
            { value: "base64", label: "Base64" },
            { value: "base64url", label: "Base64url" },
          ]}
        />
        <Button variant="primary" size="lg" icon="key" onClick={generate}>
          {ks ? "Generate new key" : "Generate key"}
        </Button>
      </div>
      {err && (
        <div role="alert">
          <Alert tone="danger">{err}</Alert>
        </div>
      )}
      {ks && !keyMatches && <Alert tone="warning">The key below is {ks.key.length * 8}-bit. Press <strong>Generate new key</strong> for a {o.bits}-bit key.</Alert>}

      <Panel tone="accent" title="Your key material" actions={ks && <CopyButton text={() => toJwk(ks.key)} label="Copy as JWK" />}>
        <div className="min-h-64">
          <Row label={`AES key (${ks ? ks.key.length * 8 : o.bits} bits, ${ks ? ks.key.length : Number(o.bits) / 8} bytes)`} value={fmt(ks?.key)} help="The secret. Anyone with it can decrypt your data." />
          <Row label="IV / nonce for AES-GCM (96 bits, 12 bytes)" value={fmt(ks?.ivGcm)} help="Not secret, but never reuse it with the same key. Generate a fresh one for every message." />
          <Row label="IV for AES-CBC or CTR (128 bits, 16 bytes)" value={fmt(ks?.ivBlock)} help="One AES block. CBC needs an unpredictable IV per message." />
          <Row label="Salt for key derivation (128 bits, 16 bytes)" value={fmt(ks?.salt)} help="For PBKDF2, scrypt or Argon2 when a key is derived from a password. Store it with the result." />
        </div>
        {!ks && <p className="px-3 pb-3 text-sm text-ink-3 sm:px-4">Press <strong>Generate key</strong>. Keys are created in your browser and never sent anywhere.</p>}
      </Panel>

      <details className="panel p-3 sm:p-4">
        <summary className="cursor-pointer text-sm font-semibold">Test the key: encrypt and decrypt with AES-GCM</summary>
        <div className="mt-3 grid gap-3">
          <p className="text-sm text-ink-3">
            Encrypts the text with the key and the 12-byte IV above using the browser&apos;s AES-GCM implementation. This is a check that the key works, not a
            file encryption service; for real data, use a vetted tool or library.
          </p>
          <Field label="Text to encrypt" htmlFor={`${id}-p`}>
            <textarea id={`${id}-p`} className="textarea" style={{ ["--ta-min" as string]: "5rem" }} value={plain} onChange={(e) => setPlain(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon="lock" disabled={!ks || busy} onClick={encrypt}>
              Encrypt
            </Button>
            <Button icon="key" disabled={!ks || !cipher || busy} onClick={decrypt}>
              Decrypt
            </Button>
          </div>
          <Field label="Ciphertext + authentication tag (Base64)" htmlFor={`${id}-c`} help="You can edit it to see that a single changed character makes decryption fail.">
            <textarea id={`${id}-c`} className="textarea mono" style={{ ["--ta-min" as string]: "5rem" }} value={cipher} spellCheck={false} onChange={(e) => setCipher(e.target.value)} />
          </Field>
          {!ks && <p className="text-sm text-ink-3">Generate a key first.</p>}
          {testErr && (
            <div role="alert">
              <Alert tone="danger">{testErr}</Alert>
            </div>
          )}
          {decrypted !== null && (
            <Alert tone="success" title="Decrypted text">
              {decrypted}
            </Alert>
          )}
        </div>
      </details>
    </div>
  );
}
