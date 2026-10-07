import Image from "next/image";
import Link from "next/link";
import { CATEGORIES } from "@/content/categories";
import { TOOLS } from "@/content/tools";
import { Icon } from "@/components/Icon";
import { categoryCounts } from "@/components/cards";
import { categoryArt } from "@/lib/illustrations";
import { Wordmark } from "./Wordmark";
import { SearchTrigger } from "@/components/search/SearchTrigger";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";

const PRIMARY = ["free-seo-tools", "text-tools", "imaging-tools", "pdf-tools", "development-tools"] as const;

const NAV_LINK =
  "inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-full px-3 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink";

export function Header() {
  const counts = categoryCounts();
  const cats = CATEGORIES.map((c) => ({ id: c.id, path: c.path, label: c.label, icon: c.icon, count: counts[c.id] ?? 0 }));
  const items = [
    ...PRIMARY.map((id) => {
      const c = CATEGORIES.find((x) => x.id === id)!;
      return { href: c.path, label: c.navLabel };
    }),
    { href: "/blog/", label: "Guides" },
  ];
  return (
    <header className="z-40 border-b border-line border-t-2 border-t-accent bg-surface/85 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-surface/75 [@media(min-height:35rem)]:sticky [@media(min-height:35rem)]:top-0">
      <div className="container-page flex h-[var(--header-h)] items-center gap-2">
        <Wordmark priority />
        <nav aria-label="Main" className="ml-3 hidden items-center gap-1 lg:flex xl:ml-6">
          <button type="button" popoverTarget="nav-tools" className={`${NAV_LINK} bg-surface-2`}>
            All tools
            <Icon name="chevron-down" size={16} />
          </button>
          <NavLinks items={items} />
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <SearchTrigger />
          <ThemeToggle className="hidden lg:inline-flex" />
          <Link href="/tools/" className="btn btn-primary hidden h-10 rounded-full px-5 shadow-sm xl:inline-flex">
            Browse tools <Icon name="arrow-right" size={16} />
          </Link>
          <MobileMenu categories={cats} />
        </div>
      </div>
      {/* "All tools" panel: native popover (Esc + light dismiss built in); links are in server HTML. */}
      <div
        id="nav-tools"
        popover="auto"
        className="m-0 mx-auto mt-2 w-[min(100%-2rem,72rem)] rounded-2xl border border-line bg-surface p-5 text-ink shadow-overlay [inset:var(--header-h)_0_auto_0]"
      >
        <div className="mb-3 flex items-center justify-between gap-4 px-2">
          <p className="eyebrow">Tool categories</p>
          <Link href="/tools/" className="link-more">
            Browse all {TOOLS.length} tools A–Z <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link href={c.path} className={`cat-${c.id} group flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-hue-tint`}>
                <Image src={categoryArt(c.id)} alt="" width={44} height={44} className="illo size-11 shrink-0" />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    {c.label}
                    <span className="rounded-full bg-hue-bg px-1.5 text-[0.6875rem] leading-5 font-semibold text-hue tabular-nums">
                      {counts[c.id] ?? 0}
                    </span>
                  </span>
                  <span className="mt-0.5 line-clamp-1 block text-[0.8125rem] text-ink-3">{c.card}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
