import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { HomeView, type Toolkit } from "@/components/home/HomeView";
import { homeGraph } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";

const TITLE = "Free SEO, Text, Image & PDF Tools – Premier SEO Services";
const DESCRIPTION =
  "Browser-based tools for everyday jobs: count words, compress images to an exact KB size, merge PDFs, check redirects and create meta tags. No sign-up.";

export const metadata: Metadata = buildMetadata({ path: "/", title: TITLE, description: DESCRIPTION });

/** Editorial picks (not usage data), matching the "Most-needed tools" row of the design. */
const START = [
  "word-counter",
  "reduce-image-size-in-kb",
  "merge-pdf",
  "compress-pdf",
  "image-resizer",
  "heic-to-jpg-converter",
  "json-viewer",
  "word-to-pdf",
];

/** Four picks per toolkit: one row of cards on desktop. */
const TOOLKITS: Toolkit[] = [
  {
    id: "text-tools",
    heading: "Text and content toolkit",
    blurb: "Count, clean and reformat text: limits for essays and posts, duplicate lines, broken line breaks and letter case.",
    picks: ["character-counter", "uppercase-to-lowercase", "remove-duplicate-lines", "add-remove-line-breaks"],
  },
  {
    id: "imaging-tools",
    heading: "Image and PDF toolkit",
    blurb: "Shrink photos for upload forms, convert formats, and split or build PDFs — all in your browser.",
    picks: ["image-compressor", "png-to-jpg-converter", "split-pdf", "jpg-to-pdf"],
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
    blurb: "Test regular expressions, encode and decode data, convert timestamps and hash files.",
    picks: ["regex-tester", "base64-encoder-decoder", "unix-timestamp-converter", "hash-generator"],
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

export default function HomePage() {
  return (
    <>
      <JsonLd graph={homeGraph(TITLE, DESCRIPTION)} />
      <HomeView start={START} toolkits={TOOLKITS} faq={FAQ} />
    </>
  );
}
