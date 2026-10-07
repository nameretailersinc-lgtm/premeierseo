import Image from "next/image";
import Link from "next/link";
import { categoryCounts } from "@/components/cards";
import { Icon } from "@/components/Icon";
import { SearchBox } from "@/components/search/SearchBox";
import { CATEGORY_BY_ID } from "@/content/categories";
import { TOOLS } from "@/content/tools";
import type { CategoryId } from "@/lib/types";

/*
 * Homepage hero, built to the approved mockup: badge row, two-line headline, subtitle, pill search and
 * popular chips on the left; the desk scene (public/home-hero/scene.webp, made by
 * scripts/art/build-hero-scene.py) bleeding off the right edge with three stat cards over it; and the
 * category strip underneath. Stat-card text scales with the scene via container-query units.
 */

const QUICK: [string, string][] = [
  ["/compress-jpg-image/", "Compress JPG"],
  ["/word-counter/", "Word counter"],
  ["/merge-pdf/", "Merge PDF"],
  ["/json-viewer/", "JSON viewer"],
  ["/image-resizer/", "Resize image"],
  ["/robots-txt-generator/", "Robots.txt"],
];

const STRIP: { id: CategoryId; title: string; line: string; art?: string }[] = [
  { id: "text-tools", title: "Text Tools", line: "Count, convert and format text", art: "cat-text" },
  { id: "binary-tools", title: "Binary Tools", line: "Encode, decode and convert" },
  { id: "free-seo-tools", title: "SEO Tools", line: "Analyze, optimize and improve", art: "cat-seo" },
  { id: "imaging-tools", title: "Image Tools", line: "Resize, convert and edit images", art: "cat-image" },
  { id: "pdf-tools", title: "PDF Tools", line: "Merge, split and convert", art: "cat-pdf" },
  { id: "development-tools", title: "Developer Tools", line: "Format, validate and convert data", art: "cat-dev" },
  { id: "traffic-performance-tools", title: "Performance Tools", line: "Test, analyze and optimize", art: "cat-performance" },
  { id: "calculator-tools", title: "Calculators", line: "Solve, calculate and convert", art: "cat-calc" },
  { id: "other-tools", title: "Generators", line: "Create, generate and customize", art: "cat-generators" },
];

export function HomeHero() {
  const total = TOOLS.length;
  const counts = categoryCounts();
  /* Card boxes are percentages of the scene image (1012×525), matching where the mockup placed them. */
  const stats = [
    { href: "/tools/", icon: "trending-up" as const, tone: "text-[#16a34a]", big: `${total}+`, small: "Free tools", box: "top-[10%]" },
    { href: "/privacy-policy/", icon: "shield-check" as const, tone: "text-[#2563eb]", big: "Private", small: "Runs in browser", box: "top-[31%]" },
    { href: "/tools/", icon: "zap" as const, tone: "text-[#7c3aed]", big: "Instant", small: "No sign-up", box: "top-[52%]" },
  ];

  return (
    <section className="hero-band relative overflow-hidden [--scene-w:min(52vw,calc(50vw-30px))]">
      {/* Desk scene + stat cards (desktop) */}
      <div className="@container absolute top-0 right-0 z-0 hidden aspect-[1012/525] w-[var(--scene-w)] [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,#000_24%),linear-gradient(to_bottom,#000_78%,transparent)] lg:block">
        <Image
          src="/home-hero/scene.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 52vw, 1px"
          className="pointer-events-none object-cover object-left select-none"
        />
        <ul className="absolute inset-0 hidden xl:block">
          {stats.map((s) => (
            <li key={s.big} className={`absolute left-[68%] w-[26%] ${s.box}`}>
              <Link
                href={s.href}
                className="group flex items-center gap-[1.6cqw] rounded-[1.9cqw] border border-white/70 bg-white/80 px-[2cqw] py-[1.7cqw] text-[#0b1630] shadow-[0_10px_30px_-12px_rgb(15_30_70/0.35)] backdrop-blur-md transition-colors hover:bg-white/95"
              >
                <Icon name={s.icon} size={40} strokeWidth={2.4} className={`size-[4.4cqw] shrink-0 ${s.tone}`} />
                <span className="min-w-0 flex-1 leading-none whitespace-nowrap">
                  <span className="block text-[2.55cqw] font-extrabold tracking-[-0.02em]">{s.big}</span>
                  <span className="mt-[0.5cqw] block text-[1.65cqw] font-medium text-[#3c4a66]">{s.small}</span>
                </span>
                <Icon name="chevron-right" size={18} className="size-[1.9cqw] shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="container-page relative z-10 pt-8 pb-8 sm:pt-12 lg:pt-[2.6vw] lg:pb-0">
        <div className="rise relative z-20 lg:min-h-[calc(var(--scene-w)*0.5188-2.6vw)] lg:max-w-[50%] lg:pb-[1.2vw]">
          <ul className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-full border border-line bg-surface/95 px-4 py-2 text-[0.8125rem] font-medium text-ink-2 shadow-[var(--shadow-card)]">
            <li className="inline-flex items-center gap-2 font-semibold text-[var(--hue-green)]">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--hue-green)] opacity-40 motion-reduce:hidden" />
                <span className="relative inline-flex size-2 rounded-full bg-[var(--hue-green)]" />
              </span>
              100% free
            </li>
            <li aria-hidden="true" className="size-1 rounded-full bg-line-strong/50" />
            <li className="inline-flex items-center gap-1.5">
              <Icon name="user-x" size={15} className="text-ink-3" />
              No sign-up
            </li>
            <li aria-hidden="true" className="size-1 rounded-full bg-line-strong/50" />
            <li className="inline-flex items-center gap-1.5">
              <Icon name="lock" size={15} className="text-ink-3" />
              Privacy-first
            </li>
          </ul>

          <h1 className="mt-6 text-[2.25rem] leading-[1.08] font-extrabold tracking-[-0.045em] text-ink sm:text-[3rem] lg:mt-[1.9vw] lg:text-[clamp(2.25rem,3.5vw,3.6rem)] lg:whitespace-nowrap">
            Free Online Tools for <br />
            <span className="text-[var(--hue-blue)]">SEO</span>, <span className="text-[var(--hue-purple)]">Text</span>,{" "}
            <span className="text-[var(--hue-pink)]">Images</span> and <span className="text-[var(--hue-orange)]">PDFs</span>
          </h1>
          <p className="mt-3 max-w-[42rem] text-base leading-7 text-ink-2 lg:text-[clamp(1rem,1.15vw,1.2rem)] lg:leading-[1.6]">
            {total}+ free, fast and easy-to-use tools for everyday work. Find the right one, get the job done, and get on with your day.
          </p>

          <div className="mt-6 max-w-[42rem] lg:mt-[1.5vw] [&_button[type=submit]]:rounded-full sm:[&_button[type=submit]]:after:ml-2 sm:[&_button[type=submit]]:after:content-['→'] [&_button[type=submit]]:px-6 [&_input[type=search]]:h-[3.15rem] [&_input[type=search]]:rounded-full [&_input[type=search]]:border-line [&_input[type=search]]:pl-14 [&_input[type=search]]:shadow-[0_12px_32px_-12px_rgb(15_30_70/0.25)]">
            <SearchBox trigger="hero" placeholder="Try “compress pdf”" />
          </div>

          <p className="mt-3.5 flex flex-wrap items-center gap-1.5 text-sm lg:w-[112%] xl:flex-nowrap">
            <span className="mr-1 font-semibold text-ink">Popular:</span>
            {QUICK.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="inline-flex min-h-[1.875rem] items-center rounded-full border border-line bg-surface px-3 text-[0.78rem] whitespace-nowrap font-medium text-ink-2 transition-colors hover:border-accent-line hover:text-accent"
              >
                {label}
              </Link>
            ))}
          </p>
        </div>

        {/* Category strip: aligned to the page grid, one row on desktop, swipeable on phones */}
        <nav
          aria-label="Tool categories"
          className="rise rise-2 relative z-10 mt-10 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-[0_16px_40px_-18px_rgb(15_30_70/0.25)] backdrop-blur sm:mt-12 lg:mt-6"
        >
          <ul className="grid grid-cols-3 gap-1 lg:grid-cols-9">
            {STRIP.map((c) => {
              const cat = CATEGORY_BY_ID[c.id];
              const n = counts[c.id] ?? 0;
              return (
                <li key={c.id} className={`cat-${c.id} min-w-0`}>
                  <Link
                    href={cat.path}
                    title={c.line}
                    className="group flex h-full flex-col items-center rounded-xl px-2 pt-3.5 pb-3 text-center transition-colors hover:bg-hue-tint focus-visible:bg-hue-tint"
                  >
                    {c.art ? (
                      <Image
                        src={`/home-hero/${c.art}.webp`}
                        alt=""
                        width={64}
                        height={64}
                        className="illo size-11 object-contain transition-transform duration-200 group-hover:-translate-y-0.5"
                      />
                    ) : (
                      <span className="icon-tile size-11 rounded-xl transition-transform duration-200 group-hover:-translate-y-0.5">
                        <Icon name={cat.icon} size={24} />
                      </span>
                    )}
                    <span className="mt-2.5 block text-[0.8125rem] leading-5 font-semibold whitespace-nowrap text-ink">{cat.navLabel}</span>
                    <span className="block text-[0.6875rem] leading-4 font-medium text-ink-3 tabular-nums group-hover:text-hue">
                      {n} {n === 1 ? "tool" : "tools"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </section>
  );
}
