"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { categoryArt } from "@/lib/illustrations";
import type { CategoryId, IconName } from "@/lib/types";
import { ThemeRadios } from "./ThemeToggle";

interface Cat {
  id: CategoryId;
  path: string;
  label: string;
  icon: IconName;
  count: number;
}

const LINKS: [string, string, IconName][] = [
  ["/tools/", "All tools A–Z", "layout-grid"],
  ["/blog/", "Guides", "book-open"],
  ["/faq/", "FAQ", "help-circle"],
  ["/about-us/", "About", "info"],
  ["/contact/", "Contact", "mail"],
  ["/tool-complain/", "Report a problem", "circle-alert"],
];

/** Mobile/tablet menu: a modal <dialog> (focus trap, Esc and inert background are native). */
export function MobileMenu({ categories }: { categories: Cat[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    ref.current?.close();
  }, [pathname]);
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-icon size-11 rounded-full text-ink-2 lg:hidden"
        aria-label="Menu"
        aria-haspopup="dialog"
        onClick={() => ref.current?.showModal()}
      >
        <Icon name="menu" size={22} />
      </button>
      <dialog
        ref={ref}
        aria-label="Menu"
        className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-[26rem] bg-canvas p-0 text-ink sm:border-l sm:border-line"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-surface px-4">
          <p className="text-base font-bold">Menu</p>
          <button type="button" className="btn btn-ghost btn-icon size-11 rounded-full" aria-label="Close menu" onClick={() => ref.current?.close()}>
            <Icon name="x" size={22} />
          </button>
        </div>
        <nav aria-label="Mobile" className="p-4">
          <p className="eyebrow mb-2 px-1">Tool categories</p>
          <ul className="card grid gap-0.5 p-1.5">
            {categories.map((c) => (
              <li key={c.path}>
                <Link
                  href={c.path}
                  className={`cat-${c.id} flex min-h-14 items-center gap-3 rounded-lg px-2 transition-colors hover:bg-hue-tint`}
                >
                  <Image src={categoryArt(c.id)} alt="" width={36} height={36} className="illo size-9 shrink-0" />
                  <span className="flex-1 font-semibold">{c.label}</span>
                  <span className="rounded-full bg-hue-bg px-2 text-xs leading-5 font-semibold text-hue tabular-nums">{c.count}</span>
                  <Icon name="chevron-right" size={16} className="text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {LINKS.map(([href, label, icon]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="card flex min-h-12 items-center gap-2.5 px-3 text-sm font-semibold text-ink-2 hover:border-accent-line hover:text-ink"
                >
                  <Icon name={icon} size={18} className="shrink-0 text-accent" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t border-line pt-4">
            <ThemeRadios />
          </div>
        </nav>
      </dialog>
    </>
  );
}
