import { defineGuide, toolLink as t } from "./shared";

export const reducePdfFileSize = defineGuide({
  slug: "reduce-pdf-file-size",
  title: "How to Reduce PDF File Size (Even Below 100KB)",
  h1: "How to reduce PDF file size",
  metaDescription:
    "Why PDFs get large and how to shrink them: image downsampling, grayscale scans, removing pages and fonts, and what to do when a portal wants 100KB.",
  summary:
    "Most oversized PDFs are large because of the images inside them: photos, or scanned pages stored at high resolution in color. Shrink those images (lower resolution and JPEG quality, grayscale for black-and-white pages), delete pages you don't need, and keep text as text. One- and two-page documents usually fit a 100 KB limit; long scans often can't while staying readable.",
  cluster: "PDF workflows",
  tools: ["compress-pdf", "compress-pdf-to-100kb", "compress-pdf-to-50kb", "split-pdf", "jpg-to-pdf"],
  body: [
    {
      heading: "Why PDFs are large",
      body: `A PDF is a container of objects: page descriptions, fonts, images and metadata. Knowing which kind dominates tells you what to do.

| Content | Typical weight | What reduces it |
|---|---|---|
| Text and vector drawings | Small: a few KB per page | Already compact; leave it alone |
| Embedded fonts | Tens to hundreds of KB per full font | Subsetting (only the characters used) when the PDF is created |
| Photos | Hundreds of KB to several MB each | Lower resolution and JPEG quality |
| Scanned pages | One full-page image per page | Lower DPI, grayscale, black-and-white |
| Saved edits and attachments | Varies | Re-saving with "Save As" or removing attachments |

Scans are the usual culprit, and the arithmetic shows why. An A4 page scanned at 300 DPI is 2,480 × 3,508 pixels, or 8.7 million pixels. Stored uncompressed in 24-bit color that is 26.1 MB for one page; in 8-bit grayscale, 8.7 MB; in 1-bit black and white, about 1.1 MB. Compression reduces all of these a lot, but resolution and color depth set the starting point.

Saved edits matter too: the PDF format allows incremental updates, where some editors append changes to the end of the file and keep the old objects. "Save As" to a new file usually writes a clean copy.`,
    },
    {
      heading: "Compress images inside the PDF",
      body: `If your PDF was made from Word, a website or a design app and has selectable text, keep the text and shrink only the images. Text stays sharp at any zoom and costs almost nothing.

The ${t("compress-pdf", "PDF compressor")} on this site does this in its **Keep text** mode, re-saving photos as smaller JPEGs and cleaning up unused objects. On a 4-page report with two large photos (4.74 MB), its recorded results were 1.27 MB with Light image compression, 318 KB with Medium and 116 KB with Strong, with the text still selectable.

Other ways to get the same effect:

- **When creating the PDF:** Microsoft Word's Save As PDF dialog has a "Minimum size (publishing online)" option that downsamples images.
- **On a Mac:** Preview's Export dialog offers a "Reduce File Size" Quartz filter. It is aggressive and can make photos look soft, so check the result.
- **Before inserting images:** resize photos to the size they appear on the page. A photo printed 8 cm wide needs about 950 pixels across at 300 DPI, not the 4,000 a phone produces.`,
    },
    {
      heading: "Scanned documents: resolution and grayscale",
      body: `Why is a scanned PDF so big? Each page is a photograph of paper, usually taken at a higher resolution and color depth than the document needs. The pixel count falls with the square of the DPI:

| Scan resolution | A4 page in pixels | Pixels vs 300 DPI |
|---|---|---|
| 300 DPI | 2,480 × 3,508 | 100% |
| 200 DPI | 1,654 × 2,339 | 44% |
| 150 DPI | 1,240 × 1,754 | 25% |
| 100 DPI | 827 × 1,169 | 11% |
| 72 DPI | 595 × 842 | 6% |

For typed documents, 150–200 DPI in grayscale is readable on screen and prints acceptably. Use color only when it carries meaning, such as a colored stamp or a photo ID. The black-and-white (1-bit) mode on most scanners is the smallest of all for plain text, because it can use fax-style compression (CCITT Group 4), but it turns photos, stamps and light pencil into harsh dots.

Rescanning at the right settings beats compressing afterwards. If you can't rescan, the **Smallest size** mode of the compressor renders each page at a resolution you choose. Recorded on a 3-page color scan made at 200 DPI (2.55 MB), it produced 782 KB at 150 DPI, 378 KB at 110 DPI and 147 KB at 72 DPI. Don't use this mode on PDFs with real text: the same test turned a 21 KB text PDF into 1.59 MB, because pictures of text are far bigger than text.`,
    },
    {
      heading: "Remove pages you don't need",
      body: `Every scanned page costs roughly the same number of bytes, so deleting pages is the one change that saves space without touching quality. Typical candidates are blank backs from double-sided scanning, cover sheets, instruction pages from a form pack, and duplicates.

Use ${t("split-pdf", "split PDF")} to extract just the pages the portal needs, for example pages 1–2 and 5, then compress that smaller file. If a portal accepts several uploads, sending each document separately often avoids the problem entirely.

When the document starts as phone photos (receipts, certificates, handwritten pages), build the PDF with ${t("jpg-to-pdf", "JPG to PDF")} and tick **Make the PDF smaller**. That scales the photos down before they go into the file, instead of embedding 3–5 MB camera images and compressing them later.`,
    },
    {
      heading: "Hitting a 100KB or 50KB limit",
      body: `Treat a hard limit as a budget per page: 100 KB for a 4-page scan is 25 KB a page. In the tool tests recorded on our compression pages, an A4 scan rendered at 72 DPI took roughly 25–50 KB per page. Below about 72 DPI, small print starts to smudge. That gives a rule of thumb:

| Limit | Scanned pages that usually stay readable |
|---|---|
| 100 KB | 2–4 |
| 50 KB | 1–2 |
| 200 KB | 4–8 |

Text-based PDFs are different: a few pages of plain text with fonts subset often fit in 50 KB with the text kept.

A practical order of steps:

1. Remove every page the recipient doesn't need.
2. If the pages are black text on white, switch to grayscale.
3. Try keeping the text and shrinking images; for scans, render pages at the highest DPI that fits.
4. Check the preview at 100% zoom before submitting, especially signatures and small print.

The pages to ${t("compress-pdf-to-100kb", "compress a PDF to 100KB")} and ${t("compress-pdf-to-50kb", "shrink a PDF to 50KB")} run this search automatically, from the sharpest settings down, and warn you when the only way to fit is a resolution below 72 DPI. Their recorded results: the 4.74 MB report came to 68.0 KB with the text kept; the 3-page scan reached 88.4 KB at 72 DPI for the 100 KB target and 43.5 KB at 50 DPI, with a legibility warning, for 50 KB. Both count 1 KB as 1,000 bytes, so the result also passes a 1,024-byte check.

If the limit still can't be met, split the document into parts, ask whether a larger file is accepted, or rescan in grayscale at 150 DPI and start again.`,
    },
    {
      heading: "Quality, phones and passwords",
      body: `**Does compression reduce quality?** Removing unused objects and compressing uncompressed data is lossless. Re-saving images as JPEG is lossy, and rendering pages as images makes text part of a picture: it can no longer be selected, searched or read by screen readers, and links and form fields are lost. Keep an uncompressed original.

**Can I compress a PDF on my phone?** Yes. The PDF tools here run in the browser, including mobile browsers, and the file is not uploaded. Very large files are slower on a phone because all the work happens on the device.

**Password-protected PDFs** that need a password to open can't be compressed until the protection is removed by someone who knows the password.`,
    },
  ],
  sources: [
    { label: "ISO 32000-2: Document management – Portable Document Format (PDF 2.0)", url: "https://www.iso.org/standard/75839.html" },
    { label: "ITU-T Recommendation T.6: Group 4 facsimile coding (used for 1-bit scans)", url: "https://www.itu.int/rec/T-REC-T.6" },
    { label: "PDF.js (Mozilla), used to render pages in the Smallest size mode", url: "https://mozilla.github.io/pdf.js/" },
  ],
});
