import Image from "next/image";
import Link from "next/link";
import { CategoryCard, ToolGrid, categoryCounts } from "@/components/cards";
import { FaqItems } from "@/components/Faq";
import { Icon } from "@/components/Icon";
import { RecentTools } from "@/components/RecentTools";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { HomeHero } from "./HomeHero";
import { CATEGORIES, CATEGORY_BY_ID } from "@/content/categories";
import { GUIDES } from "@/content/guides";
import { TOOLS, popularTools } from "@/content/tools";
import type { CategoryId, Faq, IconName } from "@/lib/types";

export interface Toolkit {
  id: CategoryId;
  heading: string;
  blurb: string;
  picks: string[];
}

const STEPS: { t: string; d: string; icon: IconName; hue: string }[] = [
  { t: "Pick a tool", d: "Search by task, like “compress pdf”, or browse a category.", icon: "search", hue: "hue-blue" },
  { t: "Add your file or text", d: "Paste, type or drop a file. Most tools process it right in your browser.", icon: "folder", hue: "hue-indigo" },
  { t: "Get your result", d: "Copy or download it straight away. Nothing to install or sign up for.", icon: "zap", hue: "hue-orange" },
];

/** Colour and icon per guide topic, so the guide cards are easy to tell apart. */
const GUIDE_STYLE: Record<string, { hue: string; icon: IconName }> = {
  "Image optimization": { hue: "hue-purple", icon: "image" },
  "PDF workflows": { hue: "hue-red", icon: "file-text" },
  Writing: { hue: "hue-orange", icon: "pen" },
  "Content optimization": { hue: "hue-teal", icon: "scan-text" },
  "On-page SEO": { hue: "hue-green", icon: "trending-up" },
  "Technical SEO": { hue: "hue-blue", icon: "code" },
};

const TRUST: { icon: IconName; hue: string; title: string; text: string }[] = [
  {
    icon: "shield-check",
    hue: "hue-green",
    title: "Processed on your device",
    text: "Text, image, PDF, developer and calculator tools run in your browser. Your files and text are not uploaded.",
  },
  {
    icon: "lock",
    hue: "hue-blue",
    title: "Clearly marked when we fetch",
    text: "Website checkers must request the address you enter from our server. Those pages say so, and we don't store what we fetch.",
  },
  {
    icon: "circle-check",
    hue: "hue-purple",
    title: "No accounts, no invented numbers",
    text: "No sign-up, no paywall, and no estimates dressed up as data. Where a tool can't measure something, it says so.",
  },
];

export function HomeView({ start, toolkits, faq }: { start: string[]; toolkits: Toolkit[]; faq: Faq[] }) {
  const counts = categoryCounts();
  const startTools = popularTools(start);
  const guides = GUIDES.slice(0, 4);
  const local = TOOLS.filter((t) => t.processing === "browser").length;

  return (
    <>
      <HomeHero />

      <div className="container-page">
        <RecentTools />

        {startTools.length > 0 && (
          <section aria-labelledby="start" className="mt-14">
            <SectionHeader
              id="start"
              title="Most-needed tools"
              subtitle="Our editors' picks for everyday jobs, ready when you need them."
              action={
                <Link href="/tools/" className="link-more">
                  View all tools <Icon name="arrow-right" size={16} />
                </Link>
              }
            />
            <ToolGrid tools={startTools} />
          </section>
        )}

        {/* How it works */}
        <section
          aria-labelledby="how"
          className="mt-16 rounded-3xl border border-line bg-[linear-gradient(135deg,var(--surface-3),var(--surface)_75%)] p-5 sm:p-8 lg:p-10"
        >
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="max-w-xl">
              <p className="eyebrow eyebrow-pill">How it works</p>
              <h2 id="how" className="section-title mt-3">
                Get results in 3 simple steps
              </h2>
              <p className="mt-1.5 text-[0.9375rem] text-ink-3">No installs, no accounts, no limits. Most tools work directly in your browser.</p>
            </div>
            <Link href="/tools/" className="btn btn-secondary h-11 rounded-full px-5">
              Browse all tools <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          <ol className="relative mt-8 grid gap-4 lg:grid-cols-3 lg:gap-6">
            {/* Dashed connector, visible in the gaps between the step cards */}
            <span aria-hidden="true" className="absolute top-12 right-[12%] left-[12%] hidden border-t-2 border-dashed border-accent-line lg:block" />
            {STEPS.map((s, i) => (
              <li key={s.t} className={`${s.hue} card relative flex gap-4 p-5 sm:p-6 lg:block`}>
                <div className="flex shrink-0 items-start justify-between">
                  <span className="icon-tile size-12 rounded-2xl">
                    <Icon name={s.icon} size={24} />
                  </span>
                  {/* Decorative step number, drawn as generated content so it stays out of the accessibility tree */}
                  <span
                    aria-hidden="true"
                    data-n={`0${i + 1}`}
                    className="hidden text-3xl leading-none font-extrabold tracking-tight text-line before:content-[attr(data-n)] lg:block"
                  />
                </div>
                <div className="lg:mt-5">
                  <p className="eyebrow text-hue">Step {i + 1}</p>
                  <h3 className="mt-1 text-[1.0625rem] font-bold text-ink">{s.t}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-ink-3">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="cats" className="mt-16">
          <SectionHeader id="cats" eyebrow="Browse tools" title="Tool categories" subtitle="Everything you need, organized for easy access." />
          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {CATEGORIES.map((c) => (
              <CategoryCard key={c.id} cat={c} count={counts[c.id] ?? 0} />
            ))}
          </ul>
        </section>
      </div>

      {/* Dark feature band */}
      <section aria-labelledby="band" className="band-dark mt-20 overflow-hidden">
        <div className="container-page grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-16">
          <div>
            <p className="eyebrow eyebrow-pill border-white/15 bg-white/5 text-[#9cc0ff]">Fast · Private · Reliable</p>
            <h2 id="band" className="mt-4 text-[1.875rem] leading-tight font-bold tracking-[-0.025em] text-white sm:text-4xl">
              Powerful tools, right in your browser
            </h2>
            <p className="mt-4 max-w-lg text-[#c3cde4]">
              Every tool is free to use and works instantly. Most never upload your files at all — simple, private and built for getting
              things done.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/tools/" className="btn btn-lg bg-[#1b64f2] text-white shadow-[0_8px_24px_-8px_rgb(27_100_242/0.7)] hover:bg-[#3b7bff]">
                Browse all tools <Icon name="arrow-right" size={18} />
              </Link>
              <Link href="/about-us/" className="btn btn-lg btn-on-dark">
                How we build the tools
              </Link>
            </div>
            <ul className="mt-10 grid gap-5 sm:grid-cols-3">
              {(
                [
                  ["user-x", "No sign-up required", "Start using any tool instantly."],
                  ["monitor", `${local} run in your browser`, "Your data stays on your device."],
                  ["zap", "Fast and focused", "Each tool does one job well."],
                ] as const
              ).map(([icon, t, d]) => (
                <li key={t} className="flex gap-3 sm:block">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-[#9cc0ff]">
                    <Icon name={icon} size={18} />
                  </span>
                  <span className="sm:mt-3 sm:block">
                    <span className="block text-sm font-semibold text-white">{t}</span>
                    <span className="mt-0.5 block text-[0.8125rem] text-[#a9b5d1]">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div aria-hidden="true" className="relative hidden lg:block">
            <Image
              src="/illustrations/band-dark.webp"
              alt=""
              width={640}
              height={460}
              sizes="560px"
              className="w-full [mask-image:radial-gradient(ellipse_75%_80%_at_50%_50%,#000_55%,transparent_100%)]"
            />
          </div>
        </div>
      </section>

      <div className="container-page">
        {toolkits.map((k) => {
          const picks = popularTools(k.picks);
          if (!picks.length) return null;
          const cat = CATEGORY_BY_ID[k.id];
          return (
            <section key={k.id} aria-labelledby={`kit-${k.id}`} className="mt-16">
              <SectionHeader
                id={`kit-${k.id}`}
                title={k.heading}
                subtitle={k.blurb}
                className="mb-5"
                action={
                  <Link href={cat.path} className="link-more">
                    View all {cat.label.toLowerCase()} <Icon name="arrow-right" size={16} />
                  </Link>
                }
              />
              <ToolGrid tools={picks} />
            </section>
          );
        })}

        <section aria-labelledby="trust" className="mt-20">
          <SectionHeader id="trust" eyebrow="Privacy and trust" title="How we handle your files and data" />
          <div className="grid gap-4 md:grid-cols-3">
            {TRUST.map((b) => (
              <div key={b.title} className={`${b.hue} card flex gap-4 p-5 sm:p-6`}>
                <span className="icon-tile size-12 rounded-2xl">
                  <Icon name={b.icon} size={24} />
                </span>
                <div>
                  <p className="font-semibold text-ink">{b.title}</p>
                  <p className="mt-1 text-sm leading-6 text-ink-3">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link href="/about-us/" className="link-more">
              About Premier SEO Services
            </Link>
            <Link href="/privacy-policy/" className="link-more">
              Privacy policy
            </Link>
          </p>
        </section>

        {guides.length > 0 && (
          <section aria-labelledby="guides" className="mt-20">
            <SectionHeader
              id="guides"
              eyebrow="Learn"
              title="Guides"
              subtitle="Step-by-step explanations of the jobs our tools help with."
              action={
                <Link href="/blog/" className="link-more">
                  All guides <Icon name="arrow-right" size={16} />
                </Link>
              }
            />
            <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {guides.map((g) => {
                const st = GUIDE_STYLE[g.cluster] ?? { hue: "hue-blue", icon: "book-open" as IconName };
                return (
                  <li key={g.slug} className={`${st.hue} card-link group flex flex-col p-5 sm:p-6`}>
                    <span className="flex items-center gap-3">
                      <span className="icon-tile size-10 rounded-xl">
                        <Icon name={st.icon} size={20} />
                      </span>
                      <span className="eyebrow text-hue">{g.cluster}</span>
                    </span>
                    <h3 className="mt-4 line-clamp-2 text-[1.0625rem] leading-snug font-bold text-ink">
                      <Link href={g.path}>{g.h1}</Link>
                    </h3>
                    <p className="mt-2 mb-5 line-clamp-2 text-sm leading-6 text-ink-3">{g.metaDescription}</p>
                    <span className="mt-auto flex items-center justify-between border-t border-line pt-4 text-[0.8125rem] font-medium text-ink-3">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="clock" size={14} />
                        {g.readingMinutes ? `${g.readingMinutes} min read` : "Guide"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-hue">
                        Read guide
                        <span className="arrow-dot size-6">
                          <Icon name="arrow-right" size={13} strokeWidth={2.25} />
                        </span>
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section aria-labelledby="faq" className="mt-20">
          <SectionHeader
            id="faq"
            eyebrow="Common questions"
            title="Frequently asked questions"
            action={
              <Link href="/faq/" className="link-more">
                View all FAQs <Icon name="arrow-right" size={16} />
              </Link>
            }
          />
          <FaqItems items={faq} layout="grid" />
        </section>
      </div>
    </>
  );
}
