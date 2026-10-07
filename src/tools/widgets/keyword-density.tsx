"use client";

import { useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Button, Checkbox, CopyButton, DownloadButton, Field, Panel, Segmented, StatTile, stamp, useDebounced, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { postJson, toCsv, type InspectResult } from "../lib/seo/api";
import { countPhrase, density, words } from "../lib/seo/keywords";
import { ApiErrorAlert, CheckedAt, ModeTabs, StatusCode, UrlForm, useRunner } from "../lib/seo/ui";

const SAMPLE =
  "A sourdough starter is a mix of flour and water. Feed your sourdough starter every day. A healthy sourdough starter doubles in size. Keep the starter in a warm place, and feed the starter flour and water.";

export default function KeywordDensity({ toolId }: WidgetProps) {
  const id = useId();
  const { used } = useTool();
  const [mode, setMode] = useState<"text" | "url">("text");
  const [text, setText] = useSessionText(toolId);
  const [o, setO] = usePersistentOptions(toolId, { n: "1" as "1" | "2" | "3", excludeStopWords: true, minCount: 2, minLength: 3, top: 25 });
  const [track, setTrack] = useState("");
  const runner = useRunner<InspectResult>();
  const source = mode === "url" ? (runner.data?.facts?.text ?? "") : text;
  const deb = useDebounced(source, 200);
  const n = Number(o.n) as 1 | 2 | 3;
  const r = useMemo(() => density(deb, { n, excludeStopWords: o.excludeStopWords, minCount: o.minCount, minLength: o.minLength }), [deb, n, o.excludeStopWords, o.minCount, o.minLength]);
  const tracked = useMemo(() => {
    const total = words(deb).length;
    return track
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20)
      .map((p) => {
        const c = countPhrase(deb, p);
        return { phrase: p, count: c, density: total ? (c * words(p).length * 100) / total : 0 };
      });
  }, [deb, track]);
  const rows = r.rows.slice(0, o.top);
  const csv = () => toCsv([["phrase", "count", "density_percent"], ...r.rows.map((x) => [x.phrase, x.count, x.density.toFixed(2)])]);
  const max = rows[0]?.count ?? 1;
  return (
    <div className="grid gap-4">
      <ModeTabs
        label="Source"
        value={mode}
        onChange={setMode}
        options={[
          { value: "text", label: "Paste text" },
          { value: "url", label: "Check a URL" },
        ]}
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-4">
          {mode === "text" ? (
            <Panel
              title={<label htmlFor={`${id}-t`}>Your text</label>}
              actions={
                <>
                  <Button variant="ghost" icon="sparkles" onClick={() => (setText(SAMPLE), used("example"))}>
                    Example
                  </Button>
                  <Button variant="ghost" icon="trash" disabled={!text} onClick={() => setText("")}>
                    Clear
                  </Button>
                </>
              }
            >
              <textarea id={`${id}-t`} className="textarea rounded-none border-0" style={{ ["--ta-min" as string]: "14rem", ["--ta-min-lg" as string]: "20rem" }} value={text} placeholder="Paste an article, page copy or any text" onChange={(e) => (setText(e.target.value), used("type"))} />
            </Panel>
          ) : (
            <Panel>
              <div className="grid gap-3 p-3 sm:p-4">
                <UrlForm buttonLabel="Fetch text" busy={runner.busy} onSubmit={(u) => void runner.run(() => postJson<InspectResult>("/api/inspect", { url: u, includeText: true }), (d) => `${d.facts?.wordCount ?? 0} words fetched.`)} help="We fetch the page from our server and count the visible text in its HTML body (scripts, styles and SVG removed). Navigation and footer text are included." />
                {runner.error && <ApiErrorAlert error={runner.error} />}
                {runner.data && (
                  <CheckedAt iso={runner.data.checkedAt}>
                    <span className="inline-flex items-center gap-1.5">
                      <StatusCode code={runner.data.status} /> {runner.data.finalUrl}
                    </span>
                  </CheckedAt>
                )}
                {runner.data && !runner.data.facts && <p className="text-sm text-danger">No HTML text to analyze (status {runner.data.status}).</p>}
              </div>
            </Panel>
          )}
          <Panel icon="sparkles" title="Options">
            <div className="grid gap-4 p-3 sm:grid-cols-2 sm:p-4">
              <div className="sm:col-span-2">
                <Segmented
                  legend="Phrase length"
                  value={o.n}
                  onChange={(v) => setO({ ...o, n: v })}
                  options={[
                    { value: "1", label: "1 word" },
                    { value: "2", label: "2 words" },
                    { value: "3", label: "3 words" },
                  ]}
                />
              </div>
              <Field label="Minimum occurrences" htmlFor={`${id}-mc`}>
                <input id={`${id}-mc`} type="number" min={1} max={50} className="input" value={o.minCount} onChange={(e) => setO({ ...o, minCount: Math.max(1, Number(e.target.value) || 1) })} />
              </Field>
              <Field label="Rows to show" htmlFor={`${id}-top`}>
                <select id={`${id}-top`} className="select" value={o.top} onChange={(e) => setO({ ...o, top: Number(e.target.value) })}>
                  {[10, 25, 50, 100, 500].map((v) => (
                    <option key={v} value={v}>
                      Top {v}
                    </option>
                  ))}
                </select>
              </Field>
              {n === 1 && (
                <Field label="Minimum word length" htmlFor={`${id}-ml`}>
                  <select id={`${id}-ml`} className="select" value={o.minLength} onChange={(e) => setO({ ...o, minLength: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>
                        {v}+ letters
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <div className="sm:col-span-2">
                <Checkbox checked={o.excludeStopWords} onChange={(v) => setO({ ...o, excludeStopWords: v })} label="Ignore stop words" help="Leaves out words such as the, and, of. Phrases that start or end with one are skipped." />
              </div>
              <Field label="Track specific keywords" htmlFor={`${id}-tr`} className="sm:col-span-2" help="Comma-separated, e.g. sourdough starter, levain">
                <input id={`${id}-tr`} className="input" value={track} onChange={(e) => setTrack(e.target.value)} />
              </Field>
            </div>
          </Panel>
        </div>
        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Total words" value={r.total.toLocaleString()} />
            <StatTile label={n === 1 ? "Unique words" : "Unique phrases"} value={r.unique.toLocaleString()} />
            <StatTile label="Shown" value={rows.length} />
          </div>
          {tracked.length > 0 && (
            <Panel title="Tracked keywords">
              <ul className="divide-y divide-line">
                {tracked.map((t) => (
                  <li key={t.phrase} className="flex justify-between gap-2 px-3 py-2 text-sm sm:px-4">
                    <span className="truncate">{t.phrase}</span>
                    <span className="text-ink-3 tabular-nums">
                      {t.count} × · {t.density.toFixed(2)}%
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel
            title={`Most frequent ${n === 1 ? "words" : `${n}-word phrases`}`}
            actions={
              <>
                <CopyButton text={() => r.rows.map((x) => `${x.phrase}\t${x.count}\t${x.density.toFixed(2)}%`).join("\n")} disabled={!r.rows.length} />
                <DownloadButton data={csv} filename={() => `keyword-density-${stamp()}.csv`} mime="text/csv;charset=utf-8" label="CSV" disabled={!r.rows.length} />
              </>
            }
            footer={<span>Density = occurrences × words in phrase ÷ total words.</span>}
          >
            <div className="min-h-48 overflow-x-auto">
              {rows.length ? (
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Keyword frequency</caption>
                  <thead className="text-xs text-ink-3">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-semibold sm:px-4">
                        {n === 1 ? "Word" : "Phrase"}
                      </th>
                      <th scope="col" className="px-2 py-2 text-right font-semibold">
                        Count
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold sm:px-4">
                        Density
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((x) => (
                      <tr key={x.phrase}>
                        <td className="px-3 py-1.5 sm:px-4">
                          <span className="block break-words">{x.phrase}</span>
                          <span className="mt-1 block h-1 rounded-full bg-accent" style={{ width: `${Math.max(4, (x.count / max) * 100)}%` }} aria-hidden="true" />
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{x.count}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums sm:px-4">{x.density.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-3 text-sm text-ink-3 sm:p-4">{deb ? "No words or phrases reach the minimum count. Lower it in Options." : "Paste text or fetch a URL to see word and phrase frequency."}</p>
              )}
            </div>
          </Panel>
          <p className="text-sm text-ink-3">There&apos;s no ideal density. Use this to spot repetition that reads unnaturally, not to hit a percentage.</p>
        </div>
      </div>
    </div>
  );
}
