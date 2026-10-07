import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CategoryCard, categoryCounts } from "@/components/cards";
import { Icon } from "@/components/Icon";
import { SearchBox } from "@/components/search/SearchBox";
import { CATEGORIES } from "@/content/categories";

export const metadata: Metadata = {
  title: { absolute: "Page not found | Premier SEO Services" },
  robots: { index: false, follow: true },
};

export default function NotFound() {
  const counts = categoryCounts();
  return (
    <>
      <div className="hero-band">
        <div className="container-page grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-search">
            <p className="eyebrow eyebrow-pill">Error 404</p>
            <h1 className="mt-4 text-[2rem] leading-[1.1] font-extrabold tracking-[-0.03em] text-ink sm:text-[2.75rem]">
              We couldn&apos;t find that page
            </h1>
            <p className="mt-4 text-base leading-7 text-ink-2 sm:text-lg">
              The address may be mistyped, or the page may have moved. Search for the tool you need, or pick a category below.
            </p>
            <div className="mt-7 [&_input[type=search]]:shadow-[var(--shadow-hero)]">
              <SearchBox trigger="404" />
            </div>
            <p className="mt-5 flex flex-wrap gap-3">
              <Link href="/" className="btn btn-secondary">
                Homepage
              </Link>
              <Link href="/tools/" className="btn btn-primary">
                All tools A–Z <Icon name="arrow-right" size={16} />
              </Link>
            </p>
          </div>
          <Image src="/illustrations/search.webp" alt="" width={240} height={240} priority className="illo float-slow hidden w-56 lg:block" />
        </div>
      </div>
      <div className="container-page">
        <h2 className="section-title mb-5">Tool categories</h2>
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <CategoryCard key={c.id} cat={c} count={counts[c.id] ?? 0} />
          ))}
        </ul>
      </div>
    </>
  );
}
