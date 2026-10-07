import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ToolMark } from "@/components/cards";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { Markdown } from "@/components/Markdown";
import { slugify } from "@/components/tool/ToolPage";
import { GUIDES, getGuide } from "@/content/guides";
import { getTool } from "@/content/tools";
import { guideGraph } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";
import { toolHue } from "@/lib/tool-icon";

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return {};
  return buildMetadata({
    path: g.path,
    title: g.title,
    description: g.metaDescription,
    ogType: "article",
    publishedTime: g.datePublished,
    modifiedTime: g.dateModified,
  });
}

function fmt(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function GuidePage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();
  const crumbs = [{ name: "Home", path: "/" }, { name: "Guides", path: "/blog/" }, { name: g.h1 }];
  const tools = g.tools.map(getTool).filter(Boolean);
  const more = GUIDES.filter((x) => x.slug !== g.slug && x.cluster === g.cluster).slice(0, 3);
  return (
    <>
      <JsonLd graph={guideGraph(g, crumbs)} />
      <div className="hero-band">
        <div className="container-page pb-10">
          <Breadcrumbs crumbs={crumbs} />
          <header className="rise max-w-3xl">
            <p className="eyebrow eyebrow-pill">{g.cluster}</p>
            <h1 className="mt-4 text-[2rem] leading-[1.12] font-extrabold tracking-[-0.03em] text-ink sm:text-[2.625rem]">{g.h1}</h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-3">
              <span>
                By the{" "}
                <Link href="/about-us/" className="font-medium text-ink-2 underline hover:text-ink">
                  Premier SEO Services team
                </Link>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Published <time dateTime={g.datePublished}>{fmt(g.datePublished)}</time>
              </span>
              {g.dateModified !== g.datePublished && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Updated <time dateTime={g.dateModified}>{fmt(g.dateModified)}</time>
                  </span>
                </>
              )}
              {g.readingMinutes ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="clock" size={14} /> {g.readingMinutes} min read
                  </span>
                </>
              ) : null}
            </p>
          </header>
        </div>
      </div>
      <div className="container-page">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-10">
          <article className="card min-w-0 p-6 sm:p-10">
            <aside aria-label="Summary" className="rounded-2xl border border-accent-line bg-accent-subtle p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-accent">
                <Icon name="sparkles" size={16} /> In short
              </p>
              <div className="prose-body mt-2 max-w-none">
                <Markdown text={g.summary} />
              </div>
            </aside>
            <nav aria-label="On this page" className="mt-6 rounded-2xl border border-line bg-surface-2 p-5 text-sm">
              <p className="font-bold text-ink">On this page</p>
              <ol className="mt-2 grid gap-1 pl-5 [list-style:decimal] marker:text-ink-3">
                {g.body.map((s) => (
                  <li key={s.heading}>
                    <a href={`#${slugify(s.heading)}`} className="font-medium text-accent hover:underline">
                      {s.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="prose-body mt-8 max-w-none">
              {g.body.map((s) => (
                <section key={s.heading} aria-labelledby={slugify(s.heading)}>
                  <h2 id={slugify(s.heading)}>{s.heading}</h2>
                  <Markdown text={s.body} />
                </section>
              ))}
              {g.sources && g.sources.length > 0 && (
                <>
                  <h2 id="sources">Sources</h2>
                  <ul>
                    {g.sources.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} rel="noopener">
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </article>
          <aside className="grid content-start gap-5 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
            {tools.length > 0 && (
              <div className="card p-4">
                <h2 className="px-1 pb-2 font-bold text-ink">Tools used in this guide</h2>
                <ul className="grid gap-1">
                  {tools.map((t) => (
                    <li
                      key={t!.id}
                      className={`group hue-${toolHue(t!.id)} relative flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-hue-tint has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-focus`}
                    >
                      <ToolMark tool={t!} size={40} className="rounded-xl" />
                      <span className="min-w-0 flex-1">
                        <Link href={t!.path} className="text-sm font-semibold text-ink after:absolute after:inset-0 focus-visible:outline-none">
                          {t!.name}
                        </Link>
                        <span className="mt-0.5 line-clamp-1 block text-xs text-ink-3">{t!.card}</span>
                      </span>
                      <Icon name="chevron-right" size={16} className="shrink-0 text-ink-3" />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {more.length > 0 && (
              <div className="card p-4">
                <h2 className="px-1 pb-2 font-bold text-ink">More guides</h2>
                <ul className="grid gap-1">
                  {more.map((m) => (
                    <li key={m.slug}>
                      <Link href={m.path} className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-accent hover:bg-accent-subtle">
                        <Icon name="file-text" size={16} className="mt-0.5 shrink-0" />
                        {m.h1}
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
