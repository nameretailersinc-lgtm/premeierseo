import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { HomeView, type Toolkit } from "@/components/home/HomeView";
import { homeGraph } from "@/lib/schema";
import { listPublishedPosts } from "@/lib/server/blog-store";
import { buildMetadata } from "@/lib/seo";

const TITLE = "Free Online Tools – PDF, Image, SEO & Text Tools";
const DESCRIPTION =
  "Compress images, convert PDFs, check SEO, count words and perform everyday calculations with free online tools. No registration required. Most run in your browser.";

export const metadata: Metadata = buildMetadata({ path: "/", title: TITLE, description: DESCRIPTION });

// Re-rendered at most once a minute (and immediately when a post is saved in /admin/) to show the latest posts.
export const revalidate = 60;

/** Editorial picks (not usage data). Ordered around the highest-demand tasks in the keyword research. */
const START = [
  "word-counter",
  "age-calculator",
  "qr-code-generator",
  "image-compressor",
  "compress-pdf",
  "merge-pdf",
  "image-resizer",
  "heic-to-jpg-converter",
];

/** Four picks per toolkit: one row of cards on desktop. */
const TOOLKITS: Toolkit[] = [
  {
    id: "imaging-tools",
    heading: "Image and PDF toolkit",
    blurb: "Shrink photos for upload forms, convert formats and build PDFs from images or Word documents.",
    picks: ["reduce-image-size-in-kb", "png-to-jpg-converter", "jpg-to-pdf", "word-to-pdf"],
  },
  {
    id: "text-tools",
    heading: "Text and content toolkit",
    blurb: "Count, clean and reformat text: limits for essays and posts, duplicate lines, broken line breaks and letter case.",
    picks: ["character-counter", "uppercase-to-lowercase", "remove-duplicate-lines", "add-remove-line-breaks"],
  },
  {
    id: "calculator-tools",
    heading: "Calculators and generators",
    blurb: "Work out percentages and savings yield, or create barcodes and passwords. Calculator formulas are shown with the result.",
    picks: ["percentage-calculator", "apy-calculator", "barcode-generator", "password-generator"],
  },
  {
    id: "free-seo-tools",
    heading: "SEO toolkit",
    blurb: "Write and check the tags search engines read, preview snippets, and test redirects and robots rules.",
    picks: ["meta-tags-analyzer", "serp-simulator", "redirect-checker", "robots-txt-generator"],
  },
  {
    id: "development-tools",
    heading: "Developer and webmaster toolkit",
    blurb: "Format JSON, encode and decode data, convert timestamps and hash files.",
    picks: ["json-viewer", "base64-encoder-decoder", "unix-timestamp-converter", "hash-generator"],
  },
];

const FAQ = [
  {
    q: "Are the tools free to use?",
    a: "Yes. Every tool is free with no sign-up and no usage limits. The site has no paid tier.",
  },
  {
    q: "Are my files uploaded to a server?",
    a: "Not for the text, image, PDF, developer and calculator tools: they run in your browser. Tools that check a live website (redirects, status codes, page speed) have to fetch that site from our server, and each of those pages says so. See the [privacy policy](/privacy-policy/) for details.",
  },
  {
    q: "Do I need an account?",
    a: "No. There are no accounts. A few tools remember your settings (for example a preferred image quality) in your own browser's storage.",
  },
  {
    q: "How do I report a tool that isn't working?",
    a: "Use the “Report a problem” link at the bottom of any tool page, or the [report form](/tool-complain/). Tell us what you expected and what happened.",
  },
];

export default async function HomePage() {
  // The homepage must never fail because the blog database is unreachable.
  const posts = await listPublishedPosts()
    .then((all) => all.filter((p) => !p.seo.noindex).slice(0, 3))
    .catch((e) => (console.error("[home] blog posts unavailable", e), []));
  return (
    <>
      <JsonLd graph={homeGraph(TITLE, DESCRIPTION)} />
      <HomeView start={START} toolkits={TOOLKITS} faq={FAQ} posts={posts} />
    </>
  );
}
