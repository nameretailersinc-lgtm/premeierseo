import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "./Breadcrumbs";
import { ToolGrid } from "./cards";
import { FaqItems } from "./Faq";
import { Icon } from "./Icon";
import { JsonLd } from "./JsonLd";
import { Markdown } from "./Markdown";
import { CATEGORY_BY_ID } from "@/content/categories";
import { GUIDES } from "@/content/guides";
import { alsoInCategory, toolsInCategory } from "@/content/tools";
import { GROUP_ART, categoryArt, categoryHeroArt } from "@/lib/illustrations";
import { categoryGraph, type Crumb } from "@/lib/schema";
import { HUES, toolIcon } from "@/lib/tool-icon";
import type { CategoryDef, IconName } from "@/lib/types";
import { HubFilter } from "./HubFilter";
import { slugify } from "./tool/ToolPage";

/** "Image Tools" → ["Image", "Tools"]: the last word takes the category colour, as in the design. */
function splitTitle(h1: string): [string, string] {
  const i = h1.lastIndexOf(" ");
  return i < 0 ? ["", h1] : [h1.slice(0, i + 1), h1.slice(i + 1)];
}

export function CategoryPage({ cat }: { cat: CategoryDef }) {
  const tools = toolsInCategory(cat.id, cat.groups.map((g) => g.id));
  const also = alsoInCategory(cat.id);
  const crumbs: Crumb[] = [{ name: "Home", path: "/" }, { name: cat.label }];
  const guides = (cat.guides ?? []).map((g) => GUIDES.find((x) => x.path === g)).filter(Boolean);
  const groups = cat.groups.map((g) => ({ ...g, tools: tools.filter((t) => t.subgroup === g.id) })).filter((g) => g.tools.length);
  const all = [...tools, ...also];
  const local = all.filter((t) => t.processing === "browser").length;
  const [lead, last] = splitTitle(cat.h1);
  const hero = categoryHeroArt(cat.id);
  const groupArt = GROUP_ART[cat.id];

  const facts: { icon: IconName; hue: string; t: string; d: string }[] = [
    { icon: "shield-check", hue: "hue-blue", t: "100% free", d: "No sign-up needed" },
    local === all.length
      ? { icon: "lock", hue: "hue-purple", t: "Private and secure", d: "Runs in your browser" }
      : { icon: "lock", hue: "hue-purple", t: "Clear about data", d: `${local} of ${all.length} run in your browser` },
    { icon: "zap", hue: "hue-green", t: "Instant results", d: "Nothing to install" },
  ];

  return (
    <>
      <JsonLd graph={categoryGraph(cat, tools, crumbs)} />
      <section className={`cat-${cat.id} hero-band overflow-hidden`}>
        <div className="container-page relative pb-10">
          <Breadcrumbs crumbs={crumbs} />
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <header className="rise max-w-3xl">
              <div className="flex items-center gap-4">
                <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
                  <Image src={categoryArt(cat.id)} alt="" width={44} height={44} className="illo size-11" />
                </span>
                <h1 className="text-[2.25rem] leading-[1.08] font-extrabold tracking-[-0.03em] text-ink sm:text-5xl">
                  {lead}
                  <span className="text-hue">{last}</span>
                </h1>
              </div>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ink-2 sm:text-[1.0625rem]">{cat.intro}</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                {facts.map((f) => (
                  <li key={f.t} className={`${f.hue} flex items-center gap-3`}>
                    <span className="icon-tile size-10 rounded-full">
                      <Icon name={f.icon} size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{f.t}</span>
                      <span className="block text-xs text-ink-3">{f.d}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </header>
            <div aria-hidden="true" className="relative hidden lg:block">
              <div className="absolute inset-[10%] rounded-full bg-[radial-gradient(closest-side,var(--c-bg),transparent)] blur-2xl" />
              <Image
                src={hero.src}
                alt=""
                width={hero.width}
                height={hero.height}
                priority
                sizes="340px"
                className={`relative ${hero.scene ? "illo-scene w-[21rem]" : "illo float-slow w-48"}`}
              />
            </div>
          </div>
          <HubFilter
            items={all.map((t) => ({ id: t.id, text: `${t.name} ${t.card} ${t.aliases.join(" ")}` }))}
            label={`Filter ${cat.label.toLowerCase()}`}
            groups={[
              ...groups.map((g) => ({ id: g.id, heading: g.heading, anchor: slugify(g.heading) })),
              ...(also.length ? [{ id: "also", heading: "Also useful here", anchor: "also" }] : []),
            ]}
          />
        </div>
      </section>

      <div id="tools" className="container-page grid scroll-mt-24 gap-6 pt-2">
        {groups.map((g, i) => {
          const art = groupArt?.[g.id];
          return (
            <section
              key={g.id}
              aria-labelledby={slugify(g.heading)}
              data-hub-group={g.id}
              className={`hue-${HUES[i % HUES.length]} rounded-3xl border border-line bg-[linear-gradient(160deg,var(--c-tint),var(--canvas)_85%)] p-3 sm:p-6`}
            >
              <GroupHead id={slugify(g.heading)} heading={g.heading} description={g.description} art={art} icon={toolIcon(g.tools[0])} />
              <ToolGrid tools={g.tools} cols={3} />
            </section>
          );
        })}
        {also.length > 0 && (
          <section
            aria-labelledby="also"
            data-hub-group="also"
            className="rounded-3xl border border-line bg-[linear-gradient(160deg,var(--surface-3),var(--canvas)_85%)] p-3 sm:p-6"
          >
            <GroupHead id="also" heading="Also useful here" description="Tools from other categories that fit this job." icon="sparkles" />
            <ToolGrid tools={also} cols={3} showCategory={(t) => CATEGORY_BY_ID[t.category].label} />
          </section>
        )}
        <p id="hub-filter-empty" hidden className="card p-6 text-center text-ink-2">
          No tools in this category match your filter. Try the{" "}
          <Link href="/tools/" className="font-semibold text-accent underline">
            all tools
          </Link>{" "}
          page.
        </p>
      </div>

      <div className="container-page mt-12 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 grid-cols-1 gap-6">
          {cat.sections.map((s) => (
            <section key={s.heading} className="card p-5 sm:p-7" aria-labelledby={slugify(s.heading)}>
              <div className="mb-4 flex items-center gap-3">
                <span className="icon-tile hue-blue size-11 rounded-2xl">
                  <Icon name="sparkles" size={20} />
                </span>
                <h2 id={slugify(s.heading)} className="text-xl font-bold text-ink">
                  {s.heading}
                </h2>
              </div>
              <div className="prose-body max-w-none">
                <Markdown text={s.body} />
              </div>
            </section>
          ))}
        </div>
        <aside className="grid content-start gap-6">
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="icon-tile hue-purple size-10 rounded-xl">
                <Icon name="layout-grid" size={18} />
              </span>
              <div>
                <h2 className="font-bold text-ink">Related categories</h2>
                <p className="text-xs text-ink-3">Explore more useful tools.</p>
              </div>
            </div>
            <ul className="grid gap-2">
              {cat.related.map((id) => {
                const r = CATEGORY_BY_ID[id];
                return (
                  <li key={id}>
                    <Link
                      href={r.path}
                      className={`cat-${r.id} flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 font-semibold text-ink transition-colors hover:border-[color-mix(in_srgb,var(--c)_35%,var(--line))] hover:bg-hue-tint`}
                    >
                      <Image src={categoryArt(r.id)} alt="" width={32} height={32} className="illo size-8" />
                      <span className="flex-1 text-sm">{r.label}</span>
                      <Icon name="chevron-right" size={16} className="text-ink-3" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          {guides.length > 0 && (
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className="icon-tile hue-orange size-10 rounded-xl">
                  <Icon name="book-open" size={18} />
                </span>
                <h2 className="font-bold text-ink">Guides</h2>
              </div>
              <ul className="grid gap-1">
                {guides.map((g) => (
                  <li key={g!.path}>
                    <Link href={g!.path} className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-accent hover:bg-accent-subtle">
                      <Icon name="file-text" size={16} className="mt-0.5 shrink-0" />
                      {g!.h1}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {cat.faq.length > 0 && (
        <div className="container-page mt-6">
          <section
            aria-labelledby="faq"
            className="hue-green rounded-3xl border border-line bg-[linear-gradient(160deg,var(--c-tint),var(--canvas)_85%)] p-5 sm:p-7"
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="icon-tile size-11 rounded-2xl">
                <Icon name="help-circle" size={22} />
              </span>
              <div>
                <h2 id="faq" className="text-xl font-bold text-ink">
                  Questions about {cat.label.toLowerCase()}
                </h2>
                <p className="text-sm text-ink-3">Common questions from people using these tools.</p>
              </div>
            </div>
            <FaqItems items={cat.faq} />
          </section>
        </div>
      )}
    </>
  );
}

function GroupHead({
  id,
  heading,
  description,
  art,
  icon,
}: {
  id: string;
  heading: string;
  description?: string;
  art?: string;
  icon: IconName;
}) {
  return (
    <div className="mb-4 flex items-center gap-3.5 sm:mb-5">
      {art ? (
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-line bg-surface shadow-[var(--shadow-sm)]">
          <Image src={`/illustrations/${art}.webp`} alt="" width={36} height={36} className="illo size-9" />
        </span>
      ) : (
        <span className="icon-tile size-12 rounded-2xl border border-line">
          <Icon name={icon} size={22} />
        </span>
      )}
      <div className="min-w-0">
        <h2 id={id} className="text-lg leading-snug font-bold text-ink sm:text-xl">
          {heading}
        </h2>
        {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
      </div>
    </div>
  );
}
