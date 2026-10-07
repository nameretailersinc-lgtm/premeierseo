import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { RailCard, StaticPage } from "@/components/StaticPage";
import { CATEGORIES } from "@/content/categories";
import { TOOLS } from "@/content/tools";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

const TITLE = "About Premier SEO Services – Who Runs These Free Tools";
const DESCRIPTION =
  "A free collection of online tools for text, SEO, images, PDFs and code, run by a small independent team since 2025. Who we are and how we test the tools.";

export const metadata: Metadata = buildMetadata({ path: "/about-us/", title: TITLE, description: DESCRIPTION });

export default function AboutPage() {
  const browser = TOOLS.filter((t) => t.processing === "browser").length;
  return (
    <StaticPage
      path="/about-us/"
      title={TITLE}
      description={DESCRIPTION}
      h1="About Premier SEO Services"
      schemaType="AboutPage"
      lead="Premier SEO Services is a free website of single-purpose online tools: text utilities, SEO checks, image and PDF tools, developer helpers and calculators."
      updated="2026-09-30"
      icon="info"
      hue="hue-blue"
      eyebrow="Company"
      aside={
        <>
          <div className="card grid grid-cols-3 divide-x divide-line overflow-hidden lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
            {(
              [
                [TOOLS.length, "free tools"],
                [CATEGORIES.length, "categories"],
                [browser, "run in your browser"],
              ] as const
            ).map(([n, l]) => (
              <div key={l} className="p-4 text-center lg:flex lg:items-baseline lg:gap-3 lg:px-5 lg:text-left">
                <p className="text-2xl font-extrabold tracking-tight text-accent tabular-nums lg:text-3xl">{n}</p>
                <p className="text-xs text-ink-3 lg:text-sm">{l}</p>
              </div>
            ))}
          </div>
          <RailCard title="Get in touch" icon="mail">
            <p>Questions, corrections and tool requests are welcome.</p>
            <p className="mt-3 flex flex-col gap-1.5">
              <a href={`mailto:${SITE.email}`} className="font-semibold text-accent hover:underline">
                {SITE.email}
              </a>
              <Link href="/contact/" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
                Contact page <Icon name="arrow-right" size={14} />
              </Link>
            </p>
          </RailCard>
        </>
      }
    >
      <h2>Who runs the site</h2>
      <p>
        The site is built and maintained by a small independent team, Shaikh &amp; Son, and went live in {SITE.foundingYear}. We are not
        an agency and we don&apos;t sell SEO services; the tools are the whole product. You can reach us at{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
      <p>
        This website is not connected to the Utah-based SEO agency that used the premierseoservices.com domain before 2016. Pages from that
        business no longer exist here.
      </p>

      <h2>What you&apos;ll find here</h2>
      <p>
        {TOOLS.length} tools in {CATEGORIES.length} categories. Each one does one job and opens ready to use, with an explanation of how it
        works underneath:
      </p>
      <ul>
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link href={c.path}>{c.label}</Link>: {c.card.charAt(0).toLowerCase() + c.card.slice(1)}
          </li>
        ))}
      </ul>

      <h2>How the tools handle your data</h2>
      <p>
        {browser} of the {TOOLS.length} tools run entirely in your browser: the text you paste and the files you choose stay on your device.
        The rest check live websites (redirects, status codes, page speed), so our server has to request the address you enter; those pages
        say so above the tool. Each tool page has a short &ldquo;privacy&rdquo; section generated from how that tool actually works, and the{" "}
        <Link href="/privacy-policy/">privacy policy</Link> covers the details.
      </p>

      <h2>How we build and test tools</h2>
      <ul>
        <li>
          <strong>Computed, not simulated.</strong> Every number a tool shows is calculated from your input or measured from a real
          request. If a tool can&apos;t measure something (search volume, backlink counts), it says so instead of estimating.
        </li>
        <li>
          <strong>Checked against references.</strong> Encoders, hashes and converters are tested against published test vectors and
          standards (for example RFC 4648 for Base64). Calculators show their formula and cite their source.
        </li>
        <li>
          <strong>Explained.</strong> Each page states the rules the tool follows and its limits, so you can judge whether the result fits
          your case.
        </li>
        <li>
          <strong>Fixed when reported.</strong> Every tool page links to a{" "}
          <Link href="/tool-complain/">report form</Link>. We read every report.
        </li>
      </ul>

      <h2>How the site is funded</h2>
      <p>
        The tools are free with no accounts and no paid tier. The site currently shows no advertising and doesn&apos;t use affiliate
        links. If that changes, this page will say so.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, corrections and tool requests are welcome: <Link href="/contact/">contact us</Link> or email{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
    </StaticPage>
  );
}
