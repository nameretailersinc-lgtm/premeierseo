"use client";

/*
 * Bulk URL opener. The list is cleaned (https:// added to bare domains, duplicates and
 * non-http(s) entries removed), then opened in batches from a single click. Browsers allow
 * one new tab per click unless pop-ups are allowed for this site; blocked tabs are detected
 * (window.open returns null) and listed as plain links so they can still be opened by hand.
 */
import { useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Panel, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { parseUrlList } from "../lib/calc/urls";

type Status = "waiting" | "opened" | "blocked";

export default function UrlOpener({ toolId }: WidgetProps) {
  const id = useId();
  const { used, completed, announce } = useTool();
  const [o, setO] = usePersistentOptions(toolId, { batch: 10 });
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Record<string, Status>>({});
  const list = useMemo(() => parseUrlList(text), [text]);
  const pending = list.urls.filter((u) => (status[u] ?? "waiting") === "waiting");
  const opened = list.urls.filter((u) => status[u] === "opened").length;
  const blocked = list.urls.filter((u) => status[u] === "blocked").length;
  const batch = o.batch > 0 ? o.batch : list.urls.length;

  const open = (urls: string[]) => {
    const next: Record<string, Status> = {};
    for (const u of urls) {
      const w = window.open(u, "_blank");
      if (w) {
        try {
          w.opener = null;
        } catch {
          /* cross-origin; ignore */
        }
        next[u] = "opened";
      } else next[u] = "blocked";
    }
    setStatus((s) => ({ ...s, ...next }));
    const ok = Object.values(next).filter((v) => v === "opened").length;
    const bad = urls.length - ok;
    announce(bad ? `Opened ${ok} of ${urls.length}. ${bad} blocked by the browser.` : `Opened ${ok} tab${ok === 1 ? "" : "s"}.`);
    used("open");
    if (ok) completed("open", { count: ok });
  };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel
        title={<label htmlFor={`${id}-t`}>URLs (one per line)</label>}
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                setText("https://example.com/\nexample.org\nhttps://www.iana.org/domains/reserved\nhttps://example.com/\nnot a link");
                setStatus({});
                used("example");
              }}
            >
              Example
            </Button>
            <Button
              variant="ghost"
              icon="trash"
              disabled={!text}
              onClick={() => {
                setText("");
                setStatus({});
              }}
            >
              Clear
            </Button>
          </>
        }
        footer={
          <>
            <span>{list.urls.length} to open</span>
            {list.duplicates > 0 && <span>{list.duplicates} duplicate{list.duplicates === 1 ? "" : "s"} removed</span>}
            {list.invalid.length > 0 && <span className="text-danger">{list.invalid.length} skipped</span>}
          </>
        }
      >
        <textarea
          id={`${id}-t`}
          className="textarea mono rounded-none border-0"
          style={{ ["--ta-min" as string]: "14rem" }}
          spellCheck={false}
          placeholder={"https://example.com/\nexample.org/page"}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setStatus({});
            used("type");
          }}
        />
      </Panel>

      <div className="grid gap-4">
        <Panel title="Open">
          <div className="grid gap-4 p-3 sm:p-4">
            <div>
              <label htmlFor={`${id}-b`} className="field-label">
                Tabs per click
              </label>
              <select id={`${id}-b`} className="select" value={o.batch} onChange={(e) => setO((p) => ({ ...p, batch: Number(e.target.value) }))}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={0}>All at once</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="md" icon="external-link" disabled={!pending.length} onClick={() => open(pending.slice(0, batch))}>
                {opened + blocked === 0 ? `Open first ${Math.min(batch, pending.length) || ""}` : `Open next ${Math.min(batch, pending.length)}`}
              </Button>
              <Button size="md" disabled={!list.urls.length || (!opened && !blocked)} onClick={() => setStatus({})} icon="rotate-ccw">
                Start again
              </Button>
            </div>
            <p className="text-sm text-ink-3">
              {opened} opened · {blocked} blocked · {pending.length} waiting
            </p>
            {blocked > 0 && (
              <Alert tone="warning" title="Your browser blocked some tabs">
                Browsers allow one new tab per click unless you allow pop-ups for this site. In Chrome or Edge, click the blocked-pop-up icon at the right of the address bar and choose <strong>Always allow</strong>; in Firefox, choose <strong>Options → Allow pop-ups</strong> in the yellow bar; in Safari, open <strong>Settings for this website</strong> and set Pop-up Windows to <strong>Allow</strong>. Then press <strong>Start again</strong>, or open the blocked links below one by one.
              </Alert>
            )}
          </div>
        </Panel>
        <Panel title="Links">
          {list.urls.length || list.invalid.length ? (
            <ol className="max-h-96 min-h-24 divide-y divide-line overflow-auto text-sm">
              {list.urls.map((u, i) => {
                const s = status[u] ?? "waiting";
                return (
                  <li key={u} className="flex items-center justify-between gap-3 px-3 py-1.5 sm:px-4">
                    <a href={u} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-accent underline">
                      <span className="text-ink-3 tabular-nums">{i + 1}. </span>
                      {u}
                    </a>
                    <span className={`shrink-0 ${s === "opened" ? "text-success" : s === "blocked" ? "text-danger" : "text-ink-3"}`}>{s === "opened" ? "Opened" : s === "blocked" ? "Blocked" : "Waiting"}</span>
                  </li>
                );
              })}
              {list.invalid.map((u, i) => (
                <li key={`x${i}`} className="flex items-center justify-between gap-3 px-3 py-1.5 sm:px-4">
                  <span className="min-w-0 truncate text-ink-3">{u}</span>
                  <span className="shrink-0 text-danger">Skipped: not an http(s) URL</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="min-h-24 p-4 text-sm text-ink-3">Paste links on the left. They&apos;re listed here with their status once opened.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
