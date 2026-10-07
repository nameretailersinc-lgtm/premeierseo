"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, Field, Panel, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { isPalindrome, looksFlipped, orderedStyles, unflip, type FancyStyle } from "../lib/text/fancy";
import { BLANKS, findHidden, hex, removeHidden } from "../lib/text/invisible";

/*
 * Fancy text engine: every Unicode style at once with a Copy button per row.
 * config.styles lists the landing page's own styles (shown first); config.mode "invisible"
 * switches to the invisible-character picker and hidden-character detector.
 */

const A11Y_NOTE =
  "These are Unicode symbols that look like letters, not a font. Screen readers may read them letter by letter, as symbol names or not at all, and search engines may not match them to normal words. Avoid them for names, links and important information.";

function StyleRow({ style, text }: { style: FancyStyle; text: string }) {
  const out = useMemo(() => (text ? style.convert(text) : ""), [style, text]);
  const missing = useMemo(() => (text && style.missing ? style.missing(text) : []), [style, text]);
  return (
    <li className="grid gap-2 border-b border-line p-3 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-center sm:px-4">
      <div className="text-sm font-semibold text-ink-2">
        {style.label}
        {style.note && <span className="block text-xs font-normal text-ink-3">{style.note}</span>}
      </div>
      <div className="min-w-0">
        <p className="max-h-32 overflow-auto text-lg break-words whitespace-pre-wrap text-ink" lang="und">
          {out || <span className="text-base text-ink-3">Type above to see this style</span>}
        </p>
        {missing.length > 0 && <p className="mt-1 text-xs text-ink-3">No {style.label.toLowerCase()} form for: {missing.join(" ")} (left unchanged)</p>}
      </div>
      <CopyButton text={out} disabled={!out} label="Copy" />
    </li>
  );
}

function StyleList({ toolId, primary, mode, sample }: { toolId: string; primary: string[]; mode?: string; sample: string }) {
  const id = useId();
  const { used, announce } = useTool();
  const [text, setText] = useSessionText(toolId);
  const deferred = useDeferredValue(text);
  const styles = useMemo(() => orderedStyles(primary), [primary]);
  const first = styles.slice(0, primary.length);
  const rest = styles.slice(primary.length);
  const palindrome = mode === "reverse" ? isPalindrome(deferred) : null;
  const flipped = primary.includes("upside-down") && looksFlipped(deferred);
  const unflipped = flipped ? unflip(deferred) : "";

  return (
    <div className="grid gap-4">
      <Panel
        as="div"
        title={<label htmlFor={`${id}-t`}>Your text</label>}
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                setText(sample);
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
                announce("Cleared");
              }}
            >
              Clear
            </Button>
          </>
        }
      >
        <textarea
          id={`${id}-t`}
          className="textarea rounded-none border-0"
          style={{ ["--ta-min" as string]: "6rem", ["--ta-min-lg" as string]: "7rem" }}
          placeholder="Type or paste text here"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            used("type");
          }}
          onPaste={() => used("paste")}
        />
      </Panel>
      <Alert tone="info">{A11Y_NOTE}</Alert>
      {palindrome !== null && (
        <p className="text-sm text-ink-2" role="status">
          {palindrome ? "This text is a palindrome: it reads the same backwards (ignoring case, spaces and punctuation)." : "Not a palindrome: it reads differently backwards."}
        </p>
      )}
      <Panel title={<span>{primary.length > 1 ? "Styles for this page" : "Result"}</span>}>
        <ul className="min-h-24">
          {flipped && (
            <li className="grid gap-2 border-b border-line p-3 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-center sm:px-4">
              <div className="text-sm font-semibold text-ink-2">
                Flipped back to normal
                <span className="block text-xs font-normal text-ink-3">Your text looks upside down</span>
              </div>
              <p className="min-w-0 text-lg break-words whitespace-pre-wrap">{unflipped}</p>
              <CopyButton text={unflipped} label="Copy" />
            </li>
          )}
          {first.map((s) => (
            <StyleRow key={s.id} style={s} text={deferred} />
          ))}
        </ul>
      </Panel>
      <Panel title={<span>More styles</span>}>
        <ul>
          {rest.map((s) => (
            <StyleRow key={s.id} style={s} text={deferred} />
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ---------- Invisible characters ---------- */

const visible = (s: string) =>
  Array.from(s, (c) => {
    const cp = c.codePointAt(0)!;
    if (c === "\n") return "⏎\n";
    if (c === "\t") return "→";
    return cp < 0x20 || BLANKS.some((b) => b.cp === cp) || /[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180e\u200b-\u200f\u202a-\u202f\u2060-\u206f\ufeff]/.test(c) ? `[${hex(cp)}]` : c;
  }).join("");

function Invisible({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [o, setO] = usePersistentOptions(toolId, { cp: BLANKS[0].cp, count: 1, includeNbsp: true, keepEmojiJoiners: true });
  const [text, setText] = useSessionText(toolId);
  const deferred = useDeferredValue(text);
  const count = Math.min(1000, Math.max(1, Math.floor(Number(o.count) || 1)));
  const chosen = BLANKS.find((b) => b.cp === o.cp) ?? BLANKS[0];
  const value = String.fromCodePoint(chosen.cp).repeat(count);
  const hidden = useMemo(() => findHidden(deferred, o), [deferred, o]);
  const cleaned = useMemo(() => (deferred ? removeHidden(deferred, o) : ""), [deferred, o]);
  const total = hidden.reduce((a, h) => a + h.count, 0);
  const [showCodes, setShowCodes] = useState(false);

  return (
    <div className="grid gap-6">
      <Panel title={<span>Copy an invisible character</span>}>
        <div className="grid gap-4 p-3 sm:p-4">
          <fieldset>
            <legend className="field-label">Character</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {BLANKS.map((b) => (
                <label
                  key={b.cp}
                  className="flex cursor-pointer gap-3 rounded-md border border-line p-3 has-[:checked]:border-accent has-[:checked]:bg-accent-subtle has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus"
                >
                  <input type="radio" name={`${id}-cp`} className="mt-1 size-[1.125rem] shrink-0" checked={o.cp === b.cp} onChange={() => setO({ ...o, cp: b.cp })} />
                  <span>
                    <span className="block font-semibold">{b.label}</span>
                    <span className="block text-sm text-ink-3">{b.width === "zero" ? "Zero width. " : "Space-sized. "}{b.note}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-end gap-4">
            <Field label="How many" htmlFor={`${id}-n`} className="w-32">
              <input id={`${id}-n`} type="number" className="input" min={1} max={1000} value={o.count} onChange={(e) => setO({ ...o, count: Number(e.target.value) || 1 })} />
            </Field>
            <CopyButton text={value} variant="primary" size="md" label={`Copy ${count === 1 ? "1 character" : `${count} characters`}`} />
          </div>
          <p className="text-sm text-ink-2">
            Preview between the brackets: <span className="rounded-sm border border-line bg-surface-2 px-1 font-mono">[{value}]</span>{" "}
            <span className="text-ink-3">
              ({hex(chosen.cp)} {chosen.name}, {count} × {new TextEncoder().encode(String.fromCodePoint(chosen.cp)).length} bytes in UTF-8)
            </span>
          </p>
          <Alert tone="warning">No blank character works in every app. Apps trim, block or replace them and change their rules without notice, so test in the app before relying on one.</Alert>
        </div>
      </Panel>

      <Panel
        title={<label htmlFor={`${id}-d`}>Find and remove hidden characters</label>}
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                setText("Price:\u00a0€20\u200b\u200b per month\u2060.\nCopied from a web page\ufeff with a soft\u00adhyphen.");
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
          id={`${id}-d`}
          className="textarea rounded-none border-0"
          style={{ ["--ta-min" as string]: "8rem" }}
          placeholder="Paste text to check for hidden characters"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            used("paste");
          }}
        />
        <div className="grid gap-3 border-t border-line p-3 sm:p-4">
          <div className="flex flex-wrap gap-x-6">
            <Checkbox checked={o.includeNbsp} onChange={(v) => setO({ ...o, includeNbsp: v })} label="Treat no-break spaces as hidden (replace with normal spaces)" />
            <Checkbox checked={o.keepEmojiJoiners} onChange={(v) => setO({ ...o, keepEmojiJoiners: v })} label={"Keep joiners inside emoji (👨\u200d👩\u200d👧)"} />
          </div>
          <div className="min-h-16" role="status" aria-live="polite">
            {!deferred ? (
              <p className="text-sm text-ink-3">Hidden characters found in your text will be listed here.</p>
            ) : total === 0 ? (
              <p className="text-sm font-semibold text-success">No hidden characters found.</p>
            ) : (
              <>
                <p className="text-sm font-semibold">
                  Found {total} hidden character{total === 1 ? "" : "s"}:
                </p>
                <ul className="mt-2 grid gap-1 text-sm">
                  {hidden.map((h) => (
                    <li key={h.cp} className="flex flex-wrap gap-x-3">
                      <span className="font-mono">{hex(h.cp)}</span>
                      <span>{h.name}</span>
                      <span className="text-ink-3">
                        × {h.count} · line {h.lines.join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {total > 0 && (
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <CopyButton text={cleaned} variant="primary" label="Copy clean text" />
                <Button variant="ghost" icon="eye" aria-pressed={showCodes} onClick={() => setShowCodes(!showCodes)}>
                  {showCodes ? "Hide codes" : "Show where they are"}
                </Button>
                <Button
                  variant="ghost"
                  icon="arrow-left-right"
                  onClick={() => {
                    setText(cleaned);
                    completed("clean");
                    announce("Hidden characters removed");
                  }}
                >
                  Replace my text with the clean text
                </Button>
              </div>
              {showCodes && <pre className="max-h-48 overflow-auto rounded-md border border-line bg-surface-2 p-3 text-sm break-words whitespace-pre-wrap">{visible(deferred)}</pre>}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

const SAMPLES: Record<string, string> = {
  reverse: "Was it a car or a cat I saw?",
  "upside-down": "Hello world, this is upside down!",
  "small-caps": "Small capitals look elegant",
  superscript: "tiny text for my bio",
  "bold-serif": "Bold text for your next post",
};

export default function FancyText({ toolId, config }: WidgetProps) {
  const mode = typeof config?.mode === "string" ? config.mode : undefined;
  const primary = useMemo(() => (Array.isArray(config?.styles) ? config.styles : ["bold-serif"]), [config]);
  if (mode === "invisible") return <Invisible toolId={toolId} />;
  return <StyleList toolId={toolId} primary={primary} mode={mode} sample={SAMPLES[mode ?? ""] ?? SAMPLES[primary[0]] ?? "Fancy text to copy and paste"} />;
}
