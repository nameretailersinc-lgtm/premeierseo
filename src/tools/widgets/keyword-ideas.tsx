"use client";

import { useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, DownloadButton, Field, Panel, StatTile, stamp, useDebounced, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { toCsv } from "../lib/seo/api";
import { IDEA_GROUPS, expandIdeas, type IdeaGroup } from "../lib/seo/keywords";

export default function KeywordIdeas({ toolId }: WidgetProps) {
  const id = useId();
  const { used, completed } = useTool();
  const [seed, setSeed] = useState("");
  const [compare, setCompare] = useState("");
  const [location, setLocation] = useState("");
  const [filter, setFilter] = useState("");
  const [o, setO] = usePersistentOptions(toolId, { groups: IDEA_GROUPS as string[] });
  const deb = useDebounced({ seed, compare, location, groups: o.groups }, 150);
  const ideas = useMemo(() => expandIdeas(deb.seed, { compare: deb.compare, location: deb.location, groups: IDEA_GROUPS.filter((g) => deb.groups.includes(g)) }), [deb]);
  const f = filter.trim().toLowerCase();
  const shown = f ? ideas.filter((i) => i.keyword.includes(f)) : ideas;
  const byGroup = IDEA_GROUPS.map((g) => ({ g, items: shown.filter((i) => i.group === g) })).filter((x) => x.items.length);
  const csv = () => toCsv([["keyword", "group", "modifier", "seed"], ...shown.map((i) => [i.keyword, i.group, i.modifier, deb.seed.trim()])]);
  const toggle = (g: IdeaGroup, on: boolean) => setO({ groups: on ? [...o.groups, g] : o.groups.filter((x) => x !== g) });
  return (
    <div className="grid gap-4">
      <Panel
        title="Seed keyword"
        actions={
          <Button
            variant="ghost"
            icon="sparkles"
            onClick={() => {
              setSeed("sourdough starter");
              setCompare("yeast");
              setLocation("Leeds");
              used("example");
            }}
          >
            Example
          </Button>
        }
      >
        <form className="grid gap-4 p-3 sm:grid-cols-3 sm:p-4" onSubmit={(e) => e.preventDefault()}>
          <Field label="Seed keyword" htmlFor={`${id}-s`} help="A topic in two or three words.">
            <input id={`${id}-s`} className="input" value={seed} placeholder="e.g. sourdough starter" onChange={(e) => (setSeed(e.target.value), used("type"))} />
          </Field>
          <Field label="Compare with (optional)" htmlFor={`${id}-c`} help="Adds “vs”, “or” and “with” ideas.">
            <input id={`${id}-c`} className="input" value={compare} placeholder="e.g. yeast" onChange={(e) => setCompare(e.target.value)} />
          </Field>
          <Field label="Location (optional)" htmlFor={`${id}-l`} help="Adds local ideas, e.g. “in Leeds”.">
            <input id={`${id}-l`} className="input" value={location} placeholder="e.g. Leeds" onChange={(e) => setLocation(e.target.value)} />
          </Field>
          <fieldset className="sm:col-span-3">
            <legend className="field-label">Modifier groups</legend>
            <div className="flex flex-wrap gap-x-5">
              {IDEA_GROUPS.map((g) => (
                <Checkbox key={g} checked={o.groups.includes(g)} onChange={(v) => toggle(g, v)} label={g} />
              ))}
            </div>
          </fieldset>
        </form>
      </Panel>
      <Alert tone="info" title="Ideas to validate, not search data">
        These phrasings come from fixed lists of question words, prepositions, comparisons and A–Z modifiers. We don&apos;t show search volume, CPC or difficulty because we have no licensed data source for them. Check which ideas people actually search with Google Search Console, Keyword Planner or Google Trends, or press <strong>Search</strong> next to an idea to see Google&apos;s own suggestions.
      </Alert>
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="grid content-start gap-3">
          <StatTile label="Ideas" value={ideas.length} sub={f ? `${shown.length} match the filter` : undefined} />
          <Field label="Filter ideas" htmlFor={`${id}-f`}>
            <input id={`${id}-f`} className="input" value={filter} placeholder="e.g. how" onChange={(e) => setFilter(e.target.value)} />
          </Field>
          <CopyButton text={() => shown.map((i) => i.keyword).join("\n")} disabled={!shown.length} label="Copy all" />
          <DownloadButton data={csv} filename={() => `keyword-ideas-${stamp()}.csv`} mime="text/csv;charset=utf-8" label="Export CSV" disabled={!shown.length} />
        </div>
        <div className="grid min-h-48 content-start gap-4">
          {!deb.seed.trim() && <p className="text-sm text-ink-3">Enter a seed keyword to see ideas grouped by modifier.</p>}
          {byGroup.map(({ g, items }) => (
            <Panel key={g} title={`${g} (${items.length})`} actions={<CopyButton text={items.map((i) => i.keyword).join("\n")} />}>
              <ul className="grid gap-x-4 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
                {items.map((i) => (
                  <li key={i.keyword} className="flex items-center justify-between gap-2 border-b border-line py-1.5 text-sm">
                    <span className="min-w-0 break-words">
                      {g === "A–Z" && <span className="mr-1.5 font-mono text-xs text-ink-3">{i.modifier}</span>}
                      {i.keyword}
                    </span>
                    <a
                      className="shrink-0 text-xs text-accent underline"
                      href={`https://www.google.com/search?q=${encodeURIComponent(i.keyword)}`}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      onClick={() => completed("search_click")}
                    >
                      Search<span className="sr-only"> Google for {i.keyword} (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
