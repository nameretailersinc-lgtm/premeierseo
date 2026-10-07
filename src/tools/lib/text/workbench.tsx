"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useTool } from "../../ui/ToolContext";
import { Alert, Button, CopyButton, DownloadButton, Panel, stamp } from "../../ui/primitives";

/*
 * Two-pane input → output layout for text tools whose options don't fit TransformTool's
 * option spec (rule lists, audio, mode buttons). Same look and behavior as TransformTool:
 * Example, Clear with Undo, Use as input, Copy, Download. The parent owns the state.
 */

export interface WorkbenchProps {
  toolId: string;
  input: string;
  setInput: (v: string) => void;
  sample: string;
  output: string;
  note?: ReactNode;
  error?: string | null;
  inputLabel?: string;
  outputLabel?: string;
  placeholder?: string;
  mono?: boolean;
  /** Controls rendered in a panel above the two panes. */
  options?: ReactNode;
  notice?: ReactNode;
  /** Rendered under the two panes (audio player, tables). */
  below?: ReactNode;
  /** Extra buttons in the output header, before Copy. */
  outputActions?: ReactNode;
  /** Makes the output editable. */
  onOutputChange?: (v: string) => void;
  downloadName?: string;
  /** Explicit action instead of live updates. */
  action?: { label: string; run: () => void; busy?: boolean };
}

const lineCount = (s: string) => (s ? s.split("\n").length : 0);

export function Workbench(p: WorkbenchProps) {
  const { used, announce } = useTool();
  const id = useId();
  const [undo, setUndo] = useState<string | null>(null);

  useEffect(() => {
    if (undo === null) return;
    const t = setTimeout(() => setUndo(null), 10_000);
    return () => clearTimeout(t);
  }, [undo]);

  const inId = `${id}-in`;
  const outId = `${id}-out`;
  const taStyle = { ["--ta-min" as string]: "12.5rem", ["--ta-min-lg" as string]: "20rem" };

  return (
    <div className="grid gap-4">
      {p.notice && <Alert tone="info">{p.notice}</Alert>}
      {p.options && <div className="panel p-3 sm:p-4">{p.options}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          as="div"
          title={<label htmlFor={inId}>{p.inputLabel ?? "Your text"}</label>}
          actions={
            <>
              <Button
                variant="ghost"
                icon="sparkles"
                onClick={() => {
                  if (p.input && p.input !== p.sample) setUndo(p.input);
                  p.setInput(p.sample);
                  used("example");
                }}
              >
                Example
              </Button>
              <Button
                variant="ghost"
                icon="trash"
                disabled={!p.input}
                onClick={() => {
                  setUndo(p.input);
                  p.setInput("");
                  announce("Cleared");
                }}
              >
                Clear
              </Button>
            </>
          }
          footer={
            <>
              <span>{p.input.length.toLocaleString()} characters</span>
              <span>{lineCount(p.input).toLocaleString()} lines</span>
              {undo !== null && (
                <button
                  type="button"
                  className="font-semibold text-accent underline"
                  onClick={() => {
                    p.setInput(undo);
                    setUndo(null);
                    announce("Text restored");
                  }}
                >
                  Undo
                </button>
              )}
            </>
          }
        >
          <textarea
            id={inId}
            className={`textarea rounded-none border-0 ${p.mono ? "mono" : ""}`}
            style={taStyle}
            placeholder={p.placeholder ?? "Paste or type text here"}
            value={p.input}
            spellCheck={!p.mono}
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(e) => {
              p.setInput(e.target.value);
              used("type");
            }}
            onPaste={() => used("paste")}
            onKeyDown={(e) => {
              if (p.action && (e.ctrlKey || e.metaKey) && e.key === "Enter") p.action.run();
            }}
          />
        </Panel>

        <Panel
          title={<span id={outId}>{p.outputLabel ?? "Result"}</span>}
          actions={
            <>
              {p.outputActions}
              <Button
                variant="ghost"
                icon="arrow-left-right"
                disabled={!p.output}
                aria-label="Use output as input"
                onClick={() => {
                  setUndo(p.input);
                  p.setInput(p.output);
                  announce("Result moved to input");
                }}
              >
                Reuse
              </Button>
              <CopyButton text={p.output} disabled={!p.output} variant="primary" />
              <DownloadButton data={() => p.output} filename={() => p.downloadName ?? `${p.toolId}-${stamp()}.txt`} disabled={!p.output} />
            </>
          }
          footer={
            p.note || p.output ? (
              <>
                {p.note && <span>{p.note}</span>}
                {p.output && <span>{p.output.length.toLocaleString()} characters</span>}
              </>
            ) : undefined
          }
        >
          {p.action && (
            <div className="border-b border-line p-3 sm:p-4">
              <Button variant="primary" size="md" icon="play" busy={p.action.busy} disabled={!p.input} onClick={p.action.run} className="min-w-40">
                {p.action.label}
              </Button>
              <span className="ml-3 hidden text-sm text-ink-3 lg:inline">
                or press <kbd className="kbd">Ctrl</kbd> + <kbd className="kbd">Enter</kbd>
              </span>
            </div>
          )}
          {p.error ? (
            <div className="p-3 sm:p-4" role="alert">
              <Alert tone="danger">{p.error}</Alert>
            </div>
          ) : (
            <textarea
              aria-labelledby={outId}
              readOnly={!p.onOutputChange}
              className={`textarea rounded-none border-0 ${p.mono ? "mono" : ""}`}
              style={taStyle}
              value={p.output}
              placeholder={p.input ? "" : "The result appears here."}
              onChange={p.onOutputChange ? (e) => p.onOutputChange!(e.target.value) : undefined}
            />
          )}
        </Panel>
      </div>
      {p.below}
    </div>
  );
}
