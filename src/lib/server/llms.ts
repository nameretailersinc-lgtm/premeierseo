import "server-only";
import { CATEGORIES } from "@/content/categories";
import { TOOLS } from "@/content/tools";
import { postPath, plainText } from "@/lib/blog-types";
import { SITE, absUrl } from "@/lib/site";
import type { ToolDef } from "@/lib/types";
import { listPublishedPosts } from "./blog-store";

const link = (name: string, path: string, description: string) =>
  `- [${plainText(name)}](${absUrl(path)}): ${plainText(description)}`;

function toolReference(t: ToolDef): string {
  return [
    `### ${t.name}`,
    `URL: ${absUrl(t.path)}\nLast updated: ${t.updated}`,
    t.summary,
    `Processing: ${t.processing}.${t.thirdParty ? ` Provider: ${t.thirdParty.name} (${t.thirdParty.url}).` : ""}`,
    t.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    ...(t.example ? [`#### ${t.example.title || "Example"}\n\nInput: ${t.example.input}\n\nOutput: ${t.example.output}${t.example.note ? `\n\n${t.example.note}` : ""}`] : []),
    ...t.sections.map((s) => `#### ${s.heading}\n\n${s.body}`),
    ...(t.limits?.length ? [`Limits:\n${t.limits.map((s) => `- ${s}`).join("\n")}`] : []),
    ...t.faq.map((f) => `#### ${f.q}\n\n${f.a}`),
    ...(t.sources?.length ? [`Sources:\n${t.sources.map((s) => link(s.label, s.url, "Reference")).join("\n")}`] : []),
  ].filter(Boolean).join("\n\n");
}

/** Use the same publication and canonical rules as search discovery. Never expose drafts. */
export async function llmsText(full = false): Promise<string> {
  const posts = (await listPublishedPosts()).filter((p) =>
    !p.seo.noindex && (!p.seo.canonicalUrl || p.seo.canonicalUrl === absUrl(postPath(p.slug))));
  const tools = TOOLS.filter((t) => t.indexable);
  const sections = [
    `# ${SITE.name}\n\n> ${SITE.description}`,
    `The canonical website is ${SITE.origin}. Relative links resolve against this origin. Tools are free and available in English. Each tool page explains its processing location, instructions, examples and limitations. Most run in the browser; live website checks may use our server or a named third party.`,
    `## Site information\n\n${[
      link("About", "/about-us/", "Site identity and team"),
      link("Contact", "/contact/", `Support: ${SITE.email}`),
      link("Frequently asked questions", "/faq/", "Using the tools, privacy and accuracy"),
      link("Privacy policy", "/privacy-policy/", "How data is handled"),
      link("Terms", "/terms-and-conditions/", "Acceptable use and limitations"),
      link("All tools", "/tools/", "Complete tool directory"),
      link("Blog", "/blog/", "Published practical guides"),
    ].join("\n")}`,
    `## Discovery\n\n${[
      link("XML sitemap", "/sitemap.xml", "Canonical indexable page URLs and real modification dates"),
      link("Crawler rules", "/robots.txt", "Public crawl access; administration and APIs excluded"),
      link("Full text reference", "/llms-full.txt", "Tool summaries, instructions, questions and published articles"),
    ].join("\n")}`,
    `## Categories\n\n${CATEGORIES.map((c) => link(c.label, c.path, c.intro)).join("\n")}`,
    ...CATEGORIES.map((c) => `## ${c.label}\n\n${tools.filter((t) => t.category === c.id).map((t) =>
      full ? toolReference(t) : link(t.name, t.path, t.summary)).join("\n\n")}`),
    `## Published articles\n\n${posts.map((p) => full
      ? `### ${p.title}\n\nURL: ${absUrl(postPath(p.slug))}\nPublished: ${p.datePublished}\nModified: ${p.dateModified}\nAuthor: ${p.authorName || SITE.name}\n\n${p.excerpt}\n\n${p.content}\n\n${p.faqs.map((f) => `#### ${f.q}\n\n${f.a}`).join("\n\n")}`
      : link(p.title, postPath(p.slug), p.excerpt || p.seo.metaDescription)).join("\n\n")}`,
  ];
  return sections.join("\n\n") + "\n";
}

export function textResponse(text: string): Response {
  return new Response(text, { headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=0, must-revalidate",
    "X-Content-Type-Options": "nosniff",
    "Link": `<${SITE.origin}/llms.txt>; rel="describedby"`,
  } });
}
