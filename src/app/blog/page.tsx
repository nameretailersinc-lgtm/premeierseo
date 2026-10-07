import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Icon } from "@/components/Icon";
import { slugify } from "@/components/tool/ToolPage";
import { JsonLd } from "@/components/JsonLd";
import { GUIDES } from "@/content/guides";
import { collectionGraph } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";

const TITLE = "Guides for SEO, Images and PDFs | Premier SEO Services";
const DESCRIPTION =
  "Practical guides that go with our tools: shrinking photos for forms, choosing image formats, reducing PDF size, redirects, robots.txt and title tags.";

// Indexable once at least four guides are live (keyword strategy §7).
export const metadata: Metadata = buildMetadata({ path: "/blog/", title: TITLE, description: DESCRIPTION, indexable: GUIDES.length >= 4 });

function fmt(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const CLUSTER_HUES = ["hue-blue", "hue-purple", "hue-green", "hue-orange", "hue-pink", "hue-teal"];

export default function BlogIndex() {
  const clusters = [...new Set(GUIDES.map((g) => g.cluster))];
  const crumbs = [{ name: "Home", path: "/" }, { name: "Guides" }];
  return (
    <>
      <JsonLd graph={collectionGraph("/blog/", TITLE, DESCRIPTION, crumbs)} />
      <div className="hero-band">
        <div className="container-page pb-10">
          <Breadcrumbs crumbs={crumbs} />
          <header className="rise flex max-w-3xl items-start gap-4 sm:gap-5">
            <span className="icon-tile hue-orange mt-1 hidden size-14 rounded-2xl sm:inline-grid">
              <Icon name="book-open" size={26} />
            </span>
            <div>
              <h1 className="text-[2rem] leading-[1.1] font-extrabold tracking-[-0.03em] text-ink sm:text-[2.75rem]">
                Guides
              </h1>
              <p className="mt-4 text-base leading-7 text-ink-2 sm:text-lg">
                Step-by-step explanations of the jobs our tools help with. Each guide links to the tools it uses, and each one says when it
                was last checked.
              </p>
              {GUIDES.length > 0 && (
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-3 shadow-sm">
                  <Icon name="book-open" size={13} />
                  {GUIDES.length} guides in {clusters.length} {clusters.length === 1 ? "topic" : "topics"}
                </p>
              )}
            </div>
          </header>
          {clusters.length > 1 && (
            <nav aria-label="Topics" className="mt-6 flex flex-wrap gap-2">
              {clusters.map((c) => (
                <a key={c} href={`#c-${slugify(c)}`} className="chip">
                  {c}
                </a>
              ))}
            </nav>
          )}
        </div>
      </div>
      <div className="container-page">
        {GUIDES.length === 0 && <p className="card p-6 text-ink-2">The first guides are being written.</p>}
        {clusters.map((c, ci) => (
          <section key={c} className={`${CLUSTER_HUES[ci % CLUSTER_HUES.length]} mt-10 first:mt-0`} aria-labelledby={`c-${slugify(c)}`}>
            <h2 id={`c-${slugify(c)}`} className="mb-4 scroll-mt-24 text-xl font-bold sm:text-2xl">
              {c}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {GUIDES.filter((g) => g.cluster === c).map((g) => (
                <li key={g.slug} className="card-link group flex flex-col p-5 sm:p-6">
                  <span className="icon-tile size-11 rounded-xl">
                    <Icon name="file-text" size={20} />
                  </span>
                  <h3 className="mt-4 text-[1.0625rem] leading-snug font-bold text-ink">
                    <Link href={g.path}>{g.h1}</Link>
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-ink-3">{g.metaDescription}</p>
                  <p className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4 text-xs text-ink-3">
                    <span>
                      Updated {fmt(g.dateModified)}
                      {g.readingMinutes ? ` · ${g.readingMinutes} min read` : ""}
                    </span>
                    <span className="arrow-dot">
                      <Icon name="arrow-right" size={14} strokeWidth={2.25} />
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {GUIDES.length > 0 && (
          <section className="hue-purple card mt-12 flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-start gap-4">
              <span className="icon-tile hidden size-12 rounded-2xl sm:inline-grid">
                <Icon name="pen" size={22} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-ink sm:text-xl">Know this subject better than we do?</h2>
                <p className="mt-1.5 text-sm leading-6 text-ink-3">
                  We publish guides from practitioners who can teach something specific. No fee in either direction.
                </p>
              </div>
            </div>
            <Link href="/write-for-us/" className="btn btn-primary shrink-0">
              Write for us <Icon name="arrow-right" size={16} />
            </Link>
          </section>
        )}
      </div>
    </>
  );
}
