import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { RailCard, StaticPage, TocCard } from "@/components/StaticPage";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

const TITLE = "Terms and Conditions | Premier SEO Services";
const DESCRIPTION =
  "Terms for using the free tools on Premier SEO Services: acceptable use of the website checkers, no warranty on results, and responsibility for your content.";

export const metadata: Metadata = buildMetadata({ path: "/terms-and-conditions/", title: TITLE, description: DESCRIPTION });

const SECTIONS = [
  ["using-the-tools", "Using the tools"],
  ["acceptable-use", "Acceptable use"],
  ["no-warranty", "No warranty"],
  ["liability", "Liability"],
  ["third-party", "Third-party services and links"],
  ["privacy", "Privacy"],
  ["changes", "Changes and contact"],
] as const;

const SUMMARY = [
  "Free for personal and commercial use, with no account.",
  "You keep every right to the files and results you create.",
  "Only test websites you own or are allowed to check.",
  "Results are provided as is — verify anything important.",
] as const;

export default function TermsPage() {
  return (
    <StaticPage
      path="/terms-and-conditions/"
      title={TITLE}
      description={DESCRIPTION}
      h1="Terms and conditions"
      lead="By using premierseoservices.com you agree to these terms. They're written to be read, not skimmed."
      updated="2026-09-30"
      icon="file-text"
      hue="hue-indigo"
      eyebrow="Legal"
      aside={
        <>
          <RailCard title="In plain English" icon="circle-check" hue="hue-indigo">
            <ul className="grid gap-2.5">
              {SUMMARY.map((text) => (
                <li key={text} className="flex gap-2.5">
                  <Icon name="circle-check" size={16} className="mt-0.5 shrink-0 text-hue" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-3">A summary for orientation only; the sections below are what apply.</p>
          </RailCard>
          <TocCard sections={SECTIONS} hue="hue-indigo" />
          <RailCard title="Related pages" icon="file-text" hue="hue-green">
            <ul className="grid gap-1.5">
              {(
                [
                  ["/privacy-policy/", "Privacy policy"],
                  ["/about-us/", "About us"],
                  ["/contact/", "Contact us"],
                ] as const
              ).map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
                    {label} <Icon name="arrow-right" size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          </RailCard>
        </>
      }
    >
      <h2 id="using-the-tools">Using the tools</h2>
      <p>
        The tools are free for personal and commercial use. You don&apos;t need an account. You keep all rights to the text, files and
        results you create with them.
      </p>

      <h2 id="acceptable-use">Acceptable use</h2>
      <ul>
        <li>Only check websites you own or have permission to test, and don&apos;t use the checkers to overload or probe other people&apos;s sites.</li>
        <li>Don&apos;t automate requests to our tools or APIs, or try to get around rate limits.</li>
        <li>Don&apos;t use generated data (for example test card numbers or fake names) to deceive anyone or to attempt payments or sign-ups.</li>
        <li>Don&apos;t upload content you have no right to process.</li>
      </ul>
      <p>We may block access that breaks these rules.</p>

      <h2 id="no-warranty">No warranty</h2>
      <p>
        We test the tools carefully and explain how each one works, but they are provided &ldquo;as is&rdquo;. Results can be affected by
        your browser, your input and the websites you check. Check important results yourself, especially calculator results used for
        financial, tax or health decisions, which are estimates and not professional advice.
      </p>

      <h2 id="liability">Liability</h2>
      <p>
        To the extent the law allows, we are not liable for losses arising from use of the site or reliance on its results, including lost
        data. Keep your own copies of files you process.
      </p>

      <h2 id="third-party">Third-party services and links</h2>
      <p>
        Some tools use external services (such as Google PageSpeed Insights); their terms apply to those requests. Links to other websites
        are provided for convenience; we aren&apos;t responsible for their content.
      </p>

      <h2 id="privacy">Privacy</h2>
      <p>
        See the <Link href="/privacy-policy/">privacy policy</Link> for how data is handled.
      </p>

      <h2 id="changes">Changes and contact</h2>
      <p>
        We may update these terms; the date at the top shows the latest version. Questions: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
    </StaticPage>
  );
}
