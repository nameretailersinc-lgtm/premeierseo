import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { RailCard, StaticPage, TocCard } from "@/components/StaticPage";
import { TOOLS } from "@/content/tools";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

const TITLE = "Privacy Policy | Premier SEO Services";
const DESCRIPTION =
  "How Premier SEO Services handles data: most tools run in your browser, website checkers fetch pages from our server, and we use no advertising or tracking cookies.";

export const metadata: Metadata = buildMetadata({ path: "/privacy-policy/", title: TITLE, description: DESCRIPTION });

const GA = Boolean(process.env.NEXT_PUBLIC_GA_ID);

const SECTIONS = [
  ["who-we-are", "Who we are"],
  ["in-your-browser", "Tools that run in your browser"],
  ["our-server", "Tools that fetch a website"],
  ["third-party", "Tools that use a third-party service"],
  ["forms", "Forms"],
  ["browser-storage", "Storage in your browser"],
  ["analytics", "Analytics"],
  ["server-logs", "Server logs"],
  ["your-rights", "Your rights"],
  ["changes", "Changes"],
] as const;

export default function PrivacyPage() {
  const server = TOOLS.filter((t) => t.processing === "server").sort((a, b) => a.name.localeCompare(b.name));
  const third = TOOLS.filter((t) => t.processing === "third-party").sort((a, b) => a.name.localeCompare(b.name));
  const browser = TOOLS.filter((t) => t.processing === "browser").length;
  return (
    <StaticPage
      path="/privacy-policy/"
      title={TITLE}
      description={DESCRIPTION}
      h1="Privacy policy"
      lead="The short version: most tools never send your data anywhere, we have no accounts, and we don't use advertising or tracking cookies."
      updated="2026-09-30"
      icon="shield-check"
      hue="hue-green"
      eyebrow="Legal"
      aside={
        <>
          <RailCard title="At a glance" icon="shield-check" hue="hue-green">
            <ul className="grid gap-2.5">
              {[
                `${browser} of ${TOOLS.length} tools never send your data off your device`,
                "No accounts, no sign-up, no profiles",
                "No cookies and no advertising trackers",
                "We don’t store the pages our checkers fetch",
              ].map((text) => (
                <li key={text} className="flex gap-2.5">
                  <Icon name="circle-check" size={16} className="mt-0.5 shrink-0 text-hue" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </RailCard>
          <TocCard sections={third.length > 0 ? SECTIONS : SECTIONS.filter(([id]) => id !== "third-party")} hue="hue-green" />
          <RailCard title="Ask us about your data" icon="mail">
            <p>Want a message deleted, or not sure what we hold?</p>
            <a href={`mailto:${SITE.email}`} className="mt-3 inline-block font-semibold break-all text-accent hover:underline">
              {SITE.email}
            </a>
          </RailCard>
        </>
      }
    >
      <h2 id="who-we-are">Who we are</h2>
      <p>
        This policy covers premierseoservices.com, run by the Premier SEO Services team. Contact:{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>

      <h2 id="in-your-browser">Tools that run in your browser</h2>
      <p>
        Text, image, PDF, developer, binary and calculator tools process your input with code that runs on your own device. The text you
        paste and the files you choose are not uploaded to us or to anyone else. Each tool page states this in its privacy section.
      </p>

      <h2 id="our-server">Tools that fetch a website from our server</h2>
      <p>
        These tools need to request the web address you enter, so our server makes that request and returns the result to your browser. We
        don&apos;t store the pages we fetch or keep a list of the addresses people check:
      </p>
      <ul>
        {server.map((t) => (
          <li key={t.id}>
            <Link href={t.path}>{t.name}</Link>
          </li>
        ))}
      </ul>

      {third.length > 0 && (
        <>
          <h2 id="third-party">Tools that use a third-party service</h2>
          <ul>
            {third.map((t) => (
              <li key={t.id}>
                <Link href={t.path}>{t.name}</Link>: sends the address you enter to {t.thirdParty?.name} to {t.thirdParty?.purpose} (
                <a href={t.thirdParty?.url} rel="noopener">
                  their privacy policy
                </a>
                ).
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 id="forms">Forms</h2>
      <p>
        The contact and &ldquo;report a problem&rdquo; forms send what you type (and your email address, if you give one) to the team so we
        can read and answer it. We use it only for that purpose and delete it when it&apos;s no longer needed.
      </p>

      <h2 id="browser-storage">Storage in your browser</h2>
      <p>We don&apos;t set cookies. Some features store small items in your browser&apos;s own storage, which never leaves your device:</p>
      <ul>
        <li>your theme choice (light, dark or system);</li>
        <li>a list of up to eight tools you used recently (tool names only, never what you entered);</li>
        <li>non-sensitive tool settings, such as a preferred image quality;</li>
        <li>text you typed into a text tool, kept only for the current tab so a reload doesn&apos;t lose it;</li>
        <li>notes you save in the online notepad, until you delete them.</li>
      </ul>
      <p>You can clear all of this at any time through your browser&apos;s site-data settings.</p>

      <h2 id="analytics">Analytics</h2>
      {GA ? (
        <p>
          We use Google Analytics 4 to count page views and which tools are used, with IP anonymisation and without advertising features.
          Events never include the text, files or addresses you enter. If your browser sends a Global Privacy Control or Do Not Track
          signal, the analytics script doesn&apos;t send anything.
        </p>
      ) : (
        <p>We don&apos;t currently use any analytics service. If we add one, this section will describe it before it is switched on.</p>
      )}

      <h2 id="server-logs">Server logs</h2>
      <p>
        Like every website, our hosting provider records technical request logs (IP address, time, requested page, browser type) to keep
        the service secure and working. These logs are kept for a limited time and are not used to profile visitors.
      </p>

      <h2 id="your-rights">Your rights</h2>
      <p>
        Because we have no accounts and don&apos;t store tool inputs, we usually hold no personal data about you. If you&apos;ve emailed us
        or used a form and want that message deleted, or want to know what we hold, email{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>

      <h2 id="changes">Changes</h2>
      <p>If we change how data is handled, we&apos;ll update this page and the date at the top before the change takes effect.</p>
    </StaticPage>
  );
}
