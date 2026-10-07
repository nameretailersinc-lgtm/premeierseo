"use client";

import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, Field, Panel, Segmented, StatTile, useDebounced, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { applyFix, applySafeFixes, checkText, RULE_BY_ID, RULES, type Issue, type IssueCategory, type PunctGroup } from "../lib/text/proof";
import { findMisspelled, initSpeller, spellTokens, suggestions } from "../lib/text/spell-client";
import { freBand, paragraphs, passiveHints, readability, sentences, topWords, transitionsIn, words } from "../lib/text/prose";
import { formatSummary, summarize, type SummaryFormat } from "../lib/text/summarize";
import { rewrite } from "../lib/text/plain-english";
import { Workbench } from "../lib/text/workbench";
import { WRITING_SAMPLES as SAMPLES } from "../lib/text/writing-samples";

/*
 * Writing checks. config.mode selects the tool:
 *   spelling    → Hunspell en-US dictionary (nspell in a Web Worker), suggestions, personal word list
 *   proofread   → spelling + grammar rules + punctuation rules + style hints
 *   punctuation → punctuation rule groups only (live)
 *   essay       → structure and readability report (+ spelling count)
 *   summarize   → extractive summary (picks existing sentences)
 *   rewrite     → deterministic plain-English rewrite (phrase list), long-sentence and passive flags
 * Every rule is listed in lib/text/proof.ts RULES and shown on the page. No scores are invented.
 */

type Mode = "spelling" | "proofread" | "punctuation" | "essay" | "summarize" | "rewrite";

const PERSONAL_KEY = "pss:spell:personal:v1";
const CAT_LABEL: Record<IssueCategory, string> = { spelling: "Spelling", grammar: "Grammar", punctuation: "Punctuation", style: "Style" };
const GROUP_LABEL: Record<PunctGroup, string> = {
  commas: "Commas",
  apostrophes: "Apostrophes",
  spacing: "Spacing",
  quotes: "Quotes and brackets",
  endings: "Sentence endings and capitals",
};


/* ---------- Personal dictionary (shared by all writing tools on this device) ---------- */

function usePersonalWords() {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSONAL_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the word list after mount
      if (raw) setList((JSON.parse(raw) as string[]).filter((w) => typeof w === "string").slice(0, 5000));
    } catch {
      /* ignore */
    }
  }, []);
  const save = (next: string[]) => {
    setList(next);
    try {
      localStorage.setItem(PERSONAL_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  return {
    words: list,
    set: useMemo(() => new Set(list.map((w) => w.toLowerCase())), [list]),
    add: (w: string) => save([...new Set([...list, w])].sort((a, b) => a.localeCompare(b))),
    remove: (w: string) => save(list.filter((x) => x !== w)),
    clear: () => save([]),
  };
}

/* ---------- Spelling engine hook: caches word → correct/incorrect, checks only new words ---------- */

type SpellStatus = "idle" | "loading" | "ready" | "error";

function useSpelling(text: string, enabled: boolean, british: boolean, ignoreCaps: boolean) {
  const [status, setStatus] = useState<SpellStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [bad, setBad] = useState<Set<string>>(new Set());
  const [checkedVersion, setCheckedVersion] = useState(0);
  const cache = useRef(new Map<string, boolean>());
  const modeKey = `${british}`;
  const lastKey = useRef(modeKey);
  const tokens = useMemo(() => (enabled ? spellTokens(text, { ignoreCaps }) : []), [text, enabled, ignoreCaps]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    if (lastKey.current !== modeKey) {
      cache.current.clear();
      lastKey.current = modeKey;
    }
    const fresh = [...new Set(tokens.map((t) => t.word))].filter((w) => !cache.current.has(w));
    (async () => {
      try {
        if (status !== "ready") {
          setStatus("loading");
          await initSpeller();
        }
        const miss = fresh.length ? await findMisspelled(fresh, british) : new Set<string>();
        if (cancelled) return;
        for (const w of fresh) cache.current.set(w, !miss.has(w));
        setBad(new Set([...cache.current.entries()].filter(([, ok]) => !ok).map(([w]) => w)));
        setStatus("ready");
        setCheckedVersion((v) => v + 1);
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "The dictionary couldn't be loaded.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, enabled, modeKey]);

  return { status, error, bad, tokens, checkedVersion };
}

function spellingIssues(tokens: { word: string; start: number; end: number }[], bad: Set<string>, ignored: Set<string>, personal: Set<string>): Issue[] {
  return tokens
    .filter((t) => bad.has(t.word) && !ignored.has(t.word.toLowerCase()) && !personal.has(t.word.toLowerCase()))
    .map((t) => ({ rule: "spelling", category: "spelling" as const, start: t.start, end: t.end, message: "Not in the dictionary.", replacements: [] }));
}

/* ---------- Shared UI pieces ---------- */

function Context({ text, issue }: { text: string; issue: Pick<Issue, "start" | "end"> }) {
  const a = Math.max(0, issue.start - 40);
  const b = Math.min(text.length, issue.end + 40);
  const before = text.slice(a, issue.start).replace(/\s+/g, " ");
  const hit = text.slice(issue.start, issue.end);
  const after = text.slice(issue.end, b).replace(/\s+/g, " ");
  return (
    <p className="text-sm break-words text-ink-2">
      {a > 0 && "…"}
      {before}
      <mark className="rounded-sm bg-warning-subtle px-0.5 text-ink outline outline-1 outline-warning-line">{hit.replace(/ /g, " ") || " "}</mark>
      {after}
      {b < text.length && "…"}
    </p>
  );
}

function MarkedText({ text, issues }: { text: string; issues: Issue[] }) {
  const parts: ReactNode[] = [];
  let pos = 0;
  issues.forEach((i, k) => {
    if (i.start < pos) return;
    parts.push(<Fragment key={`t${k}`}>{text.slice(pos, i.start)}</Fragment>);
    const cls =
      i.category === "spelling"
        ? "decoration-danger underline decoration-wavy decoration-2"
        : i.hint
          ? "bg-surface-2 underline decoration-dotted decoration-2"
          : "bg-warning-subtle underline decoration-warning decoration-2";
    parts.push(
      <mark key={`m${k}`} className={`rounded-sm bg-transparent text-ink ${cls}`} title={i.message}>
        {text.slice(i.start, i.end) || " "}
      </mark>,
    );
    pos = i.end;
  });
  parts.push(<Fragment key="end">{text.slice(pos)}</Fragment>);
  return <div className="max-h-[28rem] overflow-auto p-3 text-base whitespace-pre-wrap break-words sm:px-4">{parts}</div>;
}

function InputPanel({
  id,
  label,
  text,
  setText,
  sample,
  onUse,
  footer,
  actions,
  minLg = "20rem",
}: {
  id: string;
  label: string;
  text: string;
  setText: (v: string) => void;
  sample: string;
  onUse: (m: string) => void;
  footer?: ReactNode;
  actions?: ReactNode;
  minLg?: string;
}) {
  const [undo, setUndo] = useState<string | null>(null);
  return (
    <Panel
      as="div"
      title={<label htmlFor={id}>{label}</label>}
      actions={
        <>
          {actions}
          <Button
            variant="ghost"
            icon="sparkles"
            onClick={() => {
              if (text && text !== sample) setUndo(text);
              setText(sample);
              onUse("example");
            }}
          >
            Example
          </Button>
          <Button
            variant="ghost"
            icon="trash"
            disabled={!text}
            onClick={() => {
              setUndo(text);
              setText("");
            }}
          >
            Clear
          </Button>
        </>
      }
      footer={
        <>
          {footer}
          {undo !== null && (
            <button
              type="button"
              className="font-semibold text-accent underline"
              onClick={() => {
                setText(undo);
                setUndo(null);
              }}
            >
              Undo clear
            </button>
          )}
        </>
      }
    >
      <textarea
        id={id}
        className="textarea rounded-none border-0"
        style={{ ["--ta-min" as string]: "14rem", ["--ta-min-lg" as string]: minLg }}
        placeholder="Paste or type your text here"
        value={text}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          onUse("type");
        }}
        onPaste={() => onUse("paste")}
      />
    </Panel>
  );
}

/* ---------- Issue list (spelling grouped by word, other issues one per occurrence) ---------- */

function IssueList({
  text,
  issues,
  onApply,
  onReplaceWord,
  onIgnoreWord,
  onAddWord,
  onIgnoreIssue,
}: {
  text: string;
  issues: Issue[];
  onApply: (i: Issue, rep: string) => void;
  onReplaceWord: (word: string, rep: string) => void;
  onIgnoreWord: (word: string) => void;
  onAddWord: (word: string) => void;
  onIgnoreIssue: (i: Issue) => void;
}) {
  const [sugg, setSugg] = useState<Record<string, string[] | "loading">>({});
  const spellGroups = useMemo(() => {
    const m = new Map<string, Issue[]>();
    for (const i of issues) if (i.category === "spelling") m.set(text.slice(i.start, i.end), [...(m.get(text.slice(i.start, i.end)) ?? []), i]);
    return [...m.entries()];
  }, [issues, text]);
  const others = issues.filter((i) => i.category !== "spelling");

  // Load suggestions for the first 40 misspelled words automatically (fast, in the worker).
  useEffect(() => {
    let cancelled = false;
    const todo = spellGroups.map(([w]) => w).filter((w) => !sugg[w]).slice(0, 40);
    if (!todo.length) return;
    (async () => {
      for (const w of todo) {
        if (cancelled) return;
        try {
          const s = await suggestions(w.replace(/’/g, "'"));
          if (!cancelled) setSugg((x) => ({ ...x, [w]: s }));
        } catch {
          if (!cancelled) setSugg((x) => ({ ...x, [w]: [] }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spellGroups, sugg]);

  return (
    <ol className="grid gap-2">
      {spellGroups.map(([word, list]) => {
        const s = sugg[word];
        return (
          <li key={`s-${word}`} className="rounded-md border border-line p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">
                <span className="text-danger">{word}</span>
                {list.length > 1 && <span className="ml-2 text-sm font-normal text-ink-3">{list.length} times</span>}
              </p>
              <span className="chip">Spelling</span>
            </div>
            <Context text={text} issue={list[0]} />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {s === undefined || s === "loading" ? (
                <span className="text-sm text-ink-3">Finding suggestions…</span>
              ) : s.length ? (
                s.map((r) => (
                  <Button key={r} variant="secondary" onClick={() => onReplaceWord(word, r)} aria-label={`Replace ${word} with ${r}${list.length > 1 ? " everywhere" : ""}`}>
                    {r}
                  </Button>
                ))
              ) : (
                <span className="text-sm text-ink-3">No suggestions. Check the word yourself.</span>
              )}
              <Button variant="ghost" onClick={() => onIgnoreWord(word)}>
                Ignore
              </Button>
              <Button variant="ghost" icon="plus" onClick={() => onAddWord(word)}>
                Add to my dictionary
              </Button>
            </div>
          </li>
        );
      })}
      {others.map((i) => {
        const rule = RULE_BY_ID.get(i.rule);
        return (
          <li key={`${i.rule}-${i.start}-${i.end}`} className="rounded-md border border-line p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{rule?.name ?? i.rule}</p>
              <span className="flex gap-1">
                <span className="chip">{CAT_LABEL[i.category]}</span>
                {i.hint && <span className="chip">Hint</span>}
              </span>
            </div>
            <Context text={text} issue={i} />
            <p className="mt-1 text-sm">{i.message}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {i.replacements.map((r) => (
                <Button key={r} variant="secondary" onClick={() => onApply(i, r)}>
                  {r === "" ? "Delete" : r.trim() === "" ? "Use one space" : `Change to “${r}”`}
                </Button>
              ))}
              <Button variant="ghost" onClick={() => onIgnoreIssue(i)}>
                Ignore
              </Button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function RulesList({ ids }: { ids?: string[] }) {
  const list = ids ? RULES.filter((r) => ids.includes(r.id)) : RULES;
  return (
    <details className="panel p-3 sm:p-4">
      <summary className="cursor-pointer text-sm font-semibold">What this checker looks for ({list.length} rules)</summary>
      <ul className="mt-3 grid gap-2 text-sm">
        {list.map((r) => (
          <li key={r.id}>
            <span className="font-semibold">{r.name}</span>
            {r.hint && <span className="ml-1 text-ink-3">(hint)</span>}: {r.description}
          </li>
        ))}
      </ul>
    </details>
  );
}

/* ---------- Checker: spelling / proofread / punctuation ---------- */

const ALL_GROUPS: PunctGroup[] = ["commas", "apostrophes", "spacing", "quotes", "endings"];

function Checker({ toolId, mode }: { toolId: string; mode: "spelling" | "proofread" | "punctuation" }) {
  const id = useId();
  const { used, announce, completed, error: trackError } = useTool();
  const [text, setText] = useSessionText(toolId);
  const [o, setO] = usePersistentOptions(toolId, { british: false, ignoreCaps: true, hints: true, groups: ALL_GROUPS as string[], filter: "all" });
  const [started, setStarted] = useState(mode === "punctuation");
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [ignoredIssues, setIgnoredIssues] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"list" | "marked">("list");
  const [fixNote, setFixNote] = useState<string | null>(null);
  const personal = usePersonalWords();
  const dText = useDebounced(text, text.length > 20_000 ? 600 : 300);
  const spellOn = started && mode !== "punctuation";
  const spell = useSpelling(dText, spellOn, o.british, o.ignoreCaps);
  const stale = dText !== text;

  const ruleIssues = useMemo(() => {
    if (!started || mode === "spelling") return [];
    const cats: IssueCategory[] = mode === "punctuation" ? ["punctuation", "grammar"] : ["grammar", "punctuation", "style"];
    return checkText(dText, { categories: cats, groups: mode === "punctuation" ? (o.groups as PunctGroup[]) : undefined });
  }, [dText, started, mode, o.groups]);

  const issues = useMemo(() => {
    const sp = spellOn ? spellingIssues(spell.tokens, spell.bad, ignored, personal.set) : [];
    const key = (i: Issue) => `${i.rule}:${dText.slice(i.start, i.end)}:${i.start}`;
    return [...sp, ...ruleIssues]
      .filter((i) => (o.hints || !i.hint) && !ignoredIssues.has(key(i)))
      .sort((a, b) => a.start - b.start);
  }, [spellOn, spell.tokens, spell.bad, ignored, personal.set, ruleIssues, o.hints, ignoredIssues, dText]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: issues.length, spelling: 0, grammar: 0, punctuation: 0, style: 0 };
    for (const i of issues) c[i.category]++;
    return c;
  }, [issues]);
  const shown = o.filter === "all" ? issues : issues.filter((i) => i.category === o.filter);

  const ready = !spellOn || spell.status === "ready";
  const lastAnnounced = useRef("");
  useEffect(() => {
    if (!started || !ready || stale) return;
    const msg = issues.length ? `${issues.length} ${issues.length === 1 ? "issue" : "issues"} found` : "No issues found";
    if (msg !== lastAnnounced.current) {
      lastAnnounced.current = msg;
      announce(msg);
      completed("check", { issues: issues.length });
    }
  }, [issues, started, ready, stale, announce, completed]);

  useEffect(() => {
    if (spell.status === "error") trackError("DICT_LOAD_FAILED", "load");
  }, [spell.status, trackError]);

  const apply = (i: Issue, rep: string) => {
    if (text !== dText) return; // offsets belong to the last checked version
    setText(applyFix(text, i, rep));
    announce("Change applied");
  };
  const replaceWord = (word: string, rep: string) => {
    if (text !== dText) return;
    const list = issues.filter((i) => i.category === "spelling" && text.slice(i.start, i.end) === word).sort((a, b) => b.start - a.start);
    let out = text;
    for (const i of list) out = out.slice(0, i.start) + rep + out.slice(i.end);
    setText(out);
    announce(`Replaced ${word} with ${rep}${list.length > 1 ? ` in ${list.length} places` : ""}`);
  };
  const ignoreIssue = (i: Issue) => {
    setIgnoredIssues(new Set([...ignoredIssues, `${i.rule}:${dText.slice(i.start, i.end)}:${i.start}`]));
  };
  const safeCount = issues.filter((i) => RULE_BY_ID.get(i.rule)?.autofix).length;

  const btnLabel = mode === "spelling" ? "Check spelling" : mode === "proofread" ? "Proofread" : "Check punctuation";
  const status =
    !started ? (
      <span>Press {btnLabel} to start.</span>
    ) : spellOn && spell.status === "loading" ? (
      <span>Loading the dictionary (about 550 KB, once)…</span>
    ) : stale ? (
      <span>Checking…</span>
    ) : (
      <span>
        {words(dText).length.toLocaleString("en-US")} words checked · {issues.length ? `${issues.length} ${issues.length === 1 ? "issue" : "issues"}` : "no issues found"}
      </span>
    );

  return (
    <div className="grid gap-4">
      {mode !== "spelling" && (
        <Alert tone="info">
          {mode === "proofread"
            ? "Checks spelling against a Hunspell US English dictionary plus the grammar, punctuation and style rules listed below. It is rule-based, not AI: it catches common mistakes but can't understand meaning, so read each suggestion before accepting it."
            : "Checks the punctuation rules listed below. Rules marked “hint” are patterns that are often, not always, wrong."}
        </Alert>
      )}
      <div className="panel grid gap-3 p-3 sm:p-4">
        {mode === "punctuation" ? (
          <fieldset>
            <legend className="field-label">Rule groups</legend>
            <div className="flex flex-wrap gap-x-5">
              {ALL_GROUPS.map((g) => (
                <Checkbox
                  key={g}
                  checked={o.groups.includes(g)}
                  onChange={(v) => setO({ ...o, groups: v ? [...o.groups, g] : o.groups.filter((x) => x !== g) })}
                  label={GROUP_LABEL[g]}
                />
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="flex flex-wrap gap-x-5">
            <Checkbox checked={o.british} onChange={(v) => setO({ ...o, british: v })} label="Accept British spellings" help="colour, organise, centre, travelled, defence" />
            <Checkbox checked={o.ignoreCaps} onChange={(v) => setO({ ...o, ignoreCaps: v })} label="Ignore words in CAPITALS" help="Acronyms such as NASA or API" />
          </div>
        )}
        {mode !== "spelling" && <Checkbox checked={o.hints} onChange={(v) => setO({ ...o, hints: v })} label="Show hints" help="Patterns that are often, but not always, mistakes" />}
        {!started && (
          <div>
            <Button
              variant="primary"
              size="lg"
              icon="circle-check"
              disabled={!text.trim()}
              onClick={() => {
                setStarted(true);
                used("check");
              }}
            >
              {btnLabel}
            </Button>
            <p className="mt-1 text-sm text-ink-3">After the first check, results update as you edit.</p>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <InputPanel
          id={`${id}-t`}
          label="Your text"
          text={text}
          setText={setText}
          sample={SAMPLES[mode]}
          onUse={used}
          footer={status}
          actions={<CopyButton text={text} disabled={!text} variant="ghost" />}
          minLg="26rem"
        />
        <section className="panel min-w-0" aria-labelledby={`${id}-rh`}>
          <div className="panel-header">
            <h2 id={`${id}-rh`} className="text-sm font-semibold">
              {started ? `Results${issues.length ? ` (${issues.length})` : ""}` : "Results"}
            </h2>
            {started && issues.length > 0 && (
              <Segmented
                legend="Show results as"
                hideLegend
                value={view}
                onChange={setView}
                options={[
                  { value: "list", label: "List" },
                  { value: "marked", label: "Marked text" },
                ]}
              />
            )}
          </div>
          <div className="min-h-64 p-3 sm:p-4">
            {spell.status === "error" && spellOn ? (
              <div role="alert">
                <Alert tone="danger">The spelling dictionary couldn&apos;t be loaded ({spell.error}). Check your connection and reload the page.</Alert>
              </div>
            ) : !started ? (
              <p className="text-sm text-ink-3">Results appear here: each issue with the rule it breaks and a suggested fix you can accept or ignore.</p>
            ) : !ready ? (
              <p className="text-sm text-ink-3">Preparing the dictionary…</p>
            ) : !issues.length ? (
              <Alert tone="success">
                {mode === "spelling"
                  ? "Every word is in the dictionary (or your word list). A spell checker can't catch real words used wrongly, such as “there” for “their”."
                  : "Nothing found by these rules. Automated checks miss errors of meaning, so a final read-through is still worth it."}
              </Alert>
            ) : (
              <div className="grid gap-3">
                {mode !== "spelling" && (
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter results">
                    {(["all", "spelling", "grammar", "punctuation", "style"] as const)
                      .filter((c) => c === "all" || counts[c] > 0)
                      .map((c) => (
                        <Button key={c} variant={o.filter === c ? "primary" : "secondary"} aria-pressed={o.filter === c} onClick={() => setO({ ...o, filter: c })}>
                          {c === "all" ? "All" : CAT_LABEL[c]} {counts[c]}
                        </Button>
                      ))}
                    {safeCount > 0 && (
                      <Button
                        variant="ghost"
                        icon="check"
                        onClick={() => {
                          const r = applySafeFixes(text, issues);
                          setText(r.text);
                          setFixNote(`${r.count} spacing ${r.count === 1 ? "fix" : "fixes"} applied`);
                          announce(`${r.count} spacing fixes applied`);
                        }}
                      >
                        Fix all spacing ({safeCount})
                      </Button>
                    )}
                  </div>
                )}
                {fixNote && <p className="text-sm text-ink-3">{fixNote}</p>}
                {view === "marked" ? (
                  <MarkedText text={dText} issues={shown} />
                ) : (
                  <IssueList
                    text={dText}
                    issues={shown.slice(0, 200)}
                    onApply={apply}
                    onReplaceWord={replaceWord}
                    onIgnoreWord={(w) => {
                      setIgnored(new Set([...ignored, w.toLowerCase()]));
                      announce(`${w} ignored for this session`);
                    }}
                    onAddWord={(w) => {
                      personal.add(w);
                      announce(`${w} added to your dictionary`);
                    }}
                    onIgnoreIssue={ignoreIssue}
                  />
                )}
                {shown.length > 200 && <p className="text-sm text-ink-3">Showing the first 200 of {shown.length}. Fix these and the rest will appear.</p>}
              </div>
            )}
          </div>
        </section>
      </div>

      {mode !== "punctuation" && (
        <details className="panel p-3 sm:p-4">
          <summary className="cursor-pointer text-sm font-semibold">My dictionary ({personal.words.length} words, saved in this browser)</summary>
          {personal.words.length ? (
            <div className="mt-3 grid gap-2">
              <ul className="flex flex-wrap gap-1.5">
                {personal.words.map((w) => (
                  <li key={w}>
                    <Button variant="secondary" icon="x" aria-label={`Remove ${w} from my dictionary`} onClick={() => personal.remove(w)}>
                      {w}
                    </Button>
                  </li>
                ))}
              </ul>
              <div>
                <Button variant="ghost" icon="trash" onClick={personal.clear}>
                  Remove all words
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-3">Words you add with “Add to my dictionary” are kept here, on this device only, and are never reported as misspelled.</p>
          )}
        </details>
      )}
      {mode !== "spelling" && <RulesList ids={mode === "punctuation" ? RULES.filter((r) => r.group).map((r) => r.id) : undefined} />}
    </div>
  );
}

/* ---------- Essay report ---------- */

function Essay({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [text, setText] = useSessionText(toolId);
  const [o, setO] = usePersistentOptions(toolId, { target: "1000", british: false });
  const [started, setStarted] = useState(false);
  const dText = useDebounced(text, 500);
  const spell = useSpelling(dText, started, o.british, true);
  const personal = usePersonalWords();

  const report = useMemo(() => {
    if (!started || !dText.trim()) return null;
    const paras = paragraphs(dText);
    const sents = sentences(dText);
    const lens = sents.map((s) => words(s.text).length);
    const r = readability(dText, sents.length);
    const mean = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
    const sd = lens.length ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) : 0;
    const starters = new Map<string, number>();
    for (const s of sents) {
      const w = (words(s.text)[0] ?? "").toLowerCase();
      if (w) starters.set(w, (starters.get(w) ?? 0) + 1);
    }
    return {
      words: words(dText).length,
      chars: [...dText].length,
      sents,
      paras: paras.map((p) => {
        const ps = sents.filter((s) => s.start >= p.start && s.end <= p.end + 1);
        const pr = readability(p.text, Math.max(1, ps.length));
        return { text: p.text, words: words(p.text).length, sentences: ps.length, fre: pr?.fre ?? null, transitions: transitionsIn(p.text) };
      }),
      r,
      mean,
      sd,
      shortest: lens.length ? Math.min(...lens) : 0,
      longest: lens.length ? Math.max(...lens) : 0,
      buckets: [lens.filter((n) => n < 10).length, lens.filter((n) => n >= 10 && n <= 20).length, lens.filter((n) => n > 20 && n <= 30).length, lens.filter((n) => n > 30).length],
      long: sents.filter((s) => words(s.text).length > 30),
      passive: passiveHints(dText),
      top: topWords(dText, 10),
      starters: [...starters.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]),
      transitions: transitionsIn(dText),
    };
  }, [dText, started]);

  const misspelled = useMemo(() => {
    if (spell.status !== "ready") return [];
    const set = new Map<string, number>();
    for (const t of spell.tokens) if (spell.bad.has(t.word) && !personal.set.has(t.word.toLowerCase())) set.set(t.word, (set.get(t.word) ?? 0) + 1);
    return [...set.entries()];
  }, [spell.status, spell.tokens, spell.bad, personal.set]);

  useEffect(() => {
    if (report) {
      announce(`Report ready: ${report.words} words, ${report.sents.length} sentences, ${report.paras.length} paragraphs`);
      completed("analyze");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.words, report?.sents.length, report?.paras.length]);

  const target = Math.max(0, Math.floor(Number(o.target) || 0));
  const fmt = (n: number, d = 1) => n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <InputPanel
          id={`${id}-t`}
          label="Your essay"
          text={text}
          setText={setText}
          sample={SAMPLES.essay}
          onUse={used}
          footer={<span>{words(text).length.toLocaleString("en-US")} words</span>}
          minLg="24rem"
        />
        <div className="panel grid content-start gap-3 p-3 sm:p-4">
          <Field label="Target word count" htmlFor={`${id}-tg`} help="0 = no target">
            <input id={`${id}-tg`} type="number" min={0} className="input" value={o.target} onChange={(e) => setO({ ...o, target: e.target.value })} />
          </Field>
          <Checkbox checked={o.british} onChange={(v) => setO({ ...o, british: v })} label="Accept British spellings" />
          <Button
            variant="primary"
            size="lg"
            icon="scan-text"
            disabled={!text.trim()}
            onClick={() => {
              setStarted(true);
              used("analyze");
            }}
          >
            {started ? "Report updates as you type" : "Analyze essay"}
          </Button>
          <p className="text-sm text-ink-3">Measures structure and readability. It doesn&apos;t grade the essay, check facts or detect plagiarism.</p>
        </div>
      </div>

      {!report ? (
        <div className="panel min-h-40 p-4 text-sm text-ink-3">Press Analyze essay for a report on length, readability, sentence variety, paragraphs, transitions and repeated words.</div>
      ) : (
        <div className="grid gap-4" aria-live="off">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Words" value={report.words.toLocaleString("en-US")} sub={target ? `${Math.round((report.words / target) * 100)}% of ${target.toLocaleString("en-US")}` : undefined} />
            <StatTile label="Sentences" value={report.sents.length.toLocaleString("en-US")} sub={`${fmt(report.mean)} words on average`} />
            <StatTile label="Paragraphs" value={report.paras.length} sub={`${fmt(report.words / Math.max(1, report.paras.length), 0)} words on average`} />
            <StatTile label="Reading time" value={`${Math.max(1, Math.round(report.words / 238))} min`} sub="at 238 words per minute" />
            <StatTile label="Flesch Reading Ease" value={report.r ? fmt(report.r.fre) : "—"} sub={report.r ? freBand(report.r.fre) : undefined} />
            <StatTile label="Flesch–Kincaid grade" value={report.r ? fmt(report.r.fkgl) : "—"} sub="US school grade" />
            <StatTile label="Possible passive" value={report.passive.length} sub="hints, not errors" />
            <StatTile label="Spelling" value={spell.status === "ready" ? misspelled.length : "…"} sub={spell.status === "ready" ? "words not in the dictionary" : "loading dictionary"} />
          </div>
          {target > 0 && (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${report.words} of ${target} target words`}>
                <div className={`h-full ${report.words > target * 1.1 ? "bg-warning" : "bg-accent"}`} style={{ width: `${Math.min(100, (report.words / target) * 100)}%` }} />
              </div>
              <p className="mt-1 text-sm text-ink-3">
                {report.words < target ? `${(target - report.words).toLocaleString("en-US")} words to go.` : report.words > target * 1.1 ? `${(report.words - target).toLocaleString("en-US")} words over target (more than 10%).` : "Within 10% of the target."}
              </p>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="panel p-3 sm:p-4">
              <h2 className="text-sm font-semibold">Readability</h2>
              {report.r && (
                <p className="mt-2 text-sm">
                  {fmt(report.r.wordsPerSentence)} words per sentence and {fmt(report.r.syllablesPerWord, 2)} syllables per word (estimated). Reading Ease = 206.835 − 1.015 ×{" "}
                  {fmt(report.r.wordsPerSentence)} − 84.6 × {fmt(report.r.syllablesPerWord, 2)} = <strong>{fmt(report.r.fre)}</strong>. Grade = 0.39 × {fmt(report.r.wordsPerSentence)} + 11.8 ×{" "}
                  {fmt(report.r.syllablesPerWord, 2)} − 15.59 = <strong>{fmt(report.r.fkgl)}</strong>.
                </p>
              )}
              <h3 className="mt-4 text-sm font-semibold">Sentence variety</h3>
              <p className="mt-1 text-sm">
                Shortest {report.shortest} words, longest {report.longest}, standard deviation {fmt(report.sd)} words{report.sd < 4 && report.sents.length > 4 ? " (sentences are very similar in length)" : ""}.
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-1 text-sm tabular-nums sm:grid-cols-4">
                {["Under 10", "10–20", "21–30", "Over 30"].map((l, i) => (
                  <li key={l} className="rounded-md border border-line p-2">
                    <span className="block text-lg font-semibold">{report.buckets[i]}</span>
                    {l} words
                  </li>
                ))}
              </ul>
            </section>
            <section className="panel p-3 sm:p-4">
              <h2 className="text-sm font-semibold">Transitions and repeated words</h2>
              <p className="mt-2 text-sm">
                {report.transitions.length
                  ? `${report.transitions.length} transition words or phrases: ${[...new Set(report.transitions)].slice(0, 12).join(", ")}.`
                  : "No transition words found (however, for example, therefore, in conclusion…). They help readers follow the argument between sentences and paragraphs."}
              </p>
              <h3 className="mt-3 text-sm font-semibold">Most-used words (common words excluded)</h3>
              <ol className="mt-1 grid gap-0.5 text-sm">
                {report.top.map((t) => (
                  <li key={t.word} className="flex justify-between gap-2">
                    <span>{t.word}</span>
                    <span className="text-ink-3 tabular-nums">
                      {t.count} · {((t.count / Math.max(1, report.words)) * 100).toFixed(1)}%{t.count / report.words > 0.025 && t.count >= 4 ? " (check for repetition)" : ""}
                    </span>
                  </li>
                ))}
              </ol>
              {report.starters.length > 0 && (
                <p className="mt-2 text-sm">
                  Sentences often start with the same word: {report.starters.map(([w, n]) => `“${w}” ${n}×`).join(", ")}.
                </p>
              )}
            </section>
          </div>

          <section className="panel min-w-0">
            <div className="panel-header">
              <h2 className="text-sm font-semibold">Paragraph by paragraph</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-line">
                    <th className="p-2">#</th>
                    <th className="p-2">Starts with</th>
                    <th className="p-2">Words</th>
                    <th className="p-2">Sentences</th>
                    <th className="p-2">Reading Ease</th>
                    <th className="p-2">Transitions</th>
                    <th className="p-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {report.paras.map((p, i) => (
                    <tr key={i} className="border-b border-line align-top last:border-b-0">
                      <td className="p-2">{i + 1}</td>
                      <td className="max-w-56 truncate p-2">{p.text.slice(0, 60)}</td>
                      <td className="p-2">{p.words}</td>
                      <td className="p-2">{p.sentences}</td>
                      <td className="p-2">{p.fre === null ? "—" : fmt(p.fre)}</td>
                      <td className="p-2">{p.transitions.length ? [...new Set(p.transitions)].join(", ") : "—"}</td>
                      <td className="p-2">{p.sentences === 1 && p.words > 15 ? "One-sentence paragraph" : p.words > 200 ? "Long paragraph; consider splitting" : p.words < 40 && report.paras.length > 2 && i > 0 && i < report.paras.length - 1 ? "Short body paragraph" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="panel p-3 sm:p-4">
              <h2 className="text-sm font-semibold">Long sentences (over 30 words): {report.long.length}</h2>
              <ol className="mt-2 grid gap-2 text-sm">
                {report.long.slice(0, 10).map((s) => (
                  <li key={s.start}>
                    <span className="text-ink-3">{words(s.text).length} words:</span> {s.text}
                  </li>
                ))}
              </ol>
              <h2 className="mt-4 text-sm font-semibold">Possible passive voice: {report.passive.length}</h2>
              <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
                {report.passive.slice(0, 20).map((p) => (
                  <li key={p.start} className="chip">
                    {p.text}
                  </li>
                ))}
              </ul>
            </section>
            <section className="panel p-3 sm:p-4">
              <h2 className="text-sm font-semibold">Spelling</h2>
              {spell.status === "error" ? (
                <Alert tone="warning">The dictionary couldn&apos;t be loaded, so spelling wasn&apos;t checked.</Alert>
              ) : spell.status !== "ready" ? (
                <p className="mt-2 text-sm text-ink-3">Loading the dictionary…</p>
              ) : misspelled.length ? (
                <>
                  <p className="mt-2 text-sm">Words not in the US English dictionary. Fix them in the text, or use the spell checker for suggestions.</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
                    {misspelled.map(([w, n]) => (
                      <li key={w} className="chip">
                        {w}
                        {n > 1 ? ` ×${n}` : ""}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-2 text-sm">Every word is in the dictionary.</p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Summarizer ---------- */

function Summarizer({ toolId }: { toolId: string }) {
  const { completed } = useTool();
  const [text, setText] = useSessionText(toolId);
  const [o, setO] = usePersistentOptions(toolId, { length: "short", count: 3, format: "paragraph" as SummaryFormat });
  const dText = useDebounced(text, 300);
  const total = useMemo(() => sentences(dText).length, [dText]);
  const count = o.length === "custom" ? Math.max(1, Math.floor(Number(o.count) || 1)) : Math.max(1, Math.round(total * (o.length === "short" ? 0.15 : o.length === "medium" ? 0.25 : 0.4)));
  const res = useMemo(() => (dText.trim() ? summarize(dText, o.format === "tldr" ? 1 : count) : null), [dText, count, o.format]);
  const output = res ? formatSummary(res, o.format) : "";
  const tooShort = total > 0 && total < 3;
  const pickedWords = res ? res.picked.reduce((a, s) => a + words(s.text).length, 0) : 0;
  const allWords = words(dText).length;
  const done = useRef("");
  useEffect(() => {
    if (output && done.current !== output) {
      done.current = output;
      completed("summarize");
    }
  }, [output, completed]);

  return (
    <Workbench
      toolId={toolId}
      input={text}
      setInput={setText}
      sample={SAMPLES.summarize}
      output={tooShort ? "" : output}
      inputLabel="Text to summarize"
      outputLabel="Summary"
      placeholder="Paste an article, report or essay (at least a few paragraphs)"
      notice="This summarizer picks the most representative existing sentences from your text (extractive summary). It doesn't rewrite or add anything, and it isn't AI."
      error={tooShort ? "The text has fewer than 3 sentences, so there is nothing to shorten." : null}
      note={res && !tooShort ? `${res.picked.length} of ${total} sentences · ${pickedWords} of ${allWords} words (${Math.round((pickedWords / Math.max(1, allWords)) * 100)}%)` : undefined}
      options={
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Segmented
            legend="Length"
            value={o.length}
            onChange={(v) => setO({ ...o, length: v })}
            options={[
              { value: "short", label: "Short (15%)" },
              { value: "medium", label: "Medium (25%)" },
              { value: "long", label: "Long (40%)" },
              { value: "custom", label: "Sentences…" },
            ]}
          />
          {o.length === "custom" && (
            <Field label="Number of sentences" htmlFor={`${toolId}-n`} className="w-40">
              <input id={`${toolId}-n`} type="number" min={1} max={100} className="input" value={o.count} onChange={(e) => setO({ ...o, count: Number(e.target.value) || 1 })} />
            </Field>
          )}
          <Segmented
            legend="Format"
            value={o.format}
            onChange={(v) => setO({ ...o, format: v })}
            options={[
              { value: "paragraph", label: "Paragraph" },
              { value: "bullets", label: "Bullet points" },
              { value: "tldr", label: "TL;DR (1 sentence)" },
            ]}
          />
        </div>
      }
      below={
        res &&
        !tooShort && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <details className="panel p-3 sm:p-4" open>
              <summary className="cursor-pointer text-sm font-semibold">Which sentences were picked</summary>
              <p className="mt-2 text-sm text-ink-3">Picked sentences are highlighted; the number is each sentence&apos;s score (shared key terms, adjusted for length and position).</p>
              <ol className="mt-2 grid gap-1.5 text-sm">
                {res.sentences.map((s) => (
                  <li key={s.index} className={`flex gap-2 rounded-sm px-1.5 py-1 ${s.picked ? "bg-accent-subtle" : ""}`}>
                    <span className="w-10 shrink-0 text-ink-3 tabular-nums">{s.score.toFixed(2)}</span>
                    <span>
                      {s.picked && <span className="sr-only">Picked: </span>}
                      {s.text}
                    </span>
                  </li>
                ))}
              </ol>
            </details>
            <div className="panel content-start p-3 sm:p-4">
              <p className="text-sm font-semibold">Key terms</p>
              {res.keyTerms.length ? (
                <ol className="mt-2 grid gap-1 text-sm">
                  {res.keyTerms.map((k) => (
                    <li key={k.term} className="flex justify-between gap-2">
                      <span>{k.term}</span>
                      <span className="text-ink-3 tabular-nums">{k.count}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-ink-3">No word is repeated often enough to be a key term.</p>
              )}
            </div>
          </div>
        )
      }
    />
  );
}

/* ---------- Plain-English rewriter ---------- */

function Rewriter({ toolId }: { toolId: string }) {
  const { completed } = useTool();
  const [text, setText] = useSessionText(toolId);
  const [o, setO] = usePersistentOptions(toolId, { wordy: true, simpler: true, fillers: false });
  const dText = useDebounced(text, 250);
  const res = useMemo(() => (dText.trim() ? rewrite(dText, o) : null), [dText, o]);
  const done = useRef(0);
  const markDone = useCallback(() => {
    if (res && res.changes.length && done.current !== res.changes.length) {
      done.current = res.changes.length;
      completed("rewrite", { changes: res.changes.length });
    }
  }, [res, completed]);
  useEffect(markDone, [markDone]);

  return (
    <Workbench
      toolId={toolId}
      input={text}
      setInput={setText}
      sample={SAMPLES.rewrite}
      output={res ? res.output : ""}
      inputLabel="Sentence or paragraph"
      outputLabel="Plainer version"
      notice="Rule-based plain-English rewriter: it swaps wordy phrases and formal words from a fixed list for shorter ones and flags long or passive sentences. It doesn't paraphrase, change tone or use AI. Review every change before you use it."
      note={res ? `${res.changes.length} ${res.changes.length === 1 ? "change" : "changes"} · ${words(dText).length} → ${words(res.output).length} words` : undefined}
      options={
        <div className="flex flex-wrap gap-x-6">
          <Checkbox checked={o.wordy} onChange={(v) => setO({ ...o, wordy: v })} label="Shorten wordy phrases" help="in order to → to, due to the fact that → because" />
          <Checkbox checked={o.simpler} onChange={(v) => setO({ ...o, simpler: v })} label="Use everyday words" help="utilize → use, commence → start" />
          <Checkbox checked={o.fillers} onChange={(v) => setO({ ...o, fillers: v })} label="Remove filler words" help="very, really, basically, actually…" />
        </div>
      }
      below={
        res && (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="panel p-3 sm:p-4">
              <h2 className="text-sm font-semibold">Changes made ({res.changes.length})</h2>
              {res.changes.length ? (
                <ol className="mt-2 grid gap-1 text-sm">
                  {res.changes.map((c, i) => (
                    <li key={i}>
                      <span className="line-through decoration-danger">{c.from}</span> → {c.to ? <strong>{c.to}</strong> : <span className="text-ink-3">(deleted)</span>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-ink-3">No phrases from the list were found.</p>
              )}
            </section>
            <section className="panel p-3 sm:p-4">
              <h2 className="text-sm font-semibold">Worth a manual look</h2>
              {res.longSentences.length === 0 && res.passive.length === 0 ? (
                <p className="mt-2 text-sm text-ink-3">No long sentences or passive constructions found.</p>
              ) : (
                <ul className="mt-2 grid gap-2 text-sm">
                  {res.longSentences.map((s) => (
                    <li key={`l${s.start}`}>
                      <span className="chip">Long: {words(s.text).length} words</span> {s.text.slice(0, 120)}
                      {s.text.length > 120 ? "…" : ""} <span className="text-ink-3">Try splitting it at “and”, “but”, “which” or a semicolon.</span>
                    </li>
                  ))}
                  {res.passive.map((p) => (
                    <li key={`p${p.start}`}>
                      <span className="chip">Passive?</span> “{p.text}”. <span className="text-ink-3">Consider naming who does the action.</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )
      }
    />
  );
}

export default function WritingCheck({ toolId, config }: WidgetProps) {
  const mode = String(config?.mode ?? "proofread") as Mode;
  if (mode === "essay") return <Essay toolId={toolId} />;
  if (mode === "summarize") return <Summarizer toolId={toolId} />;
  if (mode === "rewrite") return <Rewriter toolId={toolId} />;
  if (mode === "spelling" || mode === "punctuation") return <Checker key={mode} toolId={toolId} mode={mode} />;
  return <Checker toolId={toolId} mode="proofread" />;
}
