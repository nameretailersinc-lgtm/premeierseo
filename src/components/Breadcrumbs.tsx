import Link from "next/link";
import { Icon } from "./Icon";
import type { Crumb } from "@/lib/schema";

/** Visible breadcrumb; the same `crumbs` array feeds the BreadcrumbList JSON-LD. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="pt-5 pb-4 sm:pt-7 sm:pb-5">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.8125rem] text-ink-3">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={i} className="inline-flex items-center gap-1.5">
              {i > 0 && <Icon name="chevron-right" size={14} className="text-ink-disabled" />}
              {last || !c.path ? (
                <span aria-current={last ? "page" : undefined} className="max-w-[24ch] truncate font-medium text-ink-2 sm:max-w-none">
                  {c.name}
                </span>
              ) : (
                <Link href={c.path} className="text-ink-3 underline-offset-3 transition-colors hover:text-accent hover:underline">
                  {c.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
