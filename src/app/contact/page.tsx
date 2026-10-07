import type { Metadata } from "next";
import Link from "next/link";
import { ReportForm } from "@/components/ReportForm";
import { Icon } from "@/components/Icon";
import { RailCard, StaticPage } from "@/components/StaticPage";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

const TITLE = "Contact Premier SEO Services";
const DESCRIPTION =
  "Contact the team behind Premier SEO Services: ask about a tool, suggest a new one or send a correction. Email info@premierseoservices.com or use the form.";

export const metadata: Metadata = buildMetadata({ path: "/contact/", title: TITLE, description: DESCRIPTION });

export default function ContactPage() {
  return (
    <StaticPage
      path="/contact/"
      title={TITLE}
      description={DESCRIPTION}
      h1="Contact us"
      schemaType="ContactPage"
      lead="Questions about a tool, ideas for new ones and corrections are all welcome."
      icon="mail"
      hue="hue-blue"
      eyebrow="Help"
      aside={
        <>
          <RailCard title="Email us" icon="mail">
            <a href={`mailto:${SITE.email}`} className="font-semibold break-all text-accent hover:underline">
              {SITE.email}
            </a>
            <p className="mt-2 text-ink-3">We&apos;re a small team, so replies can take a few working days.</p>
          </RailCard>
          <RailCard title="A tool isn't working?" icon="circle-alert" hue="hue-orange">
            <p>The report form tells us which tool and what went wrong, so it&apos;s the quickest route to a fix.</p>
            <Link href="/tool-complain/" className="mt-3 inline-flex items-center gap-1 font-semibold text-accent hover:underline">
              Report a problem <Icon name="arrow-right" size={14} />
            </Link>
          </RailCard>
        </>
      }
    >
      <h2>Email</h2>
      <p>
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. We&apos;re a small team, so replies can take a few working days.
      </p>
      <p>
        If a specific tool gave a wrong result or didn&apos;t work, the <Link href="/tool-complain/">report a problem</Link> form is the
        quickest route, because it tells us which tool and what went wrong.
      </p>
      <h2>Send a message</h2>
      <div className="not-prose">
        <ReportForm kind="contact" email={SITE.email} />
      </div>
      <h2>Before you write</h2>
      <ul>
        <li>
          We don&apos;t offer paid SEO services, audits or link building. See <Link href="/about-us/">about us</Link>.
        </li>
        <li>
          Please don&apos;t send files or private data. None of our text, image or PDF tools need you to send us anything; they run in your
          browser.
        </li>
        <li>
          Guest article pitches: read the <Link href="/write-for-us/">editorial guidelines</Link> first.
        </li>
      </ul>
    </StaticPage>
  );
}
