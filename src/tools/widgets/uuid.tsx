"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, DownloadButton, Field, Panel, Segmented, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { formatUuid, inspectUuid, uuidV4, uuidV7, type UuidFormat } from "../lib/dev/uuid";

/*
 * UUID generator (RFC 9562): v4 from crypto.randomUUID, v7 = Unix ms timestamp + random bits.
 * Bulk generation, formatting options and a validator/inspector. Everything runs in the browser.
 */

const MAX = 10_000;

export default function UuidTool({ toolId }: WidgetProps) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [o, setO] = usePersistentOptions(toolId, {
    version: "4",
    count: 1,
    upper: false,
    hyphens: true,
    braces: false,
    quotes: "none",
    sep: "newline",
  });
  const [raw, setRaw] = useState<string[]>([]);
  const [check, setCheck] = useState("");

  const generate = (announceIt = true) => {
    const n = Math.min(MAX, Math.max(1, Math.floor(Number(o.count) || 1)));
    const list = Array.from({ length: n }, () => (o.version === "7" ? uuidV7() : uuidV4()));
    setRaw(list);
    if (announceIt) {
      announce(`${n} UUID${n === 1 ? "" : "s"} generated`);
      used("generate");
      completed("generate", { count: n, version: String(o.version) });
    }
  };

  // One fresh UUID on load (client only, so the server never renders an ID that everyone shares).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- random values must be created in the browser
    generate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.version]);

  const fmt: UuidFormat = { upper: o.upper, hyphens: o.hyphens, braces: o.braces, quotes: o.quotes as UuidFormat["quotes"] };
  const sep = o.sep === "comma" ? ", " : o.sep === "space" ? " " : "\n";
  const output = raw.map((u) => formatUuid(u, fmt)).join(sep);
  const info = useMemo(() => (check.trim() ? inspectUuid(check) : null), [check]);

  return (
    <div className="grid gap-4">
      <div className="panel p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Segmented
            legend="Version"
            value={o.version as "4" | "7"}
            onChange={(v) => setO({ ...o, version: v })}
            options={[
              { value: "4", label: "v4 (random)" },
              { value: "7", label: "v7 (time-ordered)" },
            ]}
          />
          <Field label="How many" htmlFor={`${id}-n`} help={`1 to ${MAX.toLocaleString()}`} className="w-32">
            <input
              id={`${id}-n`}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX}
              className="input"
              value={o.count}
              onChange={(e) => setO({ ...o, count: e.target.value === "" ? 1 : Math.min(MAX, Math.max(1, Number(e.target.value))) })}
            />
          </Field>
          <Field label="Separate with" htmlFor={`${id}-sep`} className="w-36">
            <select id={`${id}-sep`} className="select" value={o.sep} onChange={(e) => setO({ ...o, sep: e.target.value })}>
              <option value="newline">New lines</option>
              <option value="comma">Commas</option>
              <option value="space">Spaces</option>
            </select>
          </Field>
          <Field label="Quotes" htmlFor={`${id}-q`} className="w-36">
            <select id={`${id}-q`} className="select" value={o.quotes} onChange={(e) => setO({ ...o, quotes: e.target.value })}>
              <option value="none">None</option>
              <option value="double">&quot;double&quot;</option>
              <option value="single">&apos;single&apos;</option>
            </select>
          </Field>
          <Checkbox checked={o.upper} onChange={(v) => setO({ ...o, upper: v })} label="Upper case" />
          <Checkbox checked={o.hyphens} onChange={(v) => setO({ ...o, hyphens: v })} label="Hyphens" />
          <Checkbox checked={o.braces} onChange={(v) => setO({ ...o, braces: v })} label="{Braces}" help="Microsoft GUID style" />
        </div>
      </div>

      <Panel
        title={<span id={`${id}-outl`}>{raw.length > 1 ? `${raw.length.toLocaleString()} UUIDs` : "UUID"}</span>}
        actions={
          <>
            <CopyButton text={output} disabled={!output} variant="primary" label={raw.length > 1 ? "Copy all" : "Copy"} />
            <DownloadButton data={() => output} filename={`uuids-v${o.version}.txt`} disabled={!output} />
          </>
        }
      >
        <div className="border-b border-line p-3 sm:p-4">
          <Button variant="primary" size="md" icon="refresh" onClick={() => generate()} className="min-w-40">
            Generate {Number(o.count) > 1 ? `${Math.min(MAX, Number(o.count)).toLocaleString()} UUIDs` : "UUID"}
          </Button>
        </div>
        <textarea
          aria-labelledby={`${id}-outl`}
          readOnly
          wrap="off"
          className="textarea mono rounded-none border-0"
          style={{ ["--ta-min" as string]: raw.length > 1 ? "14rem" : "4rem" }}
          value={output}
          placeholder="Press Generate."
        />
        <p className="border-t border-line px-3 py-2 text-sm text-ink-3 sm:px-4">
          {o.version === "7"
            ? "v7: the first 48 bits are the current Unix time in milliseconds, so IDs sort by creation time; the rest comes from crypto.getRandomValues."
            : "v4: 122 random bits from your browser's cryptographic generator (crypto.randomUUID)."}{" "}
          Generated on your device; nothing is sent to a server or kept.
        </p>
      </Panel>

      <Panel title={<label htmlFor={`${id}-c`}>Validate or inspect a UUID</label>}>
        <div className="grid gap-3 p-3 sm:p-4">
          <input
            id={`${id}-c`}
            className="input mono"
            value={check}
            spellCheck={false}
            autoComplete="off"
            placeholder="Paste a UUID or GUID, e.g. {123E4567-E89B-12D3-A456-426614174000}"
            onChange={(e) => setCheck(e.target.value)}
          />
          <div className="min-h-20">
            {!info ? (
              <p className="text-sm text-ink-3">Shows whether the value is a valid UUID, its version and variant, and the time stored in v1, v6 and v7 UUIDs.</p>
            ) : !info.valid ? (
              <Alert tone="danger">{info.error}</Alert>
            ) : (
              <Alert tone={info.note ? "warning" : "success"} title="Valid UUID format">
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
                  <dt className="text-ink-3">Canonical</dt>
                  <dd className="font-mono break-all">{info.canonical}</dd>
                  {info.version !== undefined && (
                    <>
                      <dt className="text-ink-3">Version</dt>
                      <dd>
                        {info.version}
                        {{ 1: " (time + node)", 3: " (MD5 name-based)", 4: " (random)", 5: " (SHA-1 name-based)", 6: " (reordered time)", 7: " (Unix time + random)", 8: " (custom)" }[info.version] ?? ""}
                      </dd>
                    </>
                  )}
                  {info.variant && (
                    <>
                      <dt className="text-ink-3">Variant</dt>
                      <dd>{info.variant}</dd>
                    </>
                  )}
                  {info.time && Number.isFinite(info.time.getTime()) && (
                    <>
                      <dt className="text-ink-3">Created</dt>
                      <dd>{info.time.toISOString()}</dd>
                    </>
                  )}
                </dl>
                {info.note && <p className="mt-1">{info.note}</p>}
              </Alert>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
