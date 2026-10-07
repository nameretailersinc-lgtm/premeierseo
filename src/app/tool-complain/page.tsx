import type { Metadata } from "next";
import Link from "next/link";
import { ReportForm } from "@/components/ReportForm";
import { Icon } from "@/components/Icon";
import { RailCard, StaticPage } from "@/components/StaticPage";
import { TOOLS } from "@/content/tools";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

const TITLE = "Report a Problem With a Tool | Premier SEO Services";
const DESCRIPTION =
  "Found a tool that gave a wrong result, showed an error or didn't load? Tell us which tool and what happened, and we'll look into it.";

// Utility page: kept at its existing URL, not indexed (keyword map).
export const metadata: Metadata = buildMetadata({ path: "/tool-complain/", title: TITLE, description: DESCRIPTION, indexable: false });

const STEPS = [
  ["Pick the tool", "Choose it from the list so the report reaches the right place."],
  ["Describe what happened", "What you expected, and what the tool did instead."],
  ["We reproduce it", "A report that we can reproduce is usually fixed in the next release."],
] as const;

export default function ReportPage() {
  const tools = [...TOOLS].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ id: t.id, name: t.name }));
  return (
    <StaticPage
      path="/tool-complain/"
      title={TITLE}
      description={DESCRIPTION}
      h1="Report a problem"
      lead="Tell us which tool went wrong and what happened. Reports go straight to the people who build the tools."
      icon="circle-alert"
      hue="hue-orange"
      eyebrow="Help"
      aside={
        <>
          <RailCard title="How it works" icon="circle-check" hue="hue-orange">
            <ol className="grid gap-3">
              {STEPS.map(([title, text], i) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-hue-bg text-xs font-bold text-hue">
                    {i + 1}
                  </span>
                  <span>
                    <strong className="font-semibold text-ink">{title}.</strong> {text}
                  </span>
                </li>
              ))}
            </ol>
          </RailCard>
          <RailCard title="Something else?" icon="mail">
            <p>For questions, corrections or a tool request, the contact page is the right place.</p>
            <p className="mt-3 flex flex-col gap-1.5">
              <Link href="/contact/" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
                Contact us <Icon name="arrow-right" size={14} />
              </Link>
              <Link href="/faq/" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
                Read the FAQ <Icon name="arrow-right" size={14} />
              </Link>
              <a href={`mailto:${SITE.email}`} className="font-semibold break-all text-accent hover:underline">
                {SITE.email}
              </a>
            </p>
          </RailCard>
        </>
      }
    >
      <div className="not-prose">
        <ReportForm kind="problem" tools={tools} email={SITE.email} />
      </div>
      <h2>What helps us fix it</h2>
      <ul>
        <li>The browser and device you used (for example Chrome on Android).</li>
        <li>What you expected the tool to do, and what it did instead.</li>
        <li>For file tools: the file type and rough size. Please don&apos;t send the file itself.</li>
      </ul>
      <p>
        For anything else, use the <Link href="/contact/">contact page</Link>.
      </p>
    </StaticPage>
  );
}
