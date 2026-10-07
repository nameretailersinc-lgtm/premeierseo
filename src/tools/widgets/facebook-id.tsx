"use client";

/*
 * Facebook ID finder, client-side only. Extracts numeric IDs from pasted URLs and page source
 * (src/tools/lib/calc/facebook.ts). It never contacts Facebook: usernames (facebook.com/name)
 * can't be resolved without Facebook's servers, so the manual method is shown instead.
 */
import { useDeferredValue, useEffect, useId, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, CopyButton, Panel } from "../ui/primitives";
import { findFacebookIds } from "../lib/calc/facebook";

export default function FacebookId() {
  const id = useId();
  const { used, completed, announce } = useTool();
  const [text, setText] = useState("");
  const deferred = useDeferredValue(text);
  const r = findFacebookIds(deferred);
  const has = r.matches.length > 0;

  useEffect(() => {
    if (!deferred.trim()) return;
    const t = setTimeout(() => {
      announce(has ? `${r.matches.length} ID${r.matches.length === 1 ? "" : "s"} found` : "No numeric ID found");
      if (has) completed("found");
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferred]);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel
        title={<label htmlFor={`${id}-t`}>Facebook URL or page source</label>}
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                setText("https://www.facebook.com/profile.php?id=100064581837321\nhttps://www.facebook.com/people/Jane-Example/100089123456789/");
                used("example");
              }}
            >
              Example
            </Button>
            <Button variant="ghost" icon="trash" disabled={!text} onClick={() => setText("")}>
              Clear
            </Button>
          </>
        }
      >
        <textarea
          id={`${id}-t`}
          className="textarea mono rounded-none border-0"
          style={{ ["--ta-min" as string]: "12rem" }}
          spellCheck={false}
          placeholder={"https://www.facebook.com/profile.php?id=…\nor paste the page source (Ctrl+U, then Ctrl+A, Ctrl+C)"}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            used("type");
          }}
          onPaste={() => used("paste")}
        />
        <p className="border-t border-line px-3 py-2 text-sm text-ink-3 sm:px-4">Runs in your browser. This tool doesn&apos;t contact Facebook and can&apos;t look up usernames.</p>
      </Panel>

      <Panel title="Numeric IDs found">
        <div className="grid min-h-48 content-start gap-3 p-3 sm:p-4">
          {has ? (
            <ul className="grid gap-2">
              {r.matches.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line p-3">
                  <div className="min-w-0">
                    <p className="font-mono text-lg tabular-nums">{m.id}</p>
                    <p className="text-sm text-ink-3">
                      Likely a {m.kind} · from {m.source}
                      {m.count > 1 ? ` · seen ${m.count} times` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <CopyButton text={m.id} label="Copy ID" />
                    <a className="btn btn-ghost btn-sm" href={`https://www.facebook.com/${m.id}`} target="_blank" rel="noopener noreferrer">
                      Check on Facebook
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          ) : r.vanity ? (
            <Alert tone="info" title={`“${r.vanity}” is a username, not an ID`}>
              The numeric ID isn&apos;t part of this address, and this tool doesn&apos;t query Facebook. Use one of the manual methods below: open the page, view its source and paste it here, or (if you manage the Page) read the ID in its settings.
            </Alert>
          ) : text.trim() ? (
            <p className="text-sm text-ink-3">No numeric Facebook ID found. Paste a URL that contains the number (such as profile.php?id=…) or the page&apos;s full source.</p>
          ) : (
            <p className="text-sm text-ink-3">IDs appear here as soon as you paste a link or page source.</p>
          )}
          {r.viewer.length > 0 && (
            <p className="text-sm text-ink-3">
              Ignored {r.viewer.length === 1 ? "an ID" : `${r.viewer.length} IDs`} ({r.viewer.join(", ")}) that belong{r.viewer.length === 1 ? "s" : ""} to the account that was logged in when the source was copied, not to the page.
            </p>
          )}
        </div>
      </Panel>

      <Panel title="Manual methods" className="lg:col-span-2">
        <div className="grid gap-4 p-3 text-sm sm:grid-cols-2 sm:p-4">
          <div>
            <p className="font-semibold">If you manage the Page</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>Open your Page on facebook.com while logged in as an admin.</li>
              <li>Go to <strong>About</strong>, then <strong>Page transparency</strong>.</li>
              <li>Copy the number shown as <strong>Page ID</strong>. Meta Business Suite also lists it under the Page&apos;s settings.</li>
            </ol>
          </div>
          <div>
            <p className="font-semibold">Any public Page or profile (desktop browser)</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>Open the Page or profile.</li>
              <li>Press <kbd className="kbd">Ctrl</kbd> + <kbd className="kbd">U</kbd> (<kbd className="kbd">⌘</kbd> + <kbd className="kbd">Option</kbd> + <kbd className="kbd">U</kbd> on a Mac) to view the source.</li>
              <li>Select all, copy, and paste it into the box above. The ID is found in fields such as <code>&quot;pageID&quot;</code> or <code>fb://page/</code>.</li>
            </ol>
          </div>
        </div>
      </Panel>
    </div>
  );
}
