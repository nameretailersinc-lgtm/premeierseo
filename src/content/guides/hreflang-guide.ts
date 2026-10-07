import { defineGuide, toolLink as t } from "./shared";

export const hreflangImplementation = defineGuide({
  slug: "hreflang-guide",
  title: "Hreflang Implementation: Codes, Methods and Errors",
  h1: "Hreflang implementation",
  metaDescription:
    "How to annotate language and region versions with hreflang: valid code formats, the return-link rule, x-default, and the three ways to deliver the tags.",
  summary:
    "Hreflang annotations tell Google which language and region each version of a page is for, so the right one appears for the right searcher. Three rules decide whether they work: codes must be **ISO 639-1 language** and optional **ISO 3166-1 alpha-2 region**, every page in a set must list every other page **including itself**, and each page must link back.",
  cluster: "Technical SEO",
  tools: ["hreflang-tags-generator", "canonical-url-generator", "xml-sitemap-generator", "meta-tags-analyzer"],
  body: [
    {
      heading: "What hreflang does and does not do",
      body: `Hreflang is a set of annotations that connect pages with the same content in different languages or for different regions. Google's documentation on localized versions describes the effect: it helps Google serve the correct version to the correct user, and it tells Google the pages are deliberate alternates rather than duplicates.

What it does not do:

- **It is not a ranking factor.** A page does not rank higher for having hreflang.
- **It does not redirect anyone.** It is a signal to search engines; visitors still arrive wherever they clicked.
- **It does not replace the canonical tag.** Each language version self-canonicalises; hreflang then links the set.
- **It does not translate anything.** Pointing hreflang at a machine-translated page simply tells Google that a thin page is the Spanish version.

You need it when the same content exists in more than one language, when one language is tailored to several markets (en-GB and en-US with different prices or spellings), or when part of a site is translated and the rest is not.`,
    },
    {
      heading: "Writing valid language and region codes",
      body: `The \`hreflang\` value is a language tag as defined by BCP 47. In practice Google accepts:

| Pattern | Example | Means |
|---|---|---|
| language | \`de\` | German, any region |
| language-region | \`de-AT\` | German as used in Austria |
| language-script | \`zh-Hant\` | Chinese in traditional script |
| \`x-default\` | \`x-default\` | Fallback for unmatched users |

The language is an ISO 639-1 two-letter code. The region, when present, is an ISO 3166-1 alpha-2 **country** code, not a continent or a language. Four errors account for most broken implementations:

- \`en-UK\` — the country code for the United Kingdom is **GB**. UK is not valid.
- \`en-EU\` — EU is not a country. Use \`en\` for all English speakers.
- \`es-LATAM\`, \`en-APAC\` — invented regions.
- A region code alone, such as \`hreflang="AT"\`. The language is mandatory; the region is the optional part.

Case is not significant, but the conventional form is lowercase language and uppercase region: \`pt-BR\`. Use \`x-default\` for the page a user with no matching language should get, typically a language selector or the English version. The ${t("hreflang-tags-generator", "hreflang tags generator")} builds a complete, reciprocal set from a URL list, which removes most of the hand-editing errors.`,
    },
    {
      heading: "Three delivery methods",
      body: `All three are equivalent to Google. Pick one and use it consistently, because mixing methods is how sets end up incomplete.

**1. HTML link elements** in the \`<head>\`. Readable and easy to inspect, but every page carries the whole set, so a 20-language site adds 20 tags to every page.

\`\`\`html
<link rel="alternate" hreflang="en" href="https://example.com/page/" />
<link rel="alternate" hreflang="de" href="https://example.com/de/page/" />
<link rel="alternate" hreflang="de-AT" href="https://example.com/at/page/" />
<link rel="alternate" hreflang="x-default" href="https://example.com/page/" />
\`\`\`

**2. HTTP \`Link\` headers.** The only option for files with no HTML head, such as PDFs:

\`\`\`
Link: <https://example.com/de/report.pdf>; rel="alternate"; hreflang="de"
\`\`\`

**3. XML sitemap annotations.** Best for large sites, because the markup lives in one place instead of on every page. Each \`<url>\` entry repeats the full set, itself included:

\`\`\`xml
<url>
  <loc>https://example.com/page/</loc>
  <xhtml:link rel="alternate" hreflang="en" href="https://example.com/page/"/>
  <xhtml:link rel="alternate" hreflang="de" href="https://example.com/de/page/"/>
</url>
\`\`\`

The sitemap must declare the \`xhtml\` namespace on the \`<urlset>\` element. An ${t("xml-sitemap-generator", "XML sitemap generator")} gets the file structure right; the annotations are then added per URL.`,
    },
    {
      heading: "The return-link rule and common failures",
      body: `The rule that breaks the most implementations: annotations must be **bidirectional and self-inclusive**. If the English page lists the German one, the German page must list the English one, and both must list themselves. Google ignores one-sided annotations, because an unconfirmed claim about another page is not trustworthy.

A valid three-page set contains the same four lines (three alternates plus \`x-default\`) on all three pages. A set is broken by:

- **Missing self-reference**, easy to introduce when tags are generated in a loop that skips the current page.
- **Relative or protocol-relative URLs.** Hreflang needs fully qualified URLs, including \`https://\`.
- **Pointing at a URL that redirects** or returns 404. Annotate the final, live URL.
- **Pointing at a non-canonical URL.** The hreflang target and the canonical of that target must agree.
- **A cross-language canonical.** If the German page canonicalises to the English page, you have asked Google to drop the German page, and hreflang cannot override that.
- **Blocking an alternate in robots.txt**, so Google cannot verify the return link.

To check a live set, read the tags a page really emits with the ${t("meta-tags-analyzer", "meta tags analyzer")}, then fetch two or three of the targets and confirm each lists the others. Search Console reports "no return tags" for sets Google has already crawled. One scope limit worth remembering: hreflang covers language and country, not currency or shipping. Those belong in the page content, and the ${t("canonical-url-generator", "canonical URL generator")} keeps each version's own canonical in the exact form you list in the annotations.`,
    },
  ],
  sources: [
    { label: "Google Search Central: Tell Google about localized versions of your page", url: "https://developers.google.com/search/docs/specialty/international/localized-versions" },
    { label: "Google Search Central: Managing multi-regional and multilingual sites", url: "https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites" },
    { label: "RFC 5646 (BCP 47): Tags for Identifying Languages", url: "https://www.rfc-editor.org/rfc/rfc5646.html" },
    { label: "ISO 3166 country codes", url: "https://www.iso.org/iso-3166-country-codes.html" },
    { label: "Sitemaps XML format (sitemaps.org protocol)", url: "https://www.sitemaps.org/protocol.html" },
  ],
});
