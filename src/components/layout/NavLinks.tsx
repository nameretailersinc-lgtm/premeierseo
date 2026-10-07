"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
}

const BASE =
  "relative inline-flex h-9 items-center whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors";

/** Primary nav links with an active-page highlight. */
export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname() || "/";
  return (
    <>
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`${BASE} ${active ? "bg-accent-subtle text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
          >
            {it.label}
          </Link>
        );
      })}
    </>
  );
}
