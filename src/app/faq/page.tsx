import type { Metadata } from "next";
import { FaqList } from "@/components/Faq";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { RailCard, StaticPage } from "@/components/StaticPage";
import { buildMetadata } from "@/lib/seo";

const TITLE = "FAQ – Using the Free Tools | Premier SEO Services";
const DESCRIPTION =
  "Answers about Premier SEO Services: whether the tools are free, what happens to your files, why some tools use our server, accuracy, and how to report a problem.";

export const metadata: Metadata = buildMetadata({ path: "/faq/", title: TITLE, description: DESCRIPTION });

const GROUPS = [
  {
    heading: "Using the tools",
    items: [
      { q: "Are the tools really free?", a: "Yes. There's no paid version, no sign-up and no usage cap. The site shows no advertising." },
      {
        q: "Do I need to install anything?",
        a: "No. Every tool runs in a current web browser on desktop or mobile. A few very large files (hundreds of megabytes) may be slow on older phones because processing happens on your device.",
      },
      {
        q: "Can I use the results commercially?",
        a: "Yes. You keep all rights to what you create. See the [terms](/terms-and-conditions/) for acceptable use.",
      },
      {
        q: "Why can't I find a tool that used to be here?",
        a: "Some duplicate tools were merged (for example the two Base64 tools are now [one encoder and decoder](/base64-encoder-decoder/)); old addresses redirect to the new page. Use the [all tools list](/tools/) or the search box in the header.",
      },
    ],
  },
  {
    heading: "Privacy and data",
    items: [
      {
        q: "Are my files uploaded?",
        a: "Not for text, image, PDF, developer or calculator tools: those run in your browser and your files stay on your device.",
      },
      {
        q: "Why do some tools use your server?",
        a: "A browser can't read another website's headers, redirects or robots.txt directly, so tools that check a live website request it from our server. Those pages say so, and we don't store what we fetch. The [privacy policy](/privacy-policy/) lists them.",
      },
      {
        q: "Do you use cookies?",
        a: "No. A few preferences (theme, recent tools, tool settings) are stored in your browser's own storage and never sent to us.",
      },
    ],
  },
  {
    heading: "Accuracy and help",
    items: [
      {
        q: "How accurate are the results?",
        a: "Each tool page explains the rules it follows and its limits, and calculators show their formula. Where a tool can't measure something (search volume, backlink totals) it tells you rather than estimating.",
      },
      {
        q: "A tool gave a wrong result. What should I do?",
        a: "Use the “Report a problem” link at the bottom of the tool page, or the [report form](/tool-complain/). Tell us the tool, your browser and what you expected.",
      },
      {
        q: "Can you build a tool I need?",
        a: "Suggest it through the [contact page](/contact/?topic=tool-request). We can't promise every request, but requests decide what we build next.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <StaticPage
      path="/faq/"
      title={TITLE}
      description={DESCRIPTION}
      h1="Frequently asked questions"
      lead="Answers about the site as a whole. Questions about a specific tool are answered on that tool's page."
      icon="help-circle"
      hue="hue-purple"
      eyebrow="Help"
      plain
      aside={
        <>
          <RailCard title="On this page" icon="list" hue="hue-purple">
            <ul className="grid gap-1">
              {GROUPS.map((g, i) => (
                <li key={g.heading}>
                  <a href={`#faq-${i}`} className="block rounded-lg px-2 py-1.5 font-medium text-ink-2 hover:bg-hue-tint hover:text-ink">
                    {g.heading}
                  </a>
                </li>
              ))}
            </ul>
          </RailCard>
          <RailCard title="Still have a question?" icon="message">
            <p>Ask us directly. We read every message.</p>
            <Link href="/contact/" className="mt-3 inline-flex items-center gap-1 font-semibold text-accent hover:underline">
              Contact us <Icon name="arrow-right" size={14} />
            </Link>
          </RailCard>
        </>
      }
    >
      <div className="[&>section:first-child]:mt-0">
        {GROUPS.map((g, i) => (
          <FaqList key={g.heading} items={g.items} heading={g.heading} id={`faq-${i}`} />
        ))}
      </div>
    </StaticPage>
  );
}
