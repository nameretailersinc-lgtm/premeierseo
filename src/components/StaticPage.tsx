import type { ReactNode } from "react";
import { Breadcrumbs } from "./Breadcrumbs";
import { Icon } from "./Icon";
import { JsonLd } from "./JsonLd";
import { simplePageGraph } from "@/lib/schema";
import type { IconName } from "@/lib/types";

/** Layout for company/legal pages: hero band with breadcrumb and one H1, prose in a card, optional side rail. */
export function StaticPage({
  path,
  title,
  description,
  h1,
  lead,
  children,
  schemaType = "WebPage",
  updated,
  icon = "file-text",
  hue = "hue-blue",
  eyebrow,
  aside,
  plain = false,
}: {
  path: string;
  title: string;
  description: string;
  h1: string;
  lead?: ReactNode;
  children: ReactNode;
  schemaType?: "WebPage" | "AboutPage" | "ContactPage";
  updated?: string;
  icon?: IconName;
  hue?: string;
  eyebrow?: string;
  /** Right-hand rail (contact details, related links). */
  aside?: ReactNode;
  /** Render children without the prose card (pages that lay out their own blocks). */
  plain?: boolean;
}) {
  const crumbs = [{ name: "Home", path: "/" }, { name: h1 }];
  return (
    <>
      <JsonLd graph={simplePageGraph(path, title, description, crumbs, schemaType)} />
      <div className="hero-band">
        <div className="container-page pb-10">
          <Breadcrumbs crumbs={crumbs} />
          <header className={`${hue} rise flex max-w-3xl items-start gap-4 sm:gap-5`}>
            <span className="icon-tile mt-1 hidden size-14 rounded-2xl sm:inline-grid">
              <Icon name={icon} size={26} />
            </span>
            <div className="min-w-0">
              {eyebrow && <p className="eyebrow mb-2 text-hue">{eyebrow}</p>}
              <h1 className="text-[2rem] leading-[1.1] font-extrabold tracking-[-0.03em] text-ink sm:text-[2.75rem]">{h1}</h1>
              {lead && <p className="mt-4 text-base leading-7 text-ink-2 sm:text-lg">{lead}</p>}
              {updated && (
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-3 shadow-sm">
                  <Icon name="clock" size={13} />
                  Last updated{" "}
                  {new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </p>
              )}
            </div>
          </header>
        </div>
      </div>
      <div className={`container-page ${aside ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" : ""}`}>
        {plain ? (
          <div className="min-w-0">{children}</div>
        ) : (
          <article className={`card prose-body min-w-0 p-6 sm:p-10 [&>h2:first-child]:mt-0 ${aside ? "max-w-none" : "max-w-4xl"}`}>
            {children}
          </article>
        )}
        {aside && <aside className="grid content-start gap-5 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">{aside}</aside>}
      </div>
    </>
  );
}

/** Small rail card used beside static pages. */
export function RailCard({ title, icon, hue = "hue-blue", children }: { title: string; icon: IconName; hue?: string; children: ReactNode }) {
  return (
    <div className={`${hue} card p-5`}>
      <div className="mb-3 flex items-center gap-3">
        <span className="icon-tile size-10 rounded-xl">
          <Icon name={icon} size={18} />
        </span>
        <h2 className="font-bold text-ink">{title}</h2>
      </div>
      <div className="text-sm leading-6 text-ink-2">{children}</div>
    </div>
  );
}

/** "On this page" rail: anchors to the h2 ids of a prose page. */
export function TocCard({ sections, hue = "hue-blue" }: { sections: readonly (readonly [string, string])[]; hue?: string }) {
  return (
    <nav aria-label="On this page" className={`${hue} card p-5`}>
      <div className="mb-3 flex items-center gap-3">
        <span className="icon-tile size-10 rounded-xl">
          <Icon name="list" size={18} />
        </span>
        <h2 className="font-bold text-ink">On this page</h2>
      </div>
      <ol className="grid gap-0.5 text-sm">
        {sections.map(([id, label]) => (
          <li key={id}>
            <a href={`#${id}`} className="block rounded-lg px-2 py-1.5 font-medium text-ink-2 hover:bg-hue-tint hover:text-ink">
              {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
