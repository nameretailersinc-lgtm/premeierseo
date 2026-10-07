import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { RailCard, StaticPage, TocCard } from "@/components/StaticPage";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

const TITLE = "Write for Us – Guide Contribution Guidelines";
const DESCRIPTION =
  "Editorial guidelines for contributing a guide to Premier SEO Services: topics we cover, how we review, and our link policy. We don't sell links or guest posts.";

// Utility page: kept at its existing URL, not indexed (keyword map).
export const metadata: Metadata = buildMetadata({ path: "/write-for-us/", title: TITLE, description: DESCRIPTION, indexable: false });

const SECTIONS = [
  ["what-we-publish", "What we publish"],
  ["what-we-dont", "What we don’t publish"],
  ["link-policy", "Our link policy"],
  ["how-to-pitch", "How to pitch"],
] as const;

const FACTS = [
  ["No fee either way", "We don’t pay for guides and we never charge to publish one."],
  ["Author links are nofollow", "Links to your own site carry rel=“nofollow”."],
  ["Edited and fact-checked", "Accepted drafts go through one editing round before publication."],
] as const;

export default function WriteForUsPage() {
  return (
    <StaticPage
      path="/write-for-us/"
      title={TITLE}
      description={DESCRIPTION}
      h1="Write for us"
      lead="We occasionally publish guides from practitioners who can teach something specific. There's no fee in either direction."
      updated="2026-09-30"
      icon="pen"
      hue="hue-purple"
      eyebrow="Contribute"
      aside={
        <>
          <RailCard title="Before you pitch" icon="info" hue="hue-purple">
            <ul className="grid gap-3">
              {FACTS.map(([title, text]) => (
                <li key={title} className="flex gap-2.5">
                  <Icon name="circle-check" size={16} className="mt-0.5 shrink-0 text-hue" />
                  <span>
                    <strong className="font-semibold text-ink">{title}.</strong> {text}
                  </span>
                </li>
              ))}
            </ul>
          </RailCard>
          <TocCard sections={SECTIONS} hue="hue-purple" />
          <RailCard title="Send your pitch" icon="mail">
            <p>
              Subject line <strong className="font-semibold text-ink">&ldquo;Guide pitch&rdquo;</strong>, with a title, a short outline and
              two writing samples.
            </p>
            <p className="mt-3 flex flex-col gap-1.5">
              <a href={`mailto:${SITE.email}?subject=Guide%20pitch`} className="font-semibold break-all text-accent hover:underline">
                {SITE.email}
              </a>
              <Link href="/blog/" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
                See published guides <Icon name="arrow-right" size={14} />
              </Link>
            </p>
          </RailCard>
        </>
      }
    >
      <h2 id="what-we-publish">What we publish</h2>
      <p>
        Practical guides that help people use our kind of tools well: technical SEO, on-page SEO, image and PDF optimization, web
        performance and web development. A good pitch explains a real problem, shows how you solved it, and includes something you tested
        yourself. See our <Link href="/blog/">existing guides</Link> for the style.
      </p>

      <h2 id="what-we-dont">What we don&apos;t publish</h2>
      <ul>
        <li>Articles written to carry a link, or content already published elsewhere.</li>
        <li>Promotional pieces, listicles without first-hand testing, or text generated without substantial human expertise.</li>
        <li>Gambling, adult, pharmaceutical, payday-loan or crypto-investment topics.</li>
      </ul>

      <h2 id="link-policy">Our link policy</h2>
      <p>
        We don&apos;t sell guest posts, link insertions or &ldquo;dofollow&rdquo; links, and we won&apos;t accept payment for publishing.
        Links in contributed articles are included only when they help the reader, and links to the author&apos;s own site are marked{" "}
        <code>rel=&quot;nofollow&quot;</code>, in line with Google&apos;s guidance on qualifying outbound links.
      </p>

      <h2 id="how-to-pitch">How to pitch</h2>
      <ol>
        <li>Email <a href={`mailto:${SITE.email}?subject=Guide%20pitch`}>{SITE.email}</a> with the subject &ldquo;Guide pitch&rdquo;.</li>
        <li>Include a working title, a five-line outline, and one or two samples of your published work.</li>
        <li>We reply if the topic fits. Accepted drafts go through an editing and fact-check round before publication.</li>
      </ol>
    </StaticPage>
  );
}
