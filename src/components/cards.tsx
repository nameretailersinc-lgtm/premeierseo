import Image from "next/image";
import Link from "next/link";
import { Icon } from "./Icon";
import { TOOLS } from "@/content/tools";
import { categoryArt, toolArt } from "@/lib/illustrations";
import { toolHue, toolIcon } from "@/lib/tool-icon";
import type { CategoryDef, CategoryId, ToolDef } from "@/lib/types";

/** Tools listed on each hub: its own tools plus those cross-listed into it ("Also useful here"). */
export function categoryCounts(): Record<CategoryId, number> {
  const out = {} as Record<CategoryId, number>;
  for (const t of TOOLS) {
    out[t.category] = (out[t.category] ?? 0) + 1;
    for (const c of t.alsoIn ?? []) out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}

/** A tool's mark: its 3D illustration when one exists, otherwise its line icon on a coloured tile. */
export function ToolMark({ tool, size = 48, className = "" }: { tool: ToolDef; size?: number; className?: string }) {
  const art = toolArt(tool.id);
  if (art) {
    const inner = Math.round(size * 0.86);
    return (
      <span className={`icon-tile ${className}`} style={{ width: size, height: size }}>
        <Image src={art} alt="" width={inner} height={inner} className="illo" style={{ width: inner, height: inner }} />
      </span>
    );
  }
  return (
    <span className={`icon-tile ${className}`} style={{ width: size, height: size }}>
      <Icon name={toolIcon(tool)} size={Math.round(size * 0.48)} />
    </span>
  );
}

/** Tool card: mark, name, one-line description and an arrow. The whole card is one link. */
export function ToolCard({ tool, showCategory }: { tool: ToolDef; showCategory?: string }) {
  return (
    <li data-tool-id={tool.id} className={`card-link group hue-${toolHue(tool.id)} flex min-h-[6.5rem] gap-3.5 p-4 pr-11`}>
      <ToolMark tool={tool} />
      <span className="min-w-0 flex-1">
        <h3 className="text-[0.9375rem] leading-snug font-semibold text-ink">
          <Link href={tool.path}>{tool.name}</Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-5 text-ink-3">{tool.card}</p>
        {(showCategory || tool.isNew || tool.processing !== "browser") && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
            {showCategory && <span className="text-ink-3">{showCategory}</span>}
            {tool.isNew && <span className="rounded-full bg-accent-subtle px-2 py-0.5 text-accent">New</span>}
            {tool.processing !== "browser" && (
              <span className="inline-flex items-center gap-1 text-ink-3">
                <Icon name="server" size={12} /> Uses our server
              </span>
            )}
          </p>
        )}
      </span>
      <span className="arrow-dot absolute right-3.5 bottom-3.5">
        <Icon name="arrow-right" size={14} strokeWidth={2.25} />
      </span>
    </li>
  );
}

export function ToolGrid({
  tools,
  cols = 4,
  showCategory,
}: {
  tools: ToolDef[];
  cols?: 3 | 4;
  showCategory?: (t: ToolDef) => string;
}) {
  return (
    <ul className={`grid gap-3 sm:grid-cols-2 sm:gap-4 ${cols === 4 ? "lg:grid-cols-3 xl:grid-cols-4" : "lg:grid-cols-3"}`}>
      {tools.map((t) => (
        <ToolCard key={t.id} tool={t} showCategory={showCategory?.(t)} />
      ))}
    </ul>
  );
}

/** Dense row list that scales to 50 items (A–Z page). */
export function ToolList({ tools }: { tools: ToolDef[] }) {
  return (
    <ul className="card overflow-hidden">
      {tools.map((t) => (
        <li
          key={t.id}
          data-tool-id={t.id}
          className={`hue-${toolHue(t.id)} group relative border-b border-line transition-colors last:border-b-0 hover:bg-hue-tint has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-focus`}
        >
          <Link href={t.path} className="flex items-center gap-3.5 px-4 py-3 after:absolute after:inset-0 focus-visible:outline-none">
            <ToolMark tool={t} size={38} />
            <span className="grid min-w-0 flex-1 gap-0.5 md:grid-cols-[16rem_1fr] md:items-center md:gap-6">
              <span className="font-semibold text-ink">
                {t.name}
                {!t.indexable && <span className="ml-2 text-xs font-medium text-ink-3">(limited)</span>}
              </span>
              <span className="text-sm text-ink-3">{t.card}</span>
            </span>
            <span className="arrow-dot hidden md:inline-grid">
              <Icon name="arrow-right" size={14} strokeWidth={2.25} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Category card: tinted by the category colour, with its 3D mark and tool count. */
export function CategoryCard({ cat, count }: { cat: CategoryDef; count: number }) {
  return (
    <li
      className={`card-link group cat-${cat.id} flex flex-col p-5 pr-12 [background:linear-gradient(150deg,var(--c-tint)_0%,var(--surface)_70%)]`}
    >
      <span className="flex items-start justify-between gap-3">
        <Image src={categoryArt(cat.id)} alt="" width={52} height={52} className="illo size-13" />
        <span className="absolute top-4 right-4 rounded-full bg-hue-bg px-2.5 py-0.5 text-xs font-semibold text-hue tabular-nums">
          {count} {count === 1 ? "tool" : "tools"}
        </span>
      </span>
      <h3 className="mt-4 text-[1.0625rem] font-bold text-ink">
        <Link href={cat.path}>{cat.label}</Link>
      </h3>
      <span className="mt-1 block text-sm leading-6 text-ink-3">{cat.card}</span>
      <span className="arrow-dot absolute right-4 bottom-4">
        <Icon name="arrow-right" size={14} strokeWidth={2.25} />
      </span>
    </li>
  );
}
