import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ToolList } from "@/components/cards";
import { HubFilter } from "@/components/HubFilter";
import { JsonLd } from "@/components/JsonLd";
import { CATEGORIES } from "@/content/categories";
import { TOOLS } from "@/content/tools";
import { categoryArt } from "@/lib/illustrations";
import { collectionGraph } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";

const TITLE = "All Tools A–Z | Premier SEO Services";
const DESCRIPTION =
  "Every free tool on Premier SEO Services in one list: text, SEO, image, PDF, developer, website, calculator and generator tools, with a one-line description of each.";

export const metadata: Metadata = buildMetadata({ path: "/tools/", title: TITLE, description: DESCRIPTION });

export default function ToolsIndex() {
  const sorted = [...TOOLS].sort((a, b) => a.name.localeCompare(b.name));
  const letters = [...new Set(sorted.map((t) => t.name[0].toUpperCase()))];
  const crumbs = [{ name: "Home", path: "/" }, { name: "All tools" }];
  return (
    <>
      <JsonLd graph={collectionGraph("/tools/", TITLE, DESCRIPTION, crumbs)} />
      <div className="hero-band">
        <div className="container-page pb-8">
          <Breadcrumbs crumbs={crumbs} />
          <header className="rise flex max-w-3xl items-start gap-4 sm:gap-5">
            <span className="icon-tile hue-blue mt-1 hidden size-14 rounded-2xl sm:inline-grid">
              <Icon name="layout-grid" size={26} />
            </span>
            <div>
              <h1 className="text-[2rem] leading-[1.1] font-extrabold tracking-[-0.03em] text-ink sm:text-[2.75rem]">
                All tools <span className="text-accent">A–Z</span>
              </h1>
              <p className="mt-4 text-base leading-7 text-ink-2 sm:text-lg">
                All {TOOLS.length} tools in alphabetical order. Filter the list, or browse by category.
              </p>
            </div>
          </header>
          <ul className="mt-6 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <Link href={c.path} className={`cat-${c.id} chip gap-2 pl-1.5`}>
                  <Image src={categoryArt(c.id)} alt="" width={24} height={24} className="illo size-6" />
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
          <HubFilter
            items={sorted.map((t) => ({ id: t.id, text: `${t.name} ${t.card} ${t.aliases.join(" ")}` }))}
            label="Filter tools"
            noun="tools"
            initialFromQuery
          />
        </div>
      </div>
      <div className="container-page">
        <nav aria-label="Letters" className="flex flex-wrap gap-1.5">
          {letters.map((l) => (
            <a
              key={l}
              href={`#letter-${l}`}
              className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-sm font-semibold text-ink-2 shadow-sm transition-colors hover:border-accent-line hover:bg-accent-subtle hover:text-accent"
            >
              {l}
            </a>
          ))}
        </nav>
        <div className="mt-8 grid gap-8">
          {letters.map((l) => (
            <section key={l} aria-labelledby={`letter-${l}`} data-hub-group className="grid gap-3 md:grid-cols-[4rem_minmax(0,1fr)]">
              <h2 id={`letter-${l}`} className="scroll-mt-24 text-3xl font-extrabold text-ink-disabled md:pt-2">
                {l}
              </h2>
              <ToolList tools={sorted.filter((t) => t.name[0].toUpperCase() === l)} />
            </section>
          ))}
        </div>
        <p id="hub-filter-empty" hidden className="card mt-6 p-6 text-center text-ink-2">
          No tools match. Try a shorter word, or{" "}
          <Link href="/contact/?topic=tool-request" className="font-semibold text-accent underline">
            suggest a tool
          </Link>
          .
        </p>
      </div>
    </>
  );
}
