import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ToolMark } from "@/components/cards";
import { FaqList } from "@/components/Faq";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { InlineMd, Markdown } from "@/components/Markdown";
import { CATEGORY_BY_ID } from "@/content/categories";
import { GUIDES } from "@/content/guides";
import { relatedTools } from "@/content/tools";
import { toolGraph, type Crumb } from "@/lib/schema";
import type { Archetype, ToolDef } from "@/lib/types";
import { ToolWidget } from "@/tools/registry";
import { privacyStatement } from "./privacy";
import { toolHue } from "@/lib/tool-icon";

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** One-line "what to do" hint shown beside the tool's name on its stage, per layout archetype. */
const ACTION_HINT: Record<Archetype, string> = {
  transform: "Paste your text — the result updates as you type",
  analyzer: "Paste your text to see the numbers update live",
  generator: "Set the options, then copy or download the result",
  file: "Add your files — they are processed on this device",
  url: "Enter a web address to run the check",
  calculator: "Fill in the fields to see the answer straight away",
};

/** In-page anchors for the explanatory content under the tool. Only sections that exist are listed. */
function jumpLinks(tool: ToolDef): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  if (tool.steps.length > 0) out.push({ id: "how-to-use", label: "How to use" });
  if (tool.example) out.push({ id: "example", label: tool.example.title ?? "Example" });
  for (const sec of tool.sections) out.push({ id: slugify(sec.heading), label: sec.heading });
  if (tool.faq.length > 0) out.push({ id: "faq", label: "FAQ" });
  return out.slice(0, 6);
}

/**
 * Tool page template (master plan §1.4): breadcrumb → H1 → answer-first summary → tool →
 * how to use → example → explanation → privacy → FAQ, with related tools in a rail.
 * Everything except the widget is server-rendered HTML.
 */
export function ToolPage({ tool }: { tool: ToolDef }) {
  const cat = CATEGORY_BY_ID[tool.category];
  const crumbs: Crumb[] = [{ name: "Home", path: "/" }, { name: cat.label, path: cat.path }, { name: tool.name }];
  const related = relatedTools(tool, 6);
  const privacy = privacyStatement(tool);
  const guides = (tool.guides ?? []).map((g) => GUIDES.find((x) => x.path === g)).filter(Boolean);
  const contextual = (tool.links ?? []).filter((l) => !related.some((r) => r.path === l.href) && !l.href.startsWith("/blog/"));
  const jumps = jumpLinks(tool);

  return (
    <>
      <JsonLd graph={toolGraph(tool, crumbs)} />
      <div className={`cat-${tool.category} hero-band`}>
        <div className="container-page pb-7 sm:pb-9">
          <Breadcrumbs crumbs={crumbs} />
          <header className={`hue-${toolHue(tool.id)} max-w-4xl`}>
            <div className="flex items-start gap-4 sm:gap-5">
              <ToolMark tool={tool} size={64} className="mt-0.5 hidden rounded-2xl shadow-sm sm:inline-grid" />
              <div className="min-w-0">
                <p className="eyebrow mb-2">
                  <Link href={cat.path} className="text-hue hover:underline">
                    {cat.label}
                  </Link>
                </p>
                <h1 className="text-[1.75rem] leading-[1.1] font-extrabold tracking-[-0.03em] text-ink xs:text-[1.875rem] sm:text-[2.5rem]">
                  {tool.h1}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-ink-2 sm:text-[1.0625rem] sm:leading-[1.65]">{tool.summary}</p>
              </div>
            </div>
            <ul className="mt-5 flex flex-wrap gap-2">
              <li className="trust-pill">
                <Icon
                  name={tool.processing === "browser" ? "shield-check" : "server"}
                  size={14}
                  className={tool.processing === "browser" ? "text-success" : "text-[var(--hue-orange)]"}
                />
                {privacy.short}
              </li>
              <li className="trust-pill">
                <Icon name="circle-check" size={14} className="text-success" />
                Free, no sign-up
              </li>
              <li className="trust-pill">
                <Icon name="zap" size={14} className="text-accent" />
                Unlimited use
              </li>
              <li className="trust-pill">
                <Icon name="clock" size={14} className="text-ink-3" />
                Updated {formatDate(tool.updated)}
              </li>
            </ul>
          </header>

          {!tool.indexable && (
            <p className="callout callout-warning mt-6 max-w-3xl text-sm text-ink">
              <strong>Limited tool.</strong> This page does less than its name suggests; the notes below explain exactly what it can and
              can&apos;t do.
            </p>
          )}
        </div>
      </div>

      {/* The tool itself: framed on its own stage so it is unmistakably the point of the page. */}
      <div className="container-page">
        <section aria-labelledby="tool-h" className={`hue-${toolHue(tool.id)} tool-stage scroll-mt-24`} id="tool">
          <h2 id="tool-h" className="sr-only">
            {tool.name}
          </h2>
          <div className="tool-stage-head">
            <p className="flex items-start gap-2 text-sm font-semibold text-ink">
              <Icon name="play" size={15} className="mt-[0.1875rem] shrink-0 text-hue" />
              {ACTION_HINT[tool.archetype]}
            </p>
            {/* Repeats a hero badge, so it only appears where there is room for it beside the hint. */}
            <p className="hidden items-center gap-1.5 text-xs font-medium text-ink-3 sm:inline-flex">
              <Icon name={tool.processing === "browser" ? "shield-check" : "server"} size={13} />
              {privacy.short}
            </p>
          </div>
          <ToolWidget widget={tool.widget} toolId={tool.id} config={tool.config} />
          {tool.limits && tool.limits.length > 0 && (
            <div className="tool-stage-foot">
              <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-3">
                {tool.limits.map((l) => (
                  <li key={l} className="inline-flex items-start gap-1.5">
                    <Icon name="info" size={15} className="mt-[0.1875rem] shrink-0" />
                    <InlineMd text={l} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {jumps.length > 1 && (
          <nav aria-label="On this page" className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-0.5 text-sm text-ink-3">On this page:</span>
            {jumps.map((j) => (
              <a key={j.id} href={`#${j.id}`} className="jump-link">
                {j.label}
              </a>
            ))}
          </nav>
        )}

        <div className="mt-10 grid items-start gap-8 sm:mt-12 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-10">
          <div className="min-w-0">
            <article className="card prose-body max-w-none p-5 sm:p-7 lg:p-9 [&>h2:first-child]:mt-0">
              {tool.steps.length > 0 && (
                <>
                  <h2 id="how-to-use">How to use the {lcFirst(tool.name)}</h2>
                  <ol className="steps not-prose mt-5">
                    {tool.steps.map((s, i) => (
                      <li key={i} className="mt-0 text-ink-2">
                        <span className="step-num">{i + 1}</span>
                        <span className="pt-1 leading-7 [&_a]:text-accent [&_a]:underline [&_strong]:font-semibold [&_strong]:text-ink">
                          <InlineMd text={s} />
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
              {tool.example && (
                <>
                  <h2 id="example">{tool.example.title ?? "Example"}</h2>
                  <div className="not-prose mt-4 grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
                    <figure className="min-w-0">
                      <figcaption className="eyebrow mb-2">Input</figcaption>
                      <pre tabIndex={0} aria-label="Example input" className="code-slab">
                        {tool.example.input}
                      </pre>
                    </figure>
                    <span aria-hidden="true" className="hidden self-center text-ink-disabled sm:block">
                      <Icon name="arrow-right" size={20} />
                    </span>
                    <figure className="min-w-0">
                      <figcaption className="eyebrow mb-2 text-accent">Output</figcaption>
                      <pre tabIndex={0} aria-label="Example output" className="code-slab border-accent-line bg-accent-subtle">
                        {tool.example.output}
                      </pre>
                    </figure>
                  </div>
                  {tool.example.note && <Markdown text={tool.example.note} />}
                </>
              )}
              {tool.sections.map((s) => (
                <section key={s.heading} aria-labelledby={slugify(s.heading)}>
                  <h2 id={slugify(s.heading)}>{s.heading}</h2>
                  <Markdown text={s.body} />
                </section>
              ))}
              {tool.useCases && tool.useCases.length > 0 && (
                <>
                  <h2 id="when-to-use">When it&apos;s useful</h2>
                  <ul>
                    {tool.useCases.map((u, i) => (
                      <li key={i}>
                        <InlineMd text={u} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <section
                aria-labelledby="privacy"
                className={`callout not-prose mt-10 ${tool.processing === "browser" ? "callout-success" : "callout-accent"}`}
              >
                <h2 id="privacy" className="mt-0 flex items-start gap-2.5 text-lg font-bold text-ink">
                  <Icon
                    name={tool.processing === "browser" ? "shield-check" : "server"}
                    size={20}
                    className={`mt-0.5 shrink-0 ${tool.processing === "browser" ? "text-success" : "text-accent"}`}
                  />
                  {privacyHeading(tool)}
                </h2>
                <div className="prose-body mt-2 max-w-none text-[0.9375rem]">
                  <Markdown text={privacy.long} />
                </div>
              </section>
              {tool.sources && tool.sources.length > 0 && (
                <>
                  <h2 id="sources">Sources</h2>
                  <ul>
                    {tool.sources.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} rel="noopener">
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </article>

            <FaqList items={tool.faq} heading={`Questions about the ${lcFirst(tool.name)}`} />

            {guides.length > 0 && (
              <section aria-labelledby="learn-more" className="mt-12">
                <h2 id="learn-more" className="mb-4 text-xl font-bold sm:text-2xl">
                  Learn more
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {guides.map((g) => (
                    <li key={g!.path} className="card-link group hue-orange flex items-center gap-3.5 p-4 pr-11">
                      <span className="icon-tile size-10 rounded-xl">
                        <Icon name="book-open" size={18} />
                      </span>
                      <Link href={g!.path} className="text-[0.9375rem] leading-snug font-semibold text-ink">
                        {g!.h1}
                      </Link>
                      <span className="arrow-dot absolute right-3.5">
                        <Icon name="arrow-right" size={14} strokeWidth={2.25} />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-sm text-ink-3">
              <p className="flex flex-wrap gap-x-2.5 gap-y-1">
                <span>Last updated {formatDate(tool.updated)}</span>
                <span aria-hidden="true">·</span>
                <span>
                  Maintained by{" "}
                  <Link href="/about-us/" className="font-medium text-ink-2 underline hover:text-accent">
                    Premier SEO Services
                  </Link>
                </span>
              </p>
              <Link
                href={`/tool-complain/?tool=${tool.id}`}
                className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
              >
                <Icon name="message" size={15} />
                Report a problem
              </Link>
            </div>
          </div>

          <aside aria-labelledby="related-h" className="grid gap-5 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
            <div className="card overflow-hidden p-4">
              <h2 id="related-h" className="flex items-center gap-2 px-1 pb-2.5 text-[0.9375rem] font-bold text-ink">
                <Icon name="layout-grid" size={16} className="text-ink-3" />
                Related tools
              </h2>
              <ul className="grid gap-1">
                {related.map((r) => (
                  <li
                    key={r.id}
                    className={`group hue-${toolHue(r.id)} relative flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-hue-tint has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-focus`}
                  >
                    <ToolMark tool={r} size={40} className="rounded-xl" />
                    <span className="min-w-0 flex-1">
                      <Link href={r.path} className="text-sm font-semibold text-ink after:absolute after:inset-0 focus-visible:outline-none">
                        {r.name}
                      </Link>
                      <span className="mt-0.5 line-clamp-1 block text-xs text-ink-3">{r.card}</span>
                    </span>
                    <Icon name="chevron-right" size={16} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                  </li>
                ))}
              </ul>
              <div className="mt-2.5 border-t border-line px-1 pt-3">
                <Link href={cat.path} className="link-more">
                  Browse all {cat.label.toLowerCase()} <Icon name="arrow-right" size={16} />
                </Link>
              </div>
            </div>
            {contextual.length > 0 && (
              <div className="card p-4">
                <h2 className="flex items-center gap-2 px-1 pb-2 text-sm font-bold text-ink">
                  <Icon name="link" size={15} className="text-ink-3" />
                  See also
                </h2>
                <ul className="grid gap-0.5 text-sm">
                  {contextual.slice(0, 5).map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="flex items-center gap-2 rounded-lg px-1 py-1.5 font-medium text-accent hover:bg-accent-subtle">
                        <Icon name="link" size={14} className="shrink-0" />
                        {l.anchor.charAt(0).toUpperCase() + l.anchor.slice(1)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

/** "Word Counter" → "word counter"; keeps acronyms and codes (PDF, JPG, 50KB, ROT13, .htaccess). */
function lcFirst(s: string) {
  return s
    .split(" ")
    .map((w) => (/^[A-Z][a-z]+$/.test(w) ? w.toLowerCase() : w))
    .join(" ");
}

function privacyHeading(t: ToolDef) {
  if (t.archetype === "file") return "Are my files uploaded?";
  if (t.archetype === "url") return "What happens to the address I enter?";
  if (t.archetype === "calculator" || t.archetype === "generator") return "Is anything I enter stored?";
  return "Is my text private?";
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
