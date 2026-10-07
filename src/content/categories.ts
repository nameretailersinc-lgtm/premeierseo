import type { CategoryDef, CategoryId } from "@/lib/types";

/* The nine category hubs. Titles, H1s and descriptions follow docs/keyword-map.json.
   Tool counts are never typed here; pages compute them from the tool registry. */

export const CATEGORIES: CategoryDef[] = [
  {
    id: "text-tools",
    path: "/text-tools/",
    label: "Text tools",
    navLabel: "Text",
    h1: "Text Tools",
    title: "Text Tools – Count, Clean, Convert and Format Text",
    metaDescription:
      "Free tools for working with text: word and character counters, case converters, duplicate and line-break removers, fancy text and writing checks.",
    intro:
      "Count, clean up, reformat and check text without installing anything. Paste text into any tool and the result updates as you type. Everything in this category runs in your browser, so the text you paste is not sent to our server.",
    card: "Count words, change case, clean up lines and check writing.",
    icon: "type",
    groups: [
      { id: "count", heading: "Counting and measuring text", description: "Count words, characters and reading time, and check limits." },
      { id: "case", heading: "Changing case and fancy text", description: "Convert letter case and create stylish text for bios and posts." },
      { id: "clean", heading: "Cleaning up text", description: "Remove unwanted characters, spaces, lines and formatting." },
      { id: "lines", heading: "Working with lines and lists", description: "Sort, combine, compare and transform lines and lists." },
      { id: "writing", heading: "Writing and proofreading", description: "Write, check and improve your text in the browser." },
      { id: "random", heading: "Random generators and ciphers", description: "Generate random text and numbers, and encode simple ciphers." },
    ],
    sections: [
      {
        heading: "Which text tool do I need?",
        body: "| If you want to… | Use |\n|---|---|\n| Stay under a word or character limit | [Word counter](/word-counter/) or [character counter](/character-counter/) |\n| Fix text pasted from a PDF that breaks mid-sentence | [Remove line breaks](/text-tools/add-remove-line-breaks/) |\n| Clean a list of emails or keywords | [Remove duplicate lines](/remove-duplicate-lines/), then [sort lines](/sort-text-lines/) |\n| Change UPPERCASE text to normal case | [Case converter](/uppercase-to-lowercase/) |\n| Style a social bio | [Bold text](/bold-text-generator/) or [small text](/small-text-generator/) |",
      },
    ],
    faq: [
      {
        q: "Is my text stored when I use these tools?",
        a: "No. The text tools run in your browser and the text you paste is not uploaded. The online notepad is the one exception by design: it saves notes in your browser's local storage so they are still there next time, and it says so on the page.",
      },
      {
        q: "Which tool fixes line breaks in text copied from a PDF?",
        a: "Use [Add or remove line breaks](/text-tools/add-remove-line-breaks/). Choose \"Remove line breaks, keep paragraphs\" to join wrapped lines while keeping blank lines between paragraphs.",
      },
      {
        q: "Can I use the text tools on my phone?",
        a: "Yes. Every tool works on mobile browsers; results appear directly under the input and have a Copy button.",
      },
    ],
    related: ["development-tools", "free-seo-tools", "binary-tools"],
    guides: ["/blog/how-many-pages-is-1000-words/", "/blog/character-limits-cheat-sheet/"],
    updated: "2026-09-30",
  },
  {
    id: "binary-tools",
    path: "/binary-tools/",
    label: "Binary converters",
    navLabel: "Binary",
    h1: "Binary Converters",
    title: "Binary Converters – Text, Decimal, Hex and Octal",
    metaDescription:
      "Convert between binary and text, decimal, hexadecimal, octal and ASCII, with the working shown step by step. Useful for students, puzzles and debugging.",
    intro:
      "Convert binary to and from text, decimal, hexadecimal, octal and ASCII codes. Each converter validates your input as you type and shows how the conversion works, so you can check homework or decode a puzzle by hand.",
    card: "Convert binary to text, decimal, hex and octal, with the working shown.",
    icon: "binary",
    groups: [
      { id: "text", heading: "Text and binary", description: "Turn text into binary and binary back into readable text." },
      { id: "numbers", heading: "Number systems: decimal, hex and octal", description: "Convert numbers between bases, with the working shown." },
      { id: "ascii", heading: "ASCII and character codes", description: "Look up and convert character codes." },
    ],
    sections: [
      {
        heading: "How to read binary",
        body: "Binary is base 2: each digit (bit) is worth twice the one to its right. Reading from the right, the place values are 1, 2, 4, 8, 16, 32, 64 and 128. Add the values where the bit is 1.\n\nExample: `01001000` = 64 + 8 = **72**. In ASCII, code 72 is the letter **H**. Text is stored as one such number per character, which is why [text to binary](/text-to-binary/) output comes in 8-bit groups.\n\nHexadecimal is base 16. One hex digit always equals exactly four bits (`F` = `1111`), which makes hex a compact way to write binary. Octal is base 8, and one octal digit equals three bits.",
      },
    ],
    faq: [
      {
        q: "How do I read binary code?",
        a: "Split it into 8-bit groups, convert each group to a number by adding the place values (128, 64, 32, 16, 8, 4, 2, 1) where there is a 1, then look the number up in an ASCII table. [Binary to text](/binary-to-text/) does all three steps for you.",
      },
      {
        q: "Why does hexadecimal use letters?",
        a: "Base 16 needs sixteen digit symbols. After 0–9, the letters A–F stand for the values 10–15.",
      },
      {
        q: "What is the difference between ASCII and UTF-8?",
        a: "ASCII defines 128 characters, each stored in one byte. UTF-8 stores the same 128 characters identically but uses two to four bytes for everything else (accented letters, other scripts, emoji).",
      },
    ],
    related: ["text-tools", "development-tools"],
    updated: "2026-09-30",
  },
  {
    id: "free-seo-tools",
    path: "/free-seo-tools/",
    label: "SEO tools",
    navLabel: "SEO",
    h1: "Free SEO Tools",
    title: "Free SEO Tools – Meta Tags, Redirects, Schema and More",
    metaDescription:
      "Check and fix on-page and technical SEO basics: meta tags, headings, redirects, status codes, robots.txt, sitemaps, schema markup and search snippets.",
    intro:
      "Tools for the technical and on-page basics of search engine optimisation: write and check meta tags, preview search snippets, test redirects and status codes, build robots.txt and sitemaps, and generate schema markup. Checkers that need a live URL fetch it from our server and show exactly what they found.",
    card: "Check meta tags, redirects, robots.txt, schema and search snippets.",
    icon: "trending-up",
    groups: [
      { id: "onpage", heading: "On-page SEO", description: "Write and check titles, descriptions, headings and keywords." },
      { id: "crawl", heading: "Crawling and indexing", description: "Control and check what search engines can crawl and index." },
      { id: "redirects", heading: "Redirects and status codes", description: "Trace redirects and check the status codes a URL returns." },
      { id: "schema", heading: "Structured data", description: "Generate schema markup for rich results." },
      { id: "social", heading: "Social link previews", description: "Preview and build the tags behind social share cards." },
      { id: "keywords", heading: "Keyword research", description: "Find phrasing ideas to validate in your own data." },
      { id: "local", heading: "Local SEO", description: "Tools for local business listings and reviews." },
    ],
    sections: [
      {
        heading: "Where the data comes from",
        body: "Generators (meta tags, robots.txt, sitemaps, schema, hreflang) build code in your browser from what you type. Checkers that take a URL request that page from our server, the same way a crawler would, and report the status code, headers and HTML we received. We do not show search volumes, keyword difficulty or backlink counts, because we don't have a licensed data source for them and we won't invent numbers. For that data, use [Google Search Console](https://search.google.com/search-console) for your own site.",
      },
    ],
    faq: [
      {
        q: "Do free SEO tools replace Google Search Console?",
        a: "No. Search Console shows how Google actually crawls, indexes and ranks your site, including clicks and queries. These tools help you check and fix individual pages: tags, redirects, robots rules and markup.",
      },
      {
        q: "Where does the data in these tools come from?",
        a: "Generators work entirely from your input. URL checkers fetch the page you enter from our server at the moment you run the check and report what the server returned.",
      },
      {
        q: "Why don't you show search volumes?",
        a: "Search volume needs a licensed data source. Rather than show estimates we can't back up, the [keyword ideas generator](/keyword-ideas-generator/) suggests phrasings to validate in Google Keyword Planner or Search Console.",
      },
    ],
    related: ["development-tools", "traffic-performance-tools", "text-tools"],
    guides: ["/blog/write-title-tags-meta-descriptions/", "/blog/301-vs-302-redirects/", "/blog/robots-txt-guide/"],
    updated: "2026-09-30",
  },
  {
    id: "imaging-tools",
    path: "/imaging-tools/",
    label: "Image tools",
    navLabel: "Image",
    h1: "Image Tools",
    title: "Image Tools – Compress, Resize, Convert and Crop Images",
    metaDescription:
      "Compress images to an exact KB size, resize and crop photos, and convert between JPG, PNG, WebP, HEIC, AVIF, SVG and ICO. Most tools run in your browser.",
    intro:
      "Compress photos to an exact file size for upload forms, resize and crop images, and convert between JPG, PNG, WebP, HEIC, AVIF, SVG and ICO. The image tools process files in your browser: your images are not uploaded to our server.",
    card: "Compress to an exact KB size, resize, crop and convert images.",
    icon: "image",
    groups: [
      { id: "compress", heading: "Compress images", description: "Reduce image file size without losing visible quality." },
      { id: "size", heading: "Compress to a specific size (KB or MB)", description: "Shrink images to an exact file size or under a limit." },
      { id: "resize", heading: "Resize and crop", description: "Resize, crop and adjust image dimensions." },
      { id: "convert", heading: "Convert image formats", description: "Change between JPG, PNG, WebP, HEIC, AVIF, SVG and more." },
      { id: "icons", heading: "Icons and favicons", description: "Create and convert favicons and icons." },
      { id: "video", heading: "Video to GIF", description: "Turn a short video clip into an animated GIF." },
    ],
    sections: [
      {
        heading: "Compress, resize or convert?",
        body: "| Goal | What changes | Tool |\n|---|---|---|\n| Meet a file-size limit such as 20 KB | Quality first, then dimensions if needed | [Reduce image size in KB](/reduce-image-size-in-kb/) or a fixed-size page such as [compress image to 20KB](/compress-image-to-20kb/) |\n| Meet pixel **and** KB requirements (e.g. 200 × 230 px under 50 KB) | Dimensions and quality | [Photo resizer in KB](/photo-resizer-in-kb/) |\n| Make a photo smaller in pixels | Width and height | [Image resizer](/image-resizer/) |\n| Make a web image lighter without a set target | Quality | [Image compressor](/image-compressor/) |\n| Open an iPhone photo on Windows | Format | [HEIC to JPG](/heic-to-jpg-converter/) |",
      },
    ],
    faq: [
      {
        q: "Which tool should I use for an application-form photo?",
        a: "If the form gives both pixel dimensions and a KB limit, use the [photo resizer in KB](/photo-resizer-in-kb/). If it only gives a KB limit, use [reduce image size in KB](/reduce-image-size-in-kb/) and enter the limit.",
      },
      {
        q: "Are my images uploaded?",
        a: "No. Compression, resizing, cropping and conversion happen in your browser using its built-in image decoder and canvas. The file never leaves your device.",
      },
      {
        q: "Which image format is best for websites?",
        a: "WebP or AVIF for photos (smaller than JPG at similar quality), PNG or SVG for logos and graphics with sharp edges. Our guide [JPG vs PNG vs WebP vs AVIF](/blog/jpg-vs-png-vs-webp/) compares them.",
      },
    ],
    related: ["pdf-tools", "calculator-tools"],
    guides: ["/blog/reduce-photo-size-in-kb/", "/blog/jpg-vs-png-vs-webp/"],
    updated: "2026-09-30",
  },
  {
    id: "development-tools",
    path: "/development-tools/",
    label: "Developer tools",
    navLabel: "Developer",
    h1: "Developer Tools",
    title: "Developer Tools – Formatters, Encoders, JSON and Regex",
    metaDescription:
      "Format and minify HTML, CSS and JavaScript, view and convert JSON and CSV, test regex, convert timestamps, encode URLs and Base64, and generate UUIDs.",
    intro:
      "Everyday utilities for web developers and site owners: format and minify code, view and convert JSON and CSV, test regular expressions, encode and decode URLs and Base64, convert Unix timestamps, generate hashes and UUIDs, and work with colours and .htaccess rules. Code you paste is processed in your browser.",
    card: "Format code, convert JSON and CSV, test regex, encode and hash.",
    icon: "braces",
    groups: [
      { id: "format", heading: "Formatters and minifiers", description: "Beautify code for reading or minify it for production." },
      { id: "data", heading: "JSON, CSV and regex", description: "Validate, convert and explore structured data." },
      { id: "encode", heading: "Encoding and decoding", description: "Encode and decode Base64, URLs, HTML entities and more." },
      { id: "ids", heading: "Time, IDs and hashes", description: "Convert timestamps, generate IDs and create hashes." },
      { id: "html", heading: "HTML tools", description: "View, preview and work with HTML." },
      { id: "colour", heading: "Colour tools", description: "Convert and pick colours for the web." },
      { id: "apache", heading: "Apache .htaccess tools", description: "Write and test Apache rewrite and redirect rules." },
    ],
    sections: [
      {
        heading: "Encoding, hashing and encryption are different things",
        body: "- **Encoding** (Base64, URL encoding) changes how data is written so it survives a particular channel. Anyone can decode it; it is not secret.\n- **Hashing** (SHA-256) turns input into a fixed-length fingerprint. It cannot be reversed, which is why it is used to verify downloads and store password checks.\n- **Encryption** (AES) hides data so that only someone with the key can read it.\n\nUse [Base64](/base64-encoder-decoder/) and [URL encoding](/url-encoder-decoder/) for transport, the [hash generator](/hash-generator/) for fingerprints, and the [encryption key generator](/encryption-generator/) when you need AES keys.",
      },
    ],
    faq: [
      {
        q: "Is code I paste sent to a server?",
        a: "No. Formatters, minifiers, converters, encoders and the regex tester all run in your browser. The RSS feed parser is the exception: it fetches the feed URL from our server, and the page says so.",
      },
      {
        q: "Which formatter should I use for minified code?",
        a: "Use the formatter for that language: [HTML](/html-formatter/), [CSS](/css-formatter/), [JavaScript](/javascript-formatter/) or [JSON](/json-viewer/). Each one re-indents code so you can read it; the matching minifier does the reverse.",
      },
      {
        q: "What's the difference between encoding and encryption?",
        a: "Encoding is reversible by anyone and exists for compatibility; encryption needs a key and exists for secrecy. Base64 is encoding, not encryption.",
      },
    ],
    related: ["free-seo-tools", "text-tools", "binary-tools"],
    updated: "2026-09-30",
  },
  {
    id: "traffic-performance-tools",
    path: "/traffic-performance-tools/",
    label: "Website performance tools",
    navLabel: "Performance",
    h1: "Website Performance and Network Tools",
    title: "Website Speed, Uptime and Browser Tools",
    metaDescription:
      "Test page speed and page weight, check mobile-friendliness, see whether a site is up or down, look up an IP address and see your own browser details.",
    intro:
      "Check how a website loads and responds: page speed and Core Web Vitals, page weight, mobile-friendliness, whether a site is up, and IP address details. These checks run from our server (or through Google PageSpeed Insights, where stated), so they test the site from outside your own network.",
    card: "Test page speed, page weight, uptime, mobile view and IP details.",
    icon: "gauge",
    groups: [
      { id: "speed", heading: "Speed and page weight", description: "Measure how fast a page loads and what it weighs." },
      { id: "mobile", heading: "Mobile-friendliness", description: "See how a page looks and behaves on phones." },
      { id: "uptime", heading: "Uptime and outages", description: "Check whether a website is up or down right now." },
      { id: "network", heading: "Network and browser information", description: "See your IP address, browser and connection details." },
    ],
    sections: [
      {
        heading: "What these checks can and can't tell you",
        body: "A check shows the result for one request, from one location, at one moment. If a site is \"down\" for you but \"up\" in our check, the problem is likely your connection, DNS or a regional outage. If a check fails for us too, the site is probably down for everyone. For ongoing monitoring with alerts, use a dedicated uptime-monitoring service; these tools are for spot checks.",
      },
    ],
    faq: [
      {
        q: "Do these tools measure my website traffic?",
        a: "No. None of these tools measure visitor numbers. For traffic, use your analytics or Google Search Console. These tools measure speed, availability and technical details.",
      },
      {
        q: "Where are the checks run from?",
        a: "From our web server. The speed test uses Google PageSpeed Insights, which runs Lighthouse on Google's infrastructure and adds real-user data from the Chrome UX Report when Google has enough of it.",
      },
      {
        q: "What's the difference between an uptime check and monitoring?",
        a: "A check tests the site once, when you click. Monitoring repeats the check every few minutes and alerts you when it fails.",
      },
    ],
    related: ["free-seo-tools", "development-tools"],
    updated: "2026-09-30",
  },
  {
    id: "pdf-tools",
    path: "/pdf-tools/",
    label: "PDF tools",
    navLabel: "PDF",
    h1: "PDF Tools",
    title: "PDF Tools – Merge, Split, Compress, Convert and Sign",
    metaDescription:
      "Merge, split, rotate and compress PDFs, convert Word and JPG to PDF or PDF to JPG, and add text or a signature. Files are processed in your browser.",
    intro:
      "Merge, split, rotate and compress PDF files, convert Word documents and images to PDF, turn PDF pages into JPG images, and add text or a signature. Every PDF tool here processes the file in your browser; nothing is uploaded.",
    card: "Merge, split, compress, convert and sign PDF files.",
    icon: "file-text",
    groups: [
      { id: "organise", heading: "Organise PDFs", description: "Merge, split and rotate pages." },
      { id: "compress", heading: "Compress PDFs", description: "Make PDF files smaller for email and upload limits." },
      { id: "convert", heading: "Convert to and from PDF", description: "Turn documents and images into PDFs, and back." },
      { id: "edit", heading: "Edit and sign PDFs", description: "Add text, signatures and annotations to PDFs." },
    ],
    sections: [
      {
        heading: "Two ways to make a PDF smaller",
        body: "Most large PDFs are large because of the images inside them. There are two approaches:\n\n- **Keep text:** rewrite the file structure and remove unused data. Text stays selectable, but savings are usually modest.\n- **Smallest size:** render each page as a compressed image. This reaches targets such as 100 KB, but text is no longer selectable or searchable.\n\n[Compress PDF](/compress-pdf/) offers both and tells you which it used. The guide [how to reduce PDF file size](/blog/reduce-pdf-file-size/) explains when each makes sense.",
      },
    ],
    faq: [
      {
        q: "Are my PDFs uploaded?",
        a: "No. The PDF tools use libraries that run in your browser (pdf-lib and PDF.js). Your file stays on your device.",
      },
      {
        q: "Is there a file size limit?",
        a: "There is no fixed limit, but very large files (hundreds of MB) depend on your device's memory. Phones may struggle above roughly 100 MB.",
      },
      {
        q: "Can I compress a PDF to 100KB?",
        a: "Often, yes, using [compress PDF to 100KB](/compress-pdf-to-100kb/), which renders pages as images at the quality needed to fit. Long documents may not fit in 100 KB at a readable quality; the tool tells you if it can't reach the target.",
      },
    ],
    related: ["imaging-tools", "text-tools"],
    guides: ["/blog/reduce-pdf-file-size/"],
    updated: "2026-09-30",
  },
  {
    id: "calculator-tools",
    path: "/calculator-tools/",
    label: "Calculators",
    navLabel: "Calculators",
    h1: "Online Calculators",
    title: "Online Calculators – Percentage, GST, EMI, Age and More",
    metaDescription:
      "Everyday calculators with the formulas shown: percentage, discount, GST, loan EMI, BMI, age, chronological age, hours worked, AdSense and file sizes.",
    intro:
      "Calculators for everyday money, health, date and file-size questions. Each one updates as you type and shows the formula it used, so you can check the working. Calculations run in your browser.",
    card: "Work out percentages, GST, EMI, BMI, age and hours, with formulas.",
    icon: "calculator",
    groups: [
      { id: "money", heading: "Money and shopping", description: "Work out discounts, tax and percentages." },
      { id: "loans", heading: "Loans", description: "Calculate repayments and interest." },
      { id: "health", heading: "Health", description: "Health measures with the formula shown." },
      { id: "dates", heading: "Dates and time", description: "Work out ages, durations and hours." },
      { id: "web", heading: "Websites and file sizes", description: "Calculations for websites, ads and files." },
    ],
    sections: [],
    faq: [
      {
        q: "Are the formulas shown?",
        a: "Yes. Every calculator shows the formula and the numbers it used under the result.",
      },
      {
        q: "Which calculator works out GST backwards from a total?",
        a: "The [GST calculator](/gst-calculator/). Choose \"Remove GST\" to split a GST-inclusive price into the base amount and the tax.",
      },
      {
        q: "How accurate is the EMI calculator?",
        a: "It uses the standard reducing-balance formula that banks use for fixed-rate loans. Your lender's figure may differ slightly because of rounding, processing fees or a different day-count convention.",
      },
    ],
    related: ["text-tools", "imaging-tools"],
    updated: "2026-09-30",
  },
  {
    id: "other-tools",
    path: "/other-tools/",
    label: "Generators and utilities",
    navLabel: "Generators",
    h1: "Generators and Utilities",
    title: "Generators & Utilities – QR Codes, Barcodes, Passwords",
    metaDescription:
      "Create QR codes, barcodes and strong passwords, generate test card numbers and names for QA, open many URLs at once or find a Facebook page ID.",
    intro:
      "Generators for QR codes, barcodes, passwords and test data, plus a few handy utilities. Everything is generated in your browser. Passwords use your browser's cryptographic random number generator.",
    card: "Make QR codes, barcodes, passwords and test data.",
    icon: "shapes",
    groups: [
      { id: "codes", heading: "Codes: QR and barcodes", description: "Make QR codes and barcodes to print or share." },
      { id: "security", heading: "Security: passwords", description: "Generate strong passwords and keys." },
      { id: "testdata", heading: "Test data for developers", description: "Generate fake but realistic data for testing." },
      { id: "utilities", heading: "Other utilities", description: "Handy single-purpose helpers." },
    ],
    sections: [],
    faq: [
      {
        q: "Do the QR codes expire?",
        a: "No. The codes are static: the data (such as your URL) is encoded directly in the image, with no redirect service in between. They work for as long as the content they point to exists.",
      },
      {
        q: "Are the test card numbers real?",
        a: "No. They pass the Luhn checksum that forms use to catch typos, but they are not linked to any account and cannot be used to pay. Use them only to test your own forms.",
      },
      {
        q: "Are generated passwords stored?",
        a: "No. Passwords are generated in your browser with `crypto.getRandomValues` and are never sent anywhere or saved.",
      },
    ],
    related: ["development-tools", "text-tools"],
    updated: "2026-09-30",
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  CategoryDef
>;
