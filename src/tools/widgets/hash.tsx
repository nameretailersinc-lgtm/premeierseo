"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Alert, Button, Checkbox, CopyButton, Field, Panel, Segmented, formatBytes, useDebounced, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { ALGOS, MD5, digest, hmac, normalizeExpected, toBase64, toHexStr, type Algo } from "../lib/dev/hash";

/*
 * Hash generator: MD5 (own implementation, RFC 1321) and SHA-1/256/384/512 (Web Crypto) of text
 * or a file, optional HMAC, and a checksum comparison. Nothing is uploaded; text and keys are
 * never stored.
 */

type OutFormat = "hex" | "HEX" | "base64";
type Results = Partial<Record<Algo, Uint8Array>>;

const FILE_LIMIT = 512 * 1024 * 1024;
const CHUNK = 4 * 1024 * 1024;

const NOTE: Record<Algo, string> = {
  MD5: "128-bit · checksums only, not for security",
  "SHA-1": "160-bit · broken for signatures, fine for Git-style IDs",
  "SHA-256": "256-bit · the usual choice",
  "SHA-384": "384-bit",
  "SHA-512": "512-bit",
};

function show(b: Uint8Array, f: OutFormat): string {
  return f === "base64" ? toBase64(b) : toHexStr(b, f === "HEX");
}

async function hashAll(data: Uint8Array, algos: Algo[], key: Uint8Array | null): Promise<Results> {
  const out: Results = {};
  await Promise.all(
    algos.map(async (a) => {
      out[a] = key ? await hmac(a, key, data) : await digest(a, data);
    }),
  );
  return out;
}

function ResultRows({ results, algos, format, expected }: { results: Results; algos: Algo[]; format: OutFormat; expected: string | null }) {
  return (
    <dl className="grid">
      {algos.map((a) => {
        const b = results[a];
        if (!b) return null;
        const value = show(b, format);
        const match = expected !== null && toHexStr(b) === expected;
        return (
          <div key={a} className={`grid gap-1 border-b border-line py-2 last:border-b-0 ${match ? "bg-success-subtle" : ""}`}>
            <dt className="flex flex-wrap items-baseline gap-x-2 px-1">
              <span className="font-semibold">{a}</span>
              <span className="text-xs text-ink-3">{NOTE[a]}</span>
              {match && <span className="text-sm font-semibold text-success">Matches the checksum</span>}
            </dt>
            <dd className="flex items-start gap-2 px-1">
              <code className="min-w-0 flex-1 font-mono text-sm break-all">{value}</code>
              <CopyButton text={value} variant="ghost" label="Copy" />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export default function HashTool({ toolId }: WidgetProps) {
  const id = useId();
  const { used, announce, completed, error: track } = useTool();
  const [o, setO] = usePersistentOptions(toolId, {
    mode: "text",
    format: "hex",
    md5: true,
    sha1: true,
    sha256: true,
    sha384: false,
    sha512: true,
    useHmac: false,
    lineEnd: "keep",
  });
  const algos = useMemo(
    () => ALGOS.filter((a) => ({ MD5: o.md5, "SHA-1": o.sha1, "SHA-256": o.sha256, "SHA-384": o.sha384, "SHA-512": o.sha512 })[a]),
    [o.md5, o.sha1, o.sha256, o.sha384, o.sha512],
  );

  // Text and HMAC keys are deliberately not persisted.
  const [text, setText] = useState("");
  const [key, setKey] = useState("");
  const [expectedRaw, setExpectedRaw] = useState("");
  const [textRes, setTextRes] = useState<Results | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileRes, setFileRes] = useState<Results | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const runId = useRef(0);

  const dText = useDebounced(text, text.length > 100_000 ? 350 : 120);
  const dKey = useDebounced(key, 150);
  const keyBytes = o.useHmac ? new TextEncoder().encode(dKey) : null;
  const keyStr = o.useHmac ? dKey : null;

  const textBytes = useMemo(() => {
    const t = o.lineEnd === "lf" ? dText.replace(/\r\n?/g, "\n") : o.lineEnd === "trim" ? dText.replace(/[\r\n]+$/, "") : dText;
    return new TextEncoder().encode(t);
  }, [dText, o.lineEnd]);

  /* text hashing (cheap: runs as you type) */
  useEffect(() => {
    if (o.mode !== "text") return;
    let alive = true;
    hashAll(textBytes, algos, keyStr === null ? null : new TextEncoder().encode(keyStr))
      .then((r) => {
        if (!alive) return;
        setTextRes(r);
        setErr(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "The hash couldn't be calculated in this browser.");
        track("HASH_FAILED", "process");
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textBytes, algos, keyStr, o.mode]);

  /* file hashing (explicit, with progress) */
  const hashFile = async (f: File) => {
    const id = ++runId.current;
    setFile(f);
    setFileRes(null);
    setErr(null);
    setProgress(0);
    try {
      const k = keyBytes;
      const res: Results = {};
      // MD5 (and HMAC-MD5's inner hash) streams in chunks so large files show progress.
      if (algos.includes("MD5")) {
        let block: Uint8Array = k ?? new Uint8Array(0);
        if (block.length > 64) block = new MD5().update(block).digest();
        const kk = new Uint8Array(64);
        kk.set(block);
        const inner = new MD5();
        if (k) inner.update(kk.map((b) => b ^ 0x36));
        for (let pos = 0; pos < f.size; pos += CHUNK) {
          if (runId.current !== id) return;
          inner.update(new Uint8Array(await f.slice(pos, pos + CHUNK).arrayBuffer()));
          setProgress(Math.min(0.9, (pos + CHUNK) / Math.max(1, f.size)) * (algos.length > 1 ? 0.6 : 1));
        }
        const d = inner.digest();
        res.MD5 = k ? new MD5().update(kk.map((b) => b ^ 0x5c)).update(d).digest() : d;
      }
      const sha = algos.filter((a) => a !== "MD5");
      if (sha.length) {
        setProgress(algos.includes("MD5") ? 0.6 : 0.1);
        const buf = new Uint8Array(await f.arrayBuffer());
        if (runId.current !== id) return;
        Object.assign(res, await hashAll(buf, sha, k));
      }
      if (runId.current !== id) return;
      setFileRes(res);
      setProgress(null);
      announce(`Hashes of ${f.name} ready`);
      completed("hash_file");
    } catch (e) {
      if (runId.current !== id) return;
      setProgress(null);
      setErr(
        e instanceof RangeError || (e instanceof Error && /memory|allocation/i.test(e.message))
          ? "The browser ran out of memory reading this file. Try a smaller file or a desktop browser."
          : e instanceof Error
            ? e.message
            : "The file couldn't be read.",
      );
      track("HASH_FAILED", "process");
    }
  };

  // Re-hash the current file when the algorithm list or HMAC key changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-run the async file hash for new settings
    if (o.mode === "file" && file) void hashFile(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algos, keyStr]);

  const expected = useMemo(() => normalizeExpected(expectedRaw), [expectedRaw]);
  const results = o.mode === "text" ? textRes : fileRes;
  const matchAlgo = results && expected.hex ? algos.find((a) => results[a] && toHexStr(results[a]!) === expected.hex) : undefined;
  const lengthAlgo = expected.hex ? (Object.entries({ 32: "MD5", 40: "SHA-1", 64: "SHA-256", 96: "SHA-384", 128: "SHA-512" }).find(([n]) => Number(n) === expected.hex!.length)?.[1] as Algo | undefined) : undefined;

  useEffect(() => {
    if (!expected.hex || !results) return;
    announce(matchAlgo ? `Match: the ${matchAlgo} hash is identical` : "No match");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchAlgo, expected.hex, results]);

  const check = (k: keyof typeof o, v: boolean) => setO({ ...o, [k]: v });

  return (
    <div className="grid gap-4">
      <div className="panel p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Segmented
            legend="Hash"
            value={o.mode as "text" | "file"}
            onChange={(v) => setO({ ...o, mode: v })}
            options={[
              { value: "text", label: "Text" },
              { value: "file", label: "File" },
            ]}
          />
          <fieldset>
            <legend className="field-label">Algorithms</legend>
            <div className="flex flex-wrap gap-x-4">
              <Checkbox checked={o.md5} onChange={(v) => check("md5", v)} label="MD5" />
              <Checkbox checked={o.sha1} onChange={(v) => check("sha1", v)} label="SHA-1" />
              <Checkbox checked={o.sha256} onChange={(v) => check("sha256", v)} label="SHA-256" />
              <Checkbox checked={o.sha384} onChange={(v) => check("sha384", v)} label="SHA-384" />
              <Checkbox checked={o.sha512} onChange={(v) => check("sha512", v)} label="SHA-512" />
            </div>
          </fieldset>
          <Field label="Output" htmlFor={`${id}-f`} className="w-44">
            <select id={`${id}-f`} className="select" value={o.format} onChange={(e) => setO({ ...o, format: e.target.value })}>
              <option value="hex">hex (lower case)</option>
              <option value="HEX">HEX (upper case)</option>
              <option value="base64">Base64</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          as="div"
          title={o.mode === "text" ? <label htmlFor={`${id}-t`}>Text to hash</label> : <span>File to hash</span>}
          actions={
            o.mode === "text" ? (
              <>
                <Button
                  variant="ghost"
                  icon="sparkles"
                  onClick={() => {
                    setText("hello world");
                    used("example");
                  }}
                >
                  Example
                </Button>
                <Button variant="ghost" icon="trash" disabled={!text} onClick={() => setText("")}>
                  Clear
                </Button>
              </>
            ) : undefined
          }
          footer={o.mode === "text" ? <span>{formatBytes(textBytes.length)} of UTF-8</span> : undefined}
        >
          <div className="grid gap-3 p-3 sm:p-4">
            {o.mode === "text" ? (
              <>
                <textarea
                  id={`${id}-t`}
                  className="textarea mono"
                  style={{ ["--ta-min" as string]: "10rem" }}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="Type or paste text. The hashes update as you type."
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    used("type");
                  }}
                />
                <Field label="Line endings" htmlFor={`${id}-le`} help="Windows (CRLF) and Unix (LF) line breaks give different hashes" className="max-w-xs">
                  <select id={`${id}-le`} className="select" value={o.lineEnd} onChange={(e) => setO({ ...o, lineEnd: e.target.value })}>
                    <option value="keep">Hash exactly as typed</option>
                    <option value="lf">Convert CRLF to LF</option>
                    <option value="trim">Ignore trailing line breaks</option>
                  </select>
                </Field>
              </>
            ) : (
              <>
                <FileDrop
                  accept="*/*,.*"
                  maxBytes={FILE_LIMIT}
                  hint={`Any file up to ${formatBytes(FILE_LIMIT)} · read in your browser, not uploaded`}
                  onFiles={([f]) => void hashFile(f)}
                />
                {file && (
                  <p className="text-sm text-ink-2">
                    <span className="font-semibold break-all">{file.name}</span> · {formatBytes(file.size)}
                  </p>
                )}
                {progress !== null && (
                  <div className="grid gap-1">
                    <progress className="w-full" max={1} value={progress} aria-label="Hashing progress" />
                    <span className="text-sm text-ink-3">Hashing… {Math.round(progress * 100)}%</span>
                  </div>
                )}
              </>
            )}
            <Checkbox checked={o.useHmac} onChange={(v) => check("useHmac", v)} label="HMAC (keyed hash)" help="Signs the data with a secret key, as APIs and webhooks do" />
            {o.useHmac && (
              <Field label="Secret key" htmlFor={`${id}-k`} help="Used as UTF-8 text. It is never stored or sent anywhere.">
                <input id={`${id}-k`} className="input mono" value={key} autoComplete="off" spellCheck={false} onChange={(e) => setKey(e.target.value)} />
              </Field>
            )}
          </div>
        </Panel>

        <Panel title={<span>{o.useHmac ? "HMAC values" : "Hashes"}</span>}>
          <div className="min-h-64 p-3 sm:p-4">
            {err ? (
              <Alert tone="danger" role="alert">
                {err}
              </Alert>
            ) : !algos.length ? (
              <p className="text-sm text-ink-3">Tick at least one algorithm.</p>
            ) : results && (o.mode === "text" || file) ? (
              <ResultRows results={results} algos={algos} format={o.format as OutFormat} expected={expected.hex ?? null} />
            ) : (
              <p className="text-sm text-ink-3">{o.mode === "text" ? "The hashes of your text appear here." : "Choose a file to calculate its checksums."}</p>
            )}
            {o.mode === "text" && !text && results && !err && algos.length > 0 && <p className="mt-2 text-sm text-ink-3">These are the hashes of empty input.</p>}
          </div>
        </Panel>
      </div>

      <Panel title={<label htmlFor={`${id}-e`}>Compare with a checksum</label>}>
        <div className="grid gap-3 p-3 sm:p-4">
          <input
            id={`${id}-e`}
            className="input mono"
            value={expectedRaw}
            spellCheck={false}
            autoComplete="off"
            placeholder="Paste the checksum published with the download (hex or Base64)"
            onChange={(e) => setExpectedRaw(e.target.value)}
          />
          <div className="min-h-12" aria-live="off">
            {expected.error ? (
              <Alert tone="warning">{expected.error}</Alert>
            ) : expected.hex && results ? (
              matchAlgo ? (
                <Alert tone="success" title="Match">
                  The {matchAlgo} {o.useHmac ? "HMAC" : "hash"} is identical to the checksum you pasted{o.mode === "file" && file ? `, so ${file.name} is the file that was published` : ""}.
                </Alert>
              ) : (
                <Alert tone="danger" title="No match">
                  {lengthAlgo && !algos.includes(lengthAlgo)
                    ? `The checksum is ${expected.hex.length} hex digits long, which is a ${lengthAlgo} hash. Tick ${lengthAlgo} above to compare.`
                    : `None of the hashes equals the checksum. ${o.mode === "file" ? "The file is different from the published one (or the download was corrupted)." : "Check for extra spaces or line breaks in the text, and the line-ending setting."}`}
                </Alert>
              )
            ) : (
              <p className="text-sm text-ink-3">Case, spaces and colons are ignored. The tool picks the algorithm from the checksum&apos;s length.</p>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
