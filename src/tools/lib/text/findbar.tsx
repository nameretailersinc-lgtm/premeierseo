"use client";

import { useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { useTool } from "../../ui/ToolContext";
import { Button, Checkbox, Field } from "../../ui/primitives";
import { findAll, nextMatch, replaceAllText } from "./find";

/*
 * Find and replace bar for a textarea the parent owns (notepad, text editor).
 * "Find next" selects the match in the textarea; "Replace" replaces the selected match;
 * "Replace all" replaces every match in one step (the parent decides how to undo it).
 */

export function FindBar({
  text,
  setText,
  taRef,
  onClose,
  autoFocus,
}: {
  text: string;
  setText: (v: string, label: string) => void;
  taRef: RefObject<HTMLTextAreaElement | null>;
  onClose: () => void;
  autoFocus?: boolean;
}) {
  const id = useId();
  const { announce } = useTool();
  const [q, setQ] = useState("");
  const [r, setR] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [current, setCurrent] = useState(-1);
  const findRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => findAll(text, q, { matchCase, wholeWord }), [text, q, matchCase, wholeWord]);

  useEffect(() => {
    if (autoFocus) findRef.current?.focus();
  }, [autoFocus]);

  const select = (i: number) => {
    const ta = taRef.current;
    if (!ta || i < 0) return;
    const start = matches[i];
    ta.focus();
    ta.setSelectionRange(start, start + q.length);
    // Scroll the selection into view: approximate by line position.
    const line = text.slice(0, start).split("\n").length - 1;
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 24;
    ta.scrollTop = Math.max(0, line * lh - ta.clientHeight / 2);
    setCurrent(i);
    announce(`Match ${i + 1} of ${matches.length}`);
  };

  const findNext = () => {
    if (!matches.length) {
      announce("No matches");
      return;
    }
    const ta = taRef.current;
    const from = ta ? (ta.selectionStart === ta.selectionEnd ? ta.selectionStart : ta.selectionStart + 1) : 0;
    select(nextMatch(matches, from));
  };
  const findPrev = () => {
    if (!matches.length) return;
    const ta = taRef.current;
    const from = ta ? ta.selectionStart : 0;
    let i = -1;
    for (let k = matches.length - 1; k >= 0; k--)
      if (matches[k] < from) {
        i = k;
        break;
      }
    select(i === -1 ? matches.length - 1 : i);
  };
  const replaceOne = () => {
    const ta = taRef.current;
    if (!ta || !q) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const sel = text.slice(s, e);
    const isMatch = matches.includes(s) && e - s === q.length && (matchCase ? sel === q : sel.toLowerCase() === q.toLowerCase());
    if (!isMatch) {
      findNext();
      return;
    }
    const next = text.slice(0, s) + r + text.slice(e);
    setText(next, "Replace");
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + r.length, s + r.length);
    });
    announce("Replaced 1 match");
  };
  const replaceAll = () => {
    const res = replaceAllText(text, q, r, { matchCase, wholeWord });
    if (res.count) setText(res.text, "Replace all");
    announce(res.count ? `Replaced ${res.count} ${res.count === 1 ? "match" : "matches"}` : "No matches to replace");
  };

  return (
    <div className="grid gap-2 border-b border-line p-3 sm:px-4" role="search" aria-label="Find and replace">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Field label="Find" htmlFor={`${id}-f`}>
          <input
            id={`${id}-f`}
            ref={findRef}
            className="input"
            value={q}
            spellCheck={false}
            onChange={(e) => {
              setQ(e.target.value);
              setCurrent(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (e.shiftKey) findPrev();
                else findNext();
              }
              if (e.key === "Escape") onClose();
            }}
          />
        </Field>
        <Field label="Replace with" htmlFor={`${id}-r`}>
          <input
            id={`${id}-r`}
            className="input"
            value={r}
            spellCheck={false}
            onChange={(e) => setR(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Checkbox checked={matchCase} onChange={setMatchCase} label="Match case" />
        <Checkbox checked={wholeWord} onChange={setWholeWord} label="Whole words" />
        <span className="text-sm text-ink-3 tabular-nums" aria-live="off">
          {q ? (matches.length ? `${current >= 0 ? `${current + 1} of ` : ""}${matches.length} ${matches.length === 1 ? "match" : "matches"}` : "No matches") : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button icon="arrow-up" onClick={findPrev} disabled={!matches.length}>
          Previous
        </Button>
        <Button icon="arrow-down" onClick={findNext} disabled={!matches.length}>
          Find next
        </Button>
        <Button onClick={replaceOne} disabled={!matches.length}>
          Replace
        </Button>
        <Button variant="primary" onClick={replaceAll} disabled={!matches.length}>
          Replace all
        </Button>
        <Button variant="ghost" icon="x" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
