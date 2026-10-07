import type { ToolDef } from "@/lib/types";

/*
 * PDF tools. Titles, H1s, descriptions and H2 outlines follow docs/keyword-map.json.
 * Every tool runs in the browser (pdf-lib, PDF.js, mammoth, fflate; self-hosted, loaded on use).
 * Size figures in examples and sections were measured with these widgets on the test files
 * described next to them.
 */

const UPDATED = "2026-09-30";

export const PDF_TOOLS: ToolDef[] = [
  /* ---------------------------------------------------------------- Organise */
  {
    id: "merge-pdf",
    path: "/merge-pdf/",
    name: "Merge PDF Files",
    h1: "Merge PDF Files",
    title: "Merge PDF – Combine PDF Files in Your Browser",
    metaDescription:
      "Combine several PDFs into one file, drag them into the right order, and download. Files are processed in your browser, so they aren't uploaded.",
    summary:
      "Combine two or more PDF files into one document in the order you choose, optionally taking only some pages from each file. The files are joined on your device.",
    category: "pdf-tools",
    subgroup: "organise",
    card: "Combine several PDFs into one file in the order you choose.",
    archetype: "file",
    widget: "pdf-merge",
    aliases: ["combine pdf", "join pdf", "pdf merger", "merge pdf files", "combine pdf files", "pdf combiner", "merge pdfs", "put pdfs together", "marge pdf", "append pdf"],
    keywords: ["combine", "join", "order", "pages"],
    processing: "browser",
    limits: [
      "Password-protected PDFs can't be merged until the password is removed.",
      "Bookmarks are not carried over, and form fields may no longer be fillable in the merged file.",
    ],
    steps: [
      "Press **Choose PDFs** (or drag files onto the box) and add two or more PDFs. You can add more later.",
      "Put the files in order with the up and down arrow buttons on each row, or drag a row. The file at the top comes first.",
      "To take only some pages from a file, type them in the box on its row, for example `1-3, 5`. Leave it empty to include every page.",
      "Edit **Output file name** if you like, then press **Merge PDFs** and **Download**.",
    ],
    example: {
      title: "Example",
      input: "report.pdf (12 pages), pages box: 1-3, 5\nappendix.pdf (4 pages), pages box empty",
      output: "merged.pdf with 8 pages: report pages 1, 2, 3 and 5, then appendix pages 1–4",
      note: "Pages keep their size and orientation, so a landscape page stays landscape in the merged file.",
    },
    sections: [
      {
        heading: "Ordering files and pages",
        body: "Files are merged from top to bottom. Each row has **Move up** and **Move down** buttons (the arrows), so you can reorder with a keyboard or on a phone; dragging a row works too on a computer. Every move is announced to screen readers.\n\nThe pages box on each row decides which pages of that file are used and in what order. It accepts single pages and ranges separated by commas: `1-3, 5` takes four pages, `8-` runs from page 8 to the end, and `5-1` takes pages 5 down to 1 in reverse. To reorder pages inside one file, add the file twice with different ranges, or split it first with [split PDF](/split-pdf/).",
      },
      {
        heading: "Large files and page limits",
        body: "There is no fixed page limit. Each file can be up to 100 MB, and the practical limit is your device's memory: the merged PDF is built in the browser tab, so the files you add plus the result must fit in memory at the same time. Several hundred pages are normally fine on a laptop. If a phone struggles, merge in two rounds.\n\nMerging copies pages as they are and doesn't re-compress them, so the result is roughly the sum of the inputs. To shrink it afterwards, use [compress PDF](/compress-pdf/).",
      },
      {
        heading: "Password-protected PDFs",
        body: "A PDF that needs a password to open, or that is encrypted to prevent changes, is rejected with a message naming the file. The tool can't remove encryption. Open the file in a PDF viewer with its password and save or print a copy without protection (for example **Print → Save as PDF**), then add that copy.\n\nFiles that aren't PDFs, are empty, or are damaged are also rejected individually, so one bad file doesn't stop the others from being added.",
      },
      {
        heading: "How in-browser processing works",
        body: "The merge uses pdf-lib, a JavaScript PDF library that loads into this page the first time you press **Merge PDFs**. It reads each file from your device, copies the selected pages into a new document and saves it. Nothing is sent to a server, so the speed depends on your device rather than your upload connection, and the tool keeps working if you go offline after the page has loaded.\n\nYour original files are never changed. The download stays available until you change the file list.",
      },
    ],
    faq: [
      {
        q: "Are bookmarks and links kept?",
        a: "Links to websites on the pages are kept. Bookmarks (the outline panel) are not copied, and links that jump to another page of the original document may stop working. Form fields keep their appearance but may no longer be fillable.",
      },
      {
        q: "Can I merge PDFs on a phone?",
        a: "Yes. Choose files from your phone's storage or cloud folder, then use the arrow buttons to order them. Very large documents may be slow on older phones because the work happens on the device.",
      },
      {
        q: "Can I merge a PDF with an image?",
        a: "Convert the image to a PDF first with [JPG to PDF](/jpg-to-pdf/), then merge the two PDFs here.",
      },
    ],
    sources: [{ label: "pdf-lib documentation", url: "https://pdf-lib.js.org/" }],
    related: ["split-pdf", "compress-pdf", "rotate-pdf", "jpg-to-pdf", "pdf-to-zip"],
    links: [
      { href: "/split-pdf/", anchor: "split PDF" },
      { href: "/compress-pdf/", anchor: "compress PDF" },
      { href: "/rotate-pdf/", anchor: "rotate PDF" },
      { href: "/jpg-to-pdf/", anchor: "JPG to PDF" },
    ],
    appCategory: "UtilitiesApplication",
    features: [
      "Merge any number of PDFs in a chosen order",
      "Reorder with buttons or drag and drop",
      "Pick pages from each file with ranges like 1-3, 5",
      "Page count and size shown for every file",
      "Runs in the browser; files are not uploaded",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  {
    id: "split-pdf",
    path: "/split-pdf/",
    name: "Split PDF",
    h1: "Split PDF",
    title: "Split PDF – Extract Pages or Split Into Separate Files",
    metaDescription:
      "Extract selected pages or split a PDF into single pages, fixed-size chunks or custom ranges. Download separate files or all of them in one ZIP.",
    summary:
      "Split a PDF by page ranges, every page or every few pages, or tick the pages you want to extract. Download each new PDF or all of them in one ZIP.",
    category: "pdf-tools",
    subgroup: "organise",
    card: "Extract pages or split a PDF into separate files by range.",
    archetype: "file",
    widget: "pdf-split",
    aliases: ["pdf splitter", "extract pages from pdf", "separate pdf pages", "split pdf pages", "pdf page extractor", "cut pdf", "divide pdf", "extract one page from pdf", "spilt pdf"],
    keywords: ["extract", "pages", "range", "separate"],
    processing: "browser",
    limits: ["Password-protected PDFs need their password removed first.", "Splitting by file size isn't supported; split by pages instead."],
    steps: [
      "Press **Choose PDF**. Thumbnails of every page appear.",
      "Under **How to split**, pick **Page ranges**, **Select pages**, **Every page** or **Every N pages**.",
      "Type the ranges (for example `1-3, 5, 8-`), tick the pages you want, or set **Pages per file**. The line next to the button says how many files you will get.",
      "Press **Split PDF**, then **Download** each file or **Download all (ZIP)**.",
    ],
    example: {
      title: "Example",
      input: "contract.pdf (10 pages), Page ranges: 1-3, 5, 8-",
      output: "contract-pages-1-3.pdf (3 pages)\ncontract-page-5.pdf (1 page)\ncontract-pages-8-10.pdf (3 pages)",
      note: "Tick Put all ranges into one PDF to get a single 7-page file instead.",
    },
    sections: [
      {
        heading: "Split by range",
        body: "**Page ranges** turns each comma-separated range into its own PDF. `2-4` is pages 2 to 4, a single number is one page, `8-` means page 8 to the end and `-3` means pages 1 to 3. A range written backwards, such as `5-1`, keeps that reverse order.\n\nTick **Put all ranges into one PDF** to collect the ranges into a single file in the order you typed them, which is also a quick way to reorder pages. If a page number doesn't exist, the box says so before anything is created.",
      },
      {
        heading: "Extract specific pages",
        body: "**Select pages** shows a checkbox under each page thumbnail. Tick the pages you want (or use **Select all** and untick a few) and press **Split PDF** to get one PDF containing just those pages, in document order. Tick **Save each selected page as its own file** to get separate one-page PDFs instead.\n\nThis is the simplest way to pull a signature page or a single invoice out of a long document. To save a page as an image rather than a PDF, use [PDF to JPG](/pdf-to-jpg/).",
      },
      {
        heading: "One file per page",
        body: "**Every page** creates one PDF per page, named with the page number (`report-page-1.pdf`, `report-page-2.pdf` …) so the files sort in order. **Every N pages** cuts the document into equal parts, for example every 2 pages for double-sided forms; the last part is shorter if the page count doesn't divide evenly.\n\nWhen there are many files, **Download all (ZIP)** puts them in one archive so your browser doesn't ask about dozens of separate downloads. See [PDF to ZIP](/pdf-to-zip/) for other ways to bundle PDFs.",
      },
      {
        heading: "Splitting large PDFs",
        body: "Each new file is built by copying pages from the original, without re-compressing them, so quality is unchanged. A page that shares fonts or images with other pages carries its own copy of them, which is why the parts together are often larger than the original.\n\nSplitting a 500-page document into single pages takes a little while on a phone; progress is shown and **Cancel** stops it. Your original file is never changed.",
      },
    ],
    faq: [
      {
        q: "How do I extract one page from a PDF?",
        a: "Choose **Page ranges**, type the page number (for example `4`) and press **Split PDF**. You get a one-page PDF named after that page.",
      },
      {
        q: "Can I split by file size?",
        a: "No. Splitting is by pages. If each part must stay under a size limit, split into smaller page ranges and check the sizes shown in the result list, or compress the parts with [compress PDF](/compress-pdf/).",
      },
      {
        q: "Is the original changed?",
        a: "No. The tool only reads your file and creates new ones; the original stays as it was on your device.",
      },
    ],
    related: ["merge-pdf", "pdf-to-jpg", "rotate-pdf", "pdf-to-zip", "compress-pdf"],
    links: [
      { href: "/merge-pdf/", anchor: "merge PDF" },
      { href: "/pdf-to-jpg/", anchor: "PDF to JPG" },
      { href: "/rotate-pdf/", anchor: "rotate PDF" },
      { href: "/pdf-to-zip/", anchor: "PDF to ZIP" },
    ],
    appCategory: "UtilitiesApplication",
    features: [
      "Split by custom page ranges, every page or every N pages",
      "Tick pages on thumbnails to extract them",
      "Download single files or all parts as a ZIP",
      "Runs in the browser; files are not uploaded",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  {
    id: "rotate-pdf",
    path: "/rotate-pdf/",
    name: "Rotate PDF",
    h1: "Rotate PDF",
    title: "Rotate PDF – Rotate Pages and Save Permanently",
    metaDescription:
      "Rotate all pages or only selected pages of a PDF by 90 or 180 degrees and save the change permanently. Check thumbnails before you download.",
    summary:
      "Turn every page, or only the pages you pick, by 90 or 180 degrees, check the result on page thumbnails, and save a PDF that opens the right way up everywhere.",
    category: "pdf-tools",
    subgroup: "organise",
    card: "Rotate all or selected PDF pages and save the change permanently.",
    archetype: "file",
    widget: "pdf-rotate",
    aliases: ["rotate pdf pages", "turn pdf", "rotate pdf and save", "flip pdf", "pdf rotator", "rotate one page in pdf", "rotate scanned pdf", "roate pdf"],
    keywords: ["rotate", "sideways", "upside down", "landscape"],
    processing: "browser",
    limits: ["Rotation is in steps of 90 degrees; slightly skewed scans can't be straightened."],
    steps: [
      "Press **Choose PDF**. A thumbnail of every page appears.",
      "Use **Rotate all left**, **Rotate all right** or **Rotate all 180°** for the whole document, or the arrow buttons under a thumbnail for one page.",
      "To turn a set of pages, type them in **Selected pages** (for example `2, 4-6`), choose an angle under **Turn by** and press **Rotate these pages**.",
      "Check the thumbnails, then press **Download rotated PDF**.",
    ],
    example: {
      title: "Example",
      input: "scan.pdf, 6 pages; pages 2 and 5 are sideways\nSelected pages: 2, 5 · Turn by: 90° right",
      output: "scan-rotated.pdf with pages 2 and 5 upright; the other four pages unchanged",
    },
    sections: [
      {
        heading: "Rotating all pages",
        body: "The **All pages** buttons turn every page by 90 degrees left (counter-clockwise), 90 degrees right (clockwise) or 180 degrees. Press a button again to keep turning; four presses bring a page back to where it started. **Reset** undoes all changes before you download.\n\nPages that were already rotated in the original keep their own starting angle, and your change is added to it, so a mixed document stays consistent.",
      },
      {
        heading: "Rotating selected pages",
        body: "Each thumbnail has its own rotate-left and rotate-right buttons, which is quickest for one or two pages. For many pages, type them in **Selected pages** using commas and ranges (`1, 3-7, 10`) and press **Rotate these pages**; the change is applied to just those pages.\n\nPages you have changed get a coloured border and show their angle next to the page number, and the footer counts how many pages will be rotated.",
      },
      {
        heading: "Viewer rotation vs saved rotation",
        body: "The rotate button in a PDF viewer or browser usually changes only how the file is shown on your screen; the next time you open it, or when someone else does, it is sideways again. This tool changes the page's rotation setting inside the file (the `/Rotate` entry in the PDF), so every viewer and printer shows it the new way.\n\nRotation doesn't re-render anything: text stays selectable and images aren't re-compressed, so there is no quality loss and the size barely changes.",
      },
      {
        heading: "Fixing sideways scans",
        body: "Scanners and phone scanning apps often save landscape pages, or pages fed upside down, at the wrong angle. Open the scan here, look along the thumbnails for pages that read the wrong way, and fix only those with the per-page buttons.\n\nIf the scan also has pages in the wrong order or blank pages, rotate first, then use [split PDF](/split-pdf/) to keep the pages you want or [merge PDF](/merge-pdf/) to reassemble them. To make a large scan smaller afterwards, use [compress PDF](/compress-pdf/).",
      },
    ],
    faq: [
      {
        q: "How do I rotate just one page?",
        a: "Use the rotate-left or rotate-right button under that page's thumbnail, then press **Download rotated PDF**. The other pages are not touched.",
      },
      {
        q: "Why does my PDF open rotated again?",
        a: "The viewer's rotate button only changed the view. Rotate the pages here and download the new file; the rotation is saved inside it.",
      },
      {
        q: "Does rotation reduce quality?",
        a: "No. Only the page's rotation setting changes; the text, images and fonts are copied unchanged.",
      },
    ],
    related: ["split-pdf", "merge-pdf", "compress-pdf", "edit-pdf-online", "pdf-to-jpg"],
    links: [
      { href: "/split-pdf/", anchor: "split PDF" },
      { href: "/merge-pdf/", anchor: "merge PDF" },
      { href: "/compress-pdf/", anchor: "compress PDF" },
    ],
    appCategory: "UtilitiesApplication",
    features: [
      "Rotate all pages left, right or 180 degrees",
      "Rotate single pages or page ranges",
      "Thumbnail preview before saving",
      "Saved permanently without re-compressing",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },

  /* ---------------------------------------------------------------- Compress */
  {
    id: "compress-pdf",
    path: "/compress-pdf/",
    name: "Compress PDF",
    h1: "Compress PDF",
    title: "Compress PDF – Reduce PDF File Size Online",
    metaDescription:
      "Reduce PDF file size by downsampling images and removing unused data. Pick a quality level, compare before and after sizes, and download.",
    summary:
      "Make a PDF smaller either by shrinking the images inside it while keeping the text selectable, or by turning every page into a compressed image for the smallest file.",
    category: "pdf-tools",
    subgroup: "compress",
    card: "Shrink a PDF, keeping text selectable or going for the smallest size.",
    archetype: "file",
    widget: "pdf-compress",
    config: { mode: "choose" },
    aliases: ["reduce pdf size", "pdf compressor", "shrink pdf", "make pdf smaller", "pdf size reducer", "compress pdf file", "reduce pdf file size", "optimize pdf", "compres pdf", "pdf reducer"],
    keywords: ["smaller", "email", "upload limit", "scanned", "file size"],
    processing: "browser",
    limits: [
      "Smallest size turns pages into images: text can no longer be selected or searched, and links and form fields are removed.",
      "PDFs that need a password to open can't be compressed.",
    ],
    steps: [
      "Press **Choose PDF**. The size, page count and whether the PDF has selectable text are shown.",
      "Under **Compression mode**, choose **Keep text** or **Smallest size**.",
      "For Keep text, pick an **Image compression** level (None, Light, Medium or Strong). For Smallest size, pick a **Page image quality** and optionally **Greyscale**.",
      "Press **Compress PDF**, compare the before and after sizes and the page preview, then press **Download**.",
    ],
    example: {
      title: "Measured on a 4-page report with two large photos (4.74 MB)",
      input: "Keep text · Image compression: Medium",
      output: "318 KB (93% smaller); 2 images re-saved at lower quality, text still selectable",
      note: "On a 6-page text-only PDF saved without object streams, Keep text with no image compression went from 21.0 KB to 13.6 KB.",
    },
    sections: [
      {
        heading: "How PDF compression works",
        body: "A PDF is a container of objects: page descriptions, fonts, images and metadata. Most large PDFs are large because of their images, so that is where real savings come from. This tool offers two honest approaches:\n\n- **Keep text** rewrites the file: it drops objects nothing refers to, compresses data that was stored uncompressed, packs small objects into compressed object streams and, if you choose an image level, re-saves photos as smaller JPEGs. Text, fonts, links and form fields are untouched.\n- **Smallest size** renders every page to a picture with PDF.js and builds a new PDF from those JPEGs. It reaches much smaller sizes on scans, but the text becomes part of an image.\n\nThe result always shows the real before and after size; if a method doesn't make the file smaller, it says so and offers no download.",
      },
      {
        heading: "Choosing a compression level",
        body: "| Level | What happens to images | Typical use |\n|---|---|---|\n| None | Nothing; lossless clean-up only | Text documents, forms |\n| Light | JPEG 80%, at most 2,400 px long side | Print-quality brochures |\n| Medium | JPEG 65%, at most 1,600 px | Email and web |\n| Strong | JPEG 50%, at most 1,100 px | Smallest file with text kept |\n\nAn image is only replaced when the new version is at least 10% smaller, and small images, masks and unusual colour spaces (CMYK, indexed) are left alone. Measured on the 4.74 MB photo report above: Light gave 1.27 MB, Medium 318 KB and Strong 116 KB.",
      },
      {
        heading: "Scanned PDFs vs text PDFs",
        body: "A scanned PDF is one big image per page and has no selectable text, which the tool detects and shows after you choose the file. For scans, **Smallest size** loses nothing you could select and lets you pick the resolution directly. On a 3-page colour scan at 200 DPI (2.55 MB) it produced 782 KB at 150 DPI, 378 KB at 110 DPI and 147 KB at 72 DPI.\n\nFor PDFs made from Word or a website, the text is stored as characters and fonts, which are already compact. Turning those pages into pictures makes them bigger: in the same tests a 21 KB text PDF became 1.59 MB at 150 DPI. Use **Keep text** for them.",
      },
      {
        heading: "When a PDF won't get smaller",
        body: "Some PDFs are already as small as they can be without losing quality: text-only files saved by modern software, or scans that were compressed well when they were made. Keep text then reports that no smaller file was possible.\n\nOther causes: images in formats the browser can't re-encode (CMYK photos, JPEG 2000), embedded fonts (which this tool doesn't subset) or attached files. Removing pages you don't need with [split PDF](/split-pdf/) often saves more than any compression setting.",
      },
      {
        heading: "Compressing to a specific size",
        body: "If a form or portal states a limit, use [compress PDF to 100KB](/compress-pdf-to-100kb/) or [compress PDF to 50KB](/compress-pdf-to-50kb/). Those pages search for the best quality that fits: first by shrinking images while keeping text, then by rendering pages at the highest resolution that still fits, and they tell you when the target can't be reached at a readable quality. The guide [how to reduce PDF file size](/blog/reduce-pdf-file-size/) covers the background.",
      },
    ],
    faq: [
      {
        q: "Why is my PDF so large?",
        a: "Usually because of high-resolution photos or scans inside it; a single phone photo can be 3–5 MB. Embedded fonts and data saved without compression add more.",
      },
      {
        q: "Will compression make text blurry?",
        a: "Not with **Keep text**: text stays as sharp vector text and only photos change. With **Smallest size** the text becomes part of a page image, so it can look soft at 72 DPI; use the 150 DPI setting if small print matters.",
      },
      {
        q: "How do I get a PDF under 100KB?",
        a: "Use [compress PDF to 100KB](/compress-pdf-to-100kb/), which tries settings in order of quality until the file fits and tells you if it can't.",
      },
    ],
    sources: [
      { label: "ISO 32000-2: Document management – Portable Document Format", url: "https://www.iso.org/standard/75839.html" },
      { label: "PDF.js (Mozilla)", url: "https://mozilla.github.io/pdf.js/" },
    ],
    related: ["compress-pdf-to-100kb", "compress-pdf-to-50kb", "merge-pdf", "split-pdf", "pdf-to-jpg"],
    links: [
      { href: "/compress-pdf-to-100kb/", anchor: "compress PDF to 100KB" },
      { href: "/compress-pdf-to-50kb/", anchor: "compress PDF to 50KB" },
      { href: "/blog/reduce-pdf-file-size/", anchor: "how to reduce PDF file size" },
      { href: "/merge-pdf/", anchor: "merge PDF" },
    ],
    guides: ["/blog/reduce-pdf-file-size/"],
    appCategory: "UtilitiesApplication",
    features: [
      "Keep text mode: lossless clean-up plus optional image recompression",
      "Smallest size mode: pages rendered at 72–150 DPI",
      "Real before and after sizes with page preview",
      "Detects scanned PDFs with no selectable text",
      "Runs in the browser; files are not uploaded",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  {
    id: "compress-pdf-to-100kb",
    path: "/compress-pdf-to-100kb/",
    name: "Compress PDF to 100KB",
    h1: "Compress PDF to 100KB",
    title: "Compress PDF to 100KB – For Upload Forms and Portals",
    metaDescription:
      "Shrink a PDF to 100KB or less for application forms and portals. The tool lowers image resolution step by step and tells you if 100KB can't be reached.",
    summary:
      "Get a PDF under 100 KB for an application form or upload portal. The tool tries the sharpest settings first and tells you plainly when 100 KB can't be reached.",
    category: "pdf-tools",
    subgroup: "compress",
    card: "Shrink a PDF to 100 KB or less for forms and upload portals.",
    archetype: "file",
    widget: "pdf-compress",
    config: { targetKB: 100 },
    aliases: ["pdf to 100kb", "reduce pdf size to 100kb", "compress pdf below 100kb", "pdf size reducer 100kb", "pdf under 100kb", "100kb pdf", "compress pdf 100 kb", "pdf compress to 100kb"],
    keywords: ["upload limit", "form", "portal", "application"],
    processing: "browser",
    targetKB: 100,
    media: "pdf",
    limits: [
      "If keeping the text isn't enough, pages are converted to images and text is no longer selectable.",
      "Long documents may not fit in 100 KB at a readable resolution; the tool tells you when that happens.",
    ],
    steps: [
      "Press **Choose PDF**. If it is already under the limit, the tool says so and you can upload your original.",
      "Check **Target size (KB)**. It is set to 100; change it if your form allows a different size.",
      "Tick **Greyscale** for black-and-white documents; it helps when pages have to be converted to images.",
      "Press **Compress to 100 KB**, read the result message, check the page preview and press **Download**.",
    ],
    example: {
      title: "Measured results (1 KB = 1,000 bytes)",
      input: "4-page report with two photos, 4.74 MB\n3-page colour scan at 200 DPI, 2.55 MB",
      output: "Report: 68.0 KB, text kept (photos reduced)\nScan: 88.4 KB, pages rendered at 72 DPI",
    },
    sections: [
      {
        heading: "How the 100KB target is reached",
        body: "The tool works from the best quality down and stops at the first result that fits:\n\n1. Lossless clean-up of the file structure.\n2. Re-saving the photos inside the PDF at lower quality and resolution, keeping text, links and fonts. For PDFs with selectable text this goes as far as photos 560 px wide.\n3. Rendering every page as a JPEG, starting at 150 DPI and stepping down through 120, 100, 85 and 72 DPI to 40 DPI, trying several JPEG qualities at each step.\n\n100 KB means 100,000 bytes, so the file also passes forms that count 1 KB as 1,024 bytes. The result shows the exact byte count.",
      },
      {
        heading: "Scanned documents and photos",
        body: "A scan has no selectable text, so step 2 only goes as far as moderate image reduction; after that, rendering pages at a known resolution gives more readable results for the same size. In tests, a one-page colour scan of 850 KB came out at 66.8 KB with its image re-saved, and a three-page scan at 88.4 KB at 72 DPI.\n\n**Greyscale** removes colour information, which helps documents that are black text on white paper. If a scan was made at a very high resolution or in colour, rescanning at 150–200 DPI in greyscale gives a better starting point than any compression afterwards.",
      },
      {
        heading: "When 100KB isn't possible",
        body: "Every page needs a minimum number of bytes to stay legible. In the tests above, an A4 scan rendered at 72 DPI took roughly 25–50 KB per page, so documents of about four or more scanned pages often can't fit in 100 KB at a readable resolution.\n\nWhen the target is reached only below 72 DPI, the result is marked with a warning that small print may be hard to read. When it can't be reached at all, you still get the smallest file the tool could make and suggestions: remove pages you don't need with [split PDF](/split-pdf/), send the document in parts, or ask whether a larger file is accepted.",
      },
      {
        heading: "Other targets: 200KB, 500KB, 1MB",
        body: "Type any size into **Target size (KB)**, for example 200, 500 or 1000 for 1 MB. Larger targets allow higher resolutions or let the text be kept. For stricter limits use [compress PDF to 50KB](/compress-pdf-to-50kb/); to choose the compression yourself instead of a size, use [compress PDF](/compress-pdf/). If your document is a set of photos, building the PDF with [JPG to PDF](/jpg-to-pdf/) and its **Make the PDF smaller** option keeps it small from the start.",
      },
    ],
    faq: [
      {
        q: "Can every PDF be compressed to 100KB?",
        a: "No. One- and two-page documents almost always fit; long scanned documents often can't at a readable resolution. The tool tells you which case you are in and gives you its smallest result.",
      },
      {
        q: "Will the document still be readable?",
        a: "Results at 72 DPI or more are readable on screen at normal zoom. If the tool had to go lower, it warns you; check the preview before you submit the file.",
      },
      {
        q: "How do I compress a multi-page scan?",
        a: "Tick **Greyscale** if colour isn't needed and remove blank or unneeded pages first. If it still doesn't fit, split the scan into parts and compress each one.",
      },
    ],
    related: ["compress-pdf", "compress-pdf-to-50kb", "split-pdf", "jpg-to-pdf", "merge-pdf"],
    links: [
      { href: "/compress-pdf/", anchor: "compress PDF" },
      { href: "/compress-pdf-to-50kb/", anchor: "compress PDF to 50KB" },
      { href: "/jpg-to-pdf/", anchor: "JPG to PDF" },
      { href: "/blog/reduce-pdf-file-size/", anchor: "reducing PDF size" },
    ],
    guides: ["/blog/reduce-pdf-file-size/"],
    appCategory: "UtilitiesApplication",
    features: [
      "Searches for the best quality that fits 100 KB",
      "Keeps text when shrinking images is enough",
      "Adjustable target size and greyscale option",
      "Warns when the target needs an unreadably low resolution",
      "Runs in the browser; files are not uploaded",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  {
    id: "compress-pdf-to-50kb",
    path: "/compress-pdf-to-50kb/",
    name: "Compress PDF to 50KB",
    h1: "Compress PDF to 50KB",
    title: "Compress PDF to 50KB – Shrink PDFs for Strict Upload Limits",
    metaDescription:
      "Reduce a PDF to 50KB or less for forms with tight upload limits. See the size at each step and get tips when a multi-page scan won't fit.",
    summary:
      "Shrink a PDF to 50 KB or less for forms with tight limits. The tool keeps the best quality that fits and warns you when the result would be hard to read.",
    category: "pdf-tools",
    subgroup: "compress",
    card: "Reduce a PDF to 50 KB or less for strict upload limits.",
    archetype: "file",
    widget: "pdf-compress",
    config: { targetKB: 50 },
    aliases: ["pdf to 50kb", "reduce pdf size to 50kb", "compress pdf below 50kb", "pdf under 50kb", "50kb pdf", "compress pdf 50 kb", "pdf size 50kb", "shrink pdf to 50kb"],
    keywords: ["upload limit", "form", "certificate", "scan"],
    processing: "browser",
    targetKB: 50,
    media: "pdf",
    limits: [
      "Most scans only fit in 50 KB when pages are converted to images, so text is no longer selectable.",
      "Documents with more than one or two scanned pages often can't fit at a readable resolution.",
    ],
    steps: [
      "Press **Choose PDF**. If it is already under 50 KB, you don't need to do anything else.",
      "Tick **Greyscale** if the document is black and white. Leave **Target size (KB)** at 50 unless your form says otherwise.",
      "Press **Compress to 50 KB** and watch the progress bar; **Cancel** stops it.",
      "Read the result message and preview. If it says small print may be hard to read, check the preview before you press **Download**.",
    ],
    example: {
      title: "Measured results (1 KB = 1,000 bytes)",
      input: "1-page colour scan at 200 DPI, 850 KB\n3-page colour scan at 200 DPI, 2.55 MB",
      output: "1 page: 47.0 KB at 85 DPI\n3 pages: 43.5 KB at 50 DPI, with a warning that small print may be hard to read",
    },
    sections: [
      {
        heading: "How the 50KB target is reached",
        body: "The same search as the 100 KB tool, with a stricter limit: lossless clean-up, then smaller photos with the text kept, then pages rendered as JPEGs from 150 DPI down to 40 DPI at several qualities each. The first result under 50,000 bytes wins, which is also under 50 KB for forms that count 1,024 bytes per KB.\n\nAt each resolution the search stops as soon as the pages are clearly too big, so even long documents finish within seconds to a minute.",
      },
      {
        heading: "One-page vs multi-page documents",
        body: "A single page, such as a certificate, ID scan or letter, usually fits in 50 KB at 85 DPI or more, which reads well on screen; our one-page test scan fitted at 85 DPI. In the same tests each A4 scan took roughly 25–50 KB at 72 DPI, so three scanned pages pushed the resolution down to 50 DPI.\n\nIf the form accepts several uploads, send pages separately. Otherwise [split out the pages you need](/split-pdf/) and leave out covers, blank pages and instructions.",
      },
      {
        heading: "Greyscale and lower resolution",
        body: "**Greyscale** drops colour information that black-and-white documents don't need; it matters most when pages are rendered as images. Lower resolution saves far more: halving the DPI cuts the pixel count to a quarter.\n\nText needs about 72 DPI to stay comfortable to read at normal zoom, which is the line the tool uses for its warning. Below that, letters smudge together, especially small print, stamps and signatures. Thin coloured ink such as blue pen fades first, so check signatures in the preview.",
      },
      {
        heading: "When 50KB isn't possible",
        body: "If even 40 DPI at low quality doesn't fit, the tool says so and still gives you its smallest file with its real size. Your options then: remove pages, send the document in parts, rescan in greyscale at a lower resolution, or check whether the form accepts 100 KB, in which case use [compress PDF to 100KB](/compress-pdf-to-100kb/). To pick the settings yourself rather than a target, use [compress PDF](/compress-pdf/).",
      },
    ],
    faq: [
      {
        q: "Can a multi-page PDF fit in 50KB?",
        a: "A few pages of plain text with no images usually can, with the text kept. Two or three scanned pages can, at a lower resolution. Longer scans generally can't while staying readable.",
      },
      {
        q: "Should I convert to greyscale?",
        a: "Yes, if colour doesn't matter. Greyscale page images are smaller, which can leave room for a higher resolution within the same 50 KB.",
      },
      {
        q: "Why is the text hard to read?",
        a: "To fit the limit, the pages had to be rendered at a low resolution. Remove pages so each remaining page gets more of the 50 KB, or use a larger limit if the form allows it.",
      },
    ],
    related: ["compress-pdf-to-100kb", "compress-pdf", "split-pdf", "jpg-to-pdf", "pdf-to-jpg"],
    links: [
      { href: "/compress-pdf-to-100kb/", anchor: "compress PDF to 100KB" },
      { href: "/compress-pdf/", anchor: "compress PDF" },
      { href: "/split-pdf/", anchor: "split out the pages you need" },
    ],
    guides: ["/blog/reduce-pdf-file-size/"],
    appCategory: "UtilitiesApplication",
    features: [
      "Finds the best quality that fits 50 KB",
      "Greyscale option for black-and-white documents",
      "Readability warning below 72 DPI",
      "Runs in the browser; files are not uploaded",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },

  /* ---------------------------------------------------------------- Convert */
  {
    id: "word-to-pdf",
    path: "/word-to-pdf/",
    name: "Word to PDF Converter",
    h1: "Word to PDF Converter",
    title: "Word to PDF Converter – Convert DOCX to PDF",
    metaDescription:
      "Convert Word documents (.docx) to PDF in your browser. See which formatting is supported, preview the result and download. No upload needed.",
    summary:
      "Convert a Word .docx file to PDF on your device, keeping headings, paragraphs, bold and italic text, lists, tables, links and images. Best for text documents.",
    category: "pdf-tools",
    subgroup: "convert",
    card: "Convert a Word .docx document to PDF without uploading it.",
    archetype: "file",
    widget: "word-to-pdf",
    aliases: ["docx to pdf", "convert word to pdf", "doc to pdf converter", "word document to pdf", "word to pdf converter", "save word as pdf", "docx pdf", "word 2 pdf", "wrod to pdf"],
    keywords: ["docx", "document", "convert", "without word"],
    processing: "browser",
    formats: { from: ["docx"], to: ["pdf"] },
    limits: [
      "Layout is rebuilt with standard PDF fonts: your fonts, colors, alignment, headers, footers and text boxes are not kept.",
      "Only Western European characters can be shown; other scripts appear as “?” and are listed after conversion.",
      "Old .doc files must be saved as .docx first.",
    ],
    steps: [
      "Press **Choose Word file** and pick a .docx document. It is converted straight away.",
      "Check the **Preview** of the first pages and the counts of headings, tables and images. Any images or characters that couldn't be included are listed.",
      "If you like, change **Page size**, **Orientation**, **Margins**, **Font** or **Add page numbers**, then press **Convert again**.",
      "Press **Download** to save the PDF.",
    ],
    example: {
      title: "Example (test document)",
      input: "report.docx: a heading, 5 subheadings, bulleted and numbered lists, a 4-column table, a link, a PNG chart and a line with “Ω, Ж, 中文”",
      output: "report.pdf, 2 pages: 6 headings, 1 table, 1 image; the link is clickable; 4 characters (Ω Ж 中 文) reported as not supported and shown as “?”",
    },
    sections: [
      {
        heading: "Supported formatting",
        body: "The converter reads the document's structure with mammoth.js and lays it out again on PDF pages:\n\n| Kept | Not kept |\n|---|---|\n| Headings 1–6 (by Word heading style) | Fonts, font sizes and colors |\n| Paragraphs, line breaks | Alignment (centered, justified) |\n| Bold, italic, underline, strikethrough, superscript, subscript | Headers, footers, page numbers from Word |\n| Bulleted and numbered lists, nested | Text boxes, shapes, WordArt, charts as objects |\n| Tables, including merged cells | Cell shading and custom borders |\n| Links to websites (clickable) | Columns, page breaks, section layouts |\n| PNG, JPEG, GIF and BMP images | EMF and WMF drawings |\n| Footnotes and endnotes (at the end) | Comments |\n\nHeadings only count when the document uses Word's heading styles; text that is just large and bold becomes a normal paragraph.",
      },
      {
        heading: "Fonts and layout differences",
        body: "The PDF uses the standard PDF fonts, Helvetica (**Sans-serif**) or Times (**Serif**), at 11 pt for body text. Because these differ from Calibri, Arial or your own fonts, lines and pages break in different places than in Word, and a 10-page document may become 9 or 11 pages.\n\nThe standard fonts cover Western European languages, including accented letters, the euro sign and curly quotes. Greek, Cyrillic, Arabic, Hebrew, Chinese, Japanese, Korean, emoji and symbols are not available; they are shown as “?” and listed under the result so you notice before sending the file. Images are shown at screen size (96 pixels per inch), shrunk to fit the page width when needed.",
      },
      {
        heading: "Converting .doc files",
        body: "Files in the older .doc format (Word 97–2003) use a different, binary structure that this converter can't read; you get a message telling you so. Open the file in Word, Google Docs or LibreOffice and save it as .docx, then convert that.\n\nPassword-protected Word files are rejected for the same reason: remove the password in Word first.",
      },
      {
        heading: "Other ways: Word, Google Docs, LibreOffice",
        body: "If your document depends on exact layout (letterheads, columns, brochures, forms) or uses non-Latin scripts, the program that made it gives a perfect copy:\n\n- **Microsoft Word:** File → Save As (or Export) → PDF.\n- **Google Docs:** File → Download → PDF document.\n- **LibreOffice Writer:** File → Export as PDF.\n- **Phone:** open the document in the Word or Google Docs app and use Share or Print → Save as PDF.\n\nThis tool is useful when none of those is at hand, for example on a shared computer, and for text documents where structure matters more than exact appearance. After converting, you can [merge PDF](/merge-pdf/) files or [compress PDF](/compress-pdf/) output that contains large images.",
      },
    ],
    faq: [
      {
        q: "Will my fonts and images be kept?",
        a: "Images in PNG, JPEG, GIF and BMP are kept; EMF and WMF drawings are replaced by a note. Fonts are not kept: the text is set in Helvetica or Times.",
      },
      {
        q: "Can I convert .doc files?",
        a: "Not directly. Save the file as .docx in Word, Google Docs or LibreOffice first, then convert it here.",
      },
      {
        q: "Is the document uploaded?",
        a: "No. The .docx file is read and converted in your browser, and the PDF is created on your device.",
      },
    ],
    sources: [
      { label: "mammoth.js (.docx to HTML)", url: "https://github.com/mwilliamson/mammoth.js" },
      { label: "pdf-lib documentation", url: "https://pdf-lib.js.org/" },
    ],
    related: ["merge-pdf", "compress-pdf", "jpg-to-pdf", "edit-pdf-online", "pdf-to-jpg"],
    links: [
      { href: "/compress-pdf/", anchor: "compress PDF" },
      { href: "/merge-pdf/", anchor: "merge PDF" },
      { href: "/word-to-html-converter/", anchor: "Word to HTML" },
      { href: "/jpg-to-pdf/", anchor: "JPG to PDF" },
    ],
    appCategory: "UtilitiesApplication",
    features: [
      "Converts .docx headings, lists, tables, links and images",
      "A4 or US Letter, portrait or landscape, three margin sizes",
      "Optional page numbers",
      "Preview of the first pages before download",
      "Runs in the browser; documents are not uploaded",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  {
    id: "pdf-to-jpg",
    path: "/pdf-to-jpg/",
    name: "PDF to JPG Converter",
    h1: "PDF to JPG Converter",
    title: "PDF to JPG – Convert PDF Pages to High-Quality Images",
    metaDescription:
      "Turn each PDF page into a JPG (or PNG) at the resolution you choose. Download single images or all pages as a ZIP. Runs in your browser.",
    summary:
      "Convert every page of a PDF, or only the pages you choose, into JPG or PNG images at 72 to 300 DPI, then download them one by one or together in a ZIP.",
    category: "pdf-tools",
    subgroup: "convert",
    card: "Turn PDF pages into JPG or PNG images at the resolution you choose.",
    archetype: "file",
    widget: "pdf-to-images",
    config: { mode: "images" },
    aliases: ["convert pdf to jpg", "pdf to image", "pdf to jpeg", "pdf to png", "pdf page to image", "save pdf as jpg", "pdf to picture", "pdf 2 jpg", "pdf to jpg converter"],
    keywords: ["image", "page", "dpi", "jpeg", "png"],
    processing: "browser",
    formats: { from: ["pdf"], to: ["jpg", "png"] },
    limits: ["PDFs that need a password to open can't be converted.", "Very large pages are rendered below the chosen DPI to stay within browser memory limits; the result says when this happens."],
    steps: [
      "Press **Choose PDF**.",
      "Pick an **Image format** (JPG or PNG) and a **Resolution** from 72 to 300 DPI; for JPG, set **JPG quality**.",
      "Under **Pages**, keep **All** or choose **Choose pages** and type page numbers such as `1, 3-5`.",
      "Press **Convert to JPG** (or PNG). Download single images or press **Download all (ZIP)**.",
    ],
    example: {
      title: "Pixel sizes for an A4 page",
      input: "A4 page (595 × 842 pt) at 72, 150, 200 and 300 DPI",
      output: "72 DPI: 595 × 841 px\n150 DPI: 1,240 × 1,753 px\n200 DPI: 1,653 × 2,338 px\n300 DPI: 2,480 × 3,507 px",
      note: "The widget shows this figure for the resolution you pick before you convert.",
    },
    sections: [
      {
        heading: "Choosing resolution (DPI)",
        body: "DPI (dots per inch) sets how many pixels each inch of the page becomes. A PDF page is measured in points (72 per inch), so the image width is the page width in inches times the DPI.\n\n- **72 DPI**: quick previews and thumbnails.\n- **150 DPI**: screens, email, slides and most upload forms; small text is readable.\n- **200 DPI**: sharper text when people will zoom in.\n- **300 DPI**: printing; each A4 page is about 8.7 megapixels, so files are large.\n\nPages are rendered by PDF.js, the PDF engine used in Firefox, with form field appearances and annotations included and a white background.",
      },
      {
        heading: "JPG or PNG output",
        body: "**JPG** is right for most uses: files are small and photos look natural. At 85% quality (the default) text edges stay clean; lower the slider for smaller files, raise it for crisp diagrams. **PNG** is lossless, so lines and small text are perfectly sharp, but files are several times larger, especially for pages with photos. Neither format keeps the text selectable; for that, keep the PDF.",
      },
      {
        heading: "Converting selected pages",
        body: "Choose **Choose pages** under **Pages** and type single pages and ranges separated by commas, for example `2` for one page or `1, 4-6` for four. Each page is converted once, in the order you type, and images are named after their page number (`report-page-04.jpg`) so they sort correctly in a folder.\n\nTo make a new PDF from some pages instead of images, use [split PDF](/split-pdf/).",
      },
      {
        heading: "Downloading all pages as a ZIP",
        body: "Each image has its own **Download** button. With more than one page, **Download all (ZIP)** puts every image into one archive, which avoids dozens of separate downloads and is easier to send. The images are stored in the ZIP without further compression because JPG and PNG are already compressed. [PDF to ZIP](/pdf-to-zip/) does the same with the ZIP as the main result, and can also bundle whole PDF files.",
      },
    ],
    faq: [
      {
        q: "What DPI should I use?",
        a: "150 DPI for screens, email and forms; 300 DPI for printing. Higher DPI means sharper images but much larger files: 300 DPI has four times the pixels of 150 DPI.",
      },
      {
        q: "Can I convert only one page?",
        a: "Yes. Choose **Choose pages**, type the page number and press **Convert to JPG**.",
      },
      {
        q: "How do I get a smaller JPG for a form?",
        a: "Convert at 150 DPI with a lower JPG quality. If the form sets a size limit, run the image through [compress image to 50KB](/compress-image-to-50kb/) afterwards.",
      },
    ],
    sources: [{ label: "PDF.js (Mozilla)", url: "https://mozilla.github.io/pdf.js/" }],
    related: ["jpg-to-pdf", "pdf-to-zip", "split-pdf", "compress-image-to-50kb", "compress-pdf"],
    links: [
      { href: "/pdf-to-zip/", anchor: "PDF to ZIP" },
      { href: "/compress-image-to-50kb/", anchor: "compress image to 50KB" },
      { href: "/jpg-to-pdf/", anchor: "JPG to PDF" },
      { href: "/split-pdf/", anchor: "split PDF" },
    ],
    appCategory: "MultimediaApplication",
    features: [
      "JPG or PNG output at 72, 150, 200 or 300 DPI",
      "Adjustable JPG quality",
      "Convert all pages or selected pages",
      "Individual downloads or one ZIP",
      "Runs in the browser; files are not uploaded",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  {
    id: "pdf-to-zip",
    path: "/pdf-to-zip/",
    name: "PDF to ZIP Converter",
    h1: "PDF to ZIP Converter",
    title: "PDF to ZIP – Put PDFs or Their Pages Into a ZIP File",
    metaDescription:
      "Bundle one or more PDFs into a ZIP archive, or export every page as a JPG inside a ZIP. Note: zipping rarely makes a PDF much smaller.",
    summary:
      "Put one or more PDF files into a single ZIP archive, or export the pages of a PDF as JPG or PNG images inside a ZIP. Both run on your device.",
    category: "pdf-tools",
    subgroup: "convert",
    card: "Bundle PDFs into a ZIP, or export PDF pages as images in a ZIP.",
    archetype: "file",
    widget: "pdf-to-images",
    config: { mode: "zip" },
    aliases: ["zip pdf files", "compress pdf to zip", "pdf to zip converter", "zip a pdf", "pdf zipper", "pdf pages to jpg zip", "put pdfs in a zip", "pdf archive"],
    keywords: ["zip", "archive", "bundle", "email"],
    processing: "browser",
    formats: { from: ["pdf"], to: ["zip"] },
    limits: ["Zipping doesn't make PDFs much smaller; use Compress PDF to reduce size."],
    steps: [
      "Under **What to put in the ZIP**, choose **PDF files** to bundle whole PDFs, or **Pages as images** to turn one PDF's pages into pictures.",
      "For PDF files: press **Choose PDFs**, add as many as you need, set the **ZIP file name** and press **Create ZIP**.",
      "For pages as images: press **Choose PDF**, pick the format, resolution and pages, and press **Convert pages to ZIP**.",
      "Press **Download** (or **Download ZIP**). The result shows the ZIP size next to the original total.",
    ],
    example: {
      title: "Measured ZIP savings",
      input: "4 PDFs totalling 7.33 MB (two scans and photo reports, two text documents)",
      output: "pdf-files.zip: 7.31 MB, 0.3% smaller",
      note: "A 21 KB text-only PDF saved without compressed object streams shrank by 33% on its own; scanned and photo PDFs shrank by less than 1%.",
    },
    sections: [
      {
        heading: "Zipping PDF files",
        body: "**PDF files** mode puts any number of PDFs into one .zip archive with standard Deflate compression, which every computer and phone can open. It is the easiest way to send a set of documents as a single attachment or upload, and the file names inside the ZIP are kept (duplicates get `-2`, `-3` added).\n\nThe PDFs are stored exactly as they are: nothing is changed or re-saved, and password-protected PDFs can be zipped too.",
      },
      {
        heading: "Exporting pages as images in a ZIP",
        body: "**Pages as images** renders the pages of one PDF as JPG or PNG at 72–300 DPI and packs them into a ZIP named after the PDF. Use it when a website or app accepts images but not PDFs, or to share pages that recipients can view without a PDF reader. You can still download individual images from the list. The same conversion is available on [PDF to JPG](/pdf-to-jpg/), where single images are the main result.",
      },
      {
        heading: "Does zipping reduce PDF size?",
        body: "Rarely by much. A PDF's content (page descriptions, fonts and images) is normally already compressed inside the file, and compressed data can't be compressed again. In our tests a ZIP of scanned and photo PDFs was 0.3% smaller than the originals. Older or unusual PDFs that store data uncompressed can shrink by a third.\n\nThe result tells you the real saving. To make the PDFs themselves smaller, [compress PDF instead](/compress-pdf/), then zip the compressed files if you want one attachment. To combine documents into one PDF rather than one archive, use [merge PDF](/merge-pdf/).",
      },
      {
        heading: "Opening ZIP files on phones",
        body: "**iPhone and iPad:** tap the ZIP in the Files app and it is extracted into a folder next to it. **Android:** open it with the Files by Google app (or your phone's file manager) and tap **Extract**. **Windows and macOS** open ZIP files without extra software. Some email providers block ZIP attachments containing certain file types, but PDFs and images are normally allowed.",
      },
    ],
    faq: [
      {
        q: "Does converting a PDF to ZIP reduce its size?",
        a: "Usually by less than a few percent, because PDF content is already compressed. Use [compress PDF](/compress-pdf/) to make the PDF itself smaller.",
      },
      {
        q: "How do I zip several PDFs?",
        a: "Choose **PDF files**, add the PDFs with **Choose PDFs**, name the archive and press **Create ZIP**.",
      },
      {
        q: "Can I email a ZIP?",
        a: "Yes, as long as it is under your email provider's attachment limit, typically 20–25 MB. The ZIP's size is shown before you download it.",
      },
    ],
    related: ["pdf-to-jpg", "compress-pdf", "merge-pdf", "split-pdf", "jpg-to-pdf"],
    links: [
      { href: "/compress-pdf/", anchor: "compress PDF instead" },
      { href: "/pdf-to-jpg/", anchor: "PDF to JPG" },
      { href: "/merge-pdf/", anchor: "merge PDF" },
    ],
    appCategory: "UtilitiesApplication",
    features: [
      "Bundle any number of PDFs into one ZIP",
      "Export PDF pages as JPG or PNG images in a ZIP",
      "Shows the real size saving",
      "Runs in the browser; files are not uploaded",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },
  {
    id: "jpg-to-pdf",
    path: "/jpg-to-pdf/",
    name: "JPG to PDF Converter",
    h1: "JPG to PDF Converter",
    title: "JPG to PDF – Combine Images Into One PDF",
    metaDescription:
      "Turn JPG, PNG or phone photos into a single PDF: reorder images, pick page size and margins, and download. Everything runs in your browser.",
    summary:
      "Combine JPG, PNG, WebP or GIF images into one PDF, one image per page, in the order you set, on A4, US Letter or pages that match each image.",
    category: "pdf-tools",
    subgroup: "convert",
    card: "Combine JPG, PNG or phone photos into one PDF, one per page.",
    archetype: "file",
    widget: "images-to-pdf",
    aliases: ["image to pdf", "convert jpg to pdf", "photo to pdf", "png to pdf", "jpeg to pdf", "pictures to pdf", "combine images into pdf", "jpg to pdf converter", "webp to pdf", "jpg 2 pdf", "scan to pdf"],
    keywords: ["images", "photos", "scan", "combine"],
    processing: "browser",
    formats: { from: ["jpg", "png", "webp", "gif"], to: ["pdf"] },
    limits: ["HEIC photos from iPhones must be converted to JPG first.", "GIF animations become a single page showing the first frame."],
    steps: [
      "Press **Choose images** (or drag them in, or paste with Ctrl+V). Add as many as you need.",
      "Put them in page order with the up and down arrow buttons, by dragging, or with **Sort by name**.",
      "Under **Page setup**, choose **Page size**, **Orientation** and **Margin**. Tick **Make the PDF smaller** for large phone photos.",
      "Press **Convert to PDF**, then **Download**.",
    ],
    example: {
      title: "Measured on three 12-megapixel photos (4032 × 3024, 4.65 MB each)",
      input: "A4 · Match image · Small margin",
      output: "Make the PDF smaller off: 13.96 MB\nMake the PDF smaller on: 978 KB",
      note: "Photos taken sideways or upside down are turned upright using their camera orientation tag.",
    },
    sections: [
      {
        heading: "Ordering images",
        body: "Each image becomes one page, from the top of the list down. Reorder with the **Move up** and **Move down** arrows on each row (keyboard and touch friendly), by dragging a row on a computer, or with **Sort by name**, which sorts numbers naturally so `scan-2` comes before `scan-10`. The trash button removes an image.\n\nTo add images to an existing PDF, convert them here and then combine both files with [merge PDF](/merge-pdf/).",
      },
      {
        heading: "Page size, orientation and margins",
        body: "**A4** (210 × 297 mm) is the standard outside North America; **US Letter** (8.5 × 11 in) is used in the US and Canada. **Same as image** makes each page exactly the shape of its image.\n\n**Orientation: Match image** turns the page to landscape for wide images and portrait for tall ones, so nothing is shrunk unnecessarily; **Portrait** or **Landscape** forces one orientation for every page. Images are scaled to fit inside the margin (None, Small ≈ 6 mm, Large ≈ 13 mm) and centred, never cropped or stretched.\n\nJPEG photos keep their camera orientation: a portrait photo stored sideways, as phones often do, appears upright.",
      },
      {
        heading: "Keeping the PDF small",
        body: "JPG and PNG files are embedded exactly as they are, so there is no quality loss, but the PDF is as large as the images combined. Phone photos are large: in the example above, three photos made a 14 MB PDF.\n\nTick **Make the PDF smaller** to scale images so the long side is at most 2,000 pixels and save them as JPEG at 80% quality; that brought the same three photos to under 1 MB, still sharp on screen and in print up to A4. For a strict limit such as 100 KB, run the finished PDF through [compress PDF to 100KB](/compress-pdf-to-100kb/).",
      },
      {
        heading: "Scanning documents with your phone",
        body: "For paper documents, photograph each page straight on, in good light, filling the frame. Scanner apps on phones crop and flatten pages automatically; if yours saves images rather than a PDF, add them here in page order, choose A4 or Letter with a small margin and tick **Make the PDF smaller**.\n\niPhones save photos as HEIC by default, which most browsers can't read; convert them with [HEIC to JPG](/heic-to-jpg-converter/) first, or set the camera to Most Compatible. To turn PDF pages back into images, use [PDF to JPG](/pdf-to-jpg/).",
      },
    ],
    faq: [
      {
        q: "Can I combine several images into one PDF?",
        a: "Yes. Add all the images, put them in order and press **Convert to PDF**; each image becomes one page of the same PDF.",
      },
      {
        q: "How do I keep the PDF under 100KB?",
        a: "Tick **Make the PDF smaller** and use as few images as possible. If the PDF is still too large, compress it with [compress PDF to 100KB](/compress-pdf-to-100kb/).",
      },
      {
        q: "Does it work with HEIC photos?",
        a: "Not directly, because most browsers can't decode HEIC. Convert the photos with [HEIC to JPG](/heic-to-jpg-converter/) first, then add the JPGs here.",
      },
    ],
    related: ["pdf-to-jpg", "merge-pdf", "compress-pdf-to-100kb", "heic-to-jpg-converter", "compress-pdf"],
    links: [
      { href: "/pdf-to-jpg/", anchor: "PDF to JPG" },
      { href: "/compress-pdf-to-100kb/", anchor: "compress PDF to 100KB" },
      { href: "/heic-to-jpg-converter/", anchor: "HEIC to JPG" },
      { href: "/merge-pdf/", anchor: "merge PDF" },
    ],
    appCategory: "UtilitiesApplication",
    features: [
      "JPG, PNG, WebP and GIF to one PDF",
      "Reorder with buttons, drag and drop or sort by name",
      "A4, US Letter or image-sized pages with margins",
      "Respects camera orientation of phone photos",
      "Optional size reduction for large photos",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
    isNew: true,
  },

  /* ---------------------------------------------------------------- Edit and sign */
  {
    id: "signature-placement-in-pdf",
    path: "/signature-placement-in-pdf/",
    name: "Add Your Signature to a PDF",
    h1: "Add Your Signature to a PDF",
    title: "Sign PDF Online – Add Your Signature to a PDF",
    metaDescription:
      "Draw, type or upload your signature, place and resize it on any page of a PDF, then download the signed file. Processing happens in your browser.",
    summary:
      "Draw, type or upload your signature, place it on any page of a PDF, add your name and the date, and download the signed file. The PDF stays on your device.",
    category: "pdf-tools",
    subgroup: "edit",
    card: "Draw, type or upload a signature and place it on a PDF.",
    archetype: "file",
    widget: "pdf-annotate",
    config: { mode: "sign" },
    aliases: ["sign pdf online", "sign pdf", "e-sign pdf", "put signature on pdf", "add signature to pdf", "pdf signer", "electronic signature pdf", "draw signature on pdf", "insert signature in pdf", "sing pdf"],
    keywords: ["signature", "sign", "e-signature", "initials", "date"],
    processing: "browser",
    limits: [
      "This adds a visible signature image, not a certificate-based digital signature.",
      "PDFs that are password-protected or locked against changes can't be signed here.",
    ],
    steps: [
      "Press **Choose PDF**.",
      "Under **Create your signature**, choose **Draw**, **Type** or **Upload image**, make your signature and press **Use this signature**. It is placed on the current page.",
      "Move it into place by dragging, with the arrow keys, or by typing **X** and **Y**; resize with the corner handle, the plus and minus keys or **Width**. Use **Add name** and **Add date** for printed details.",
      "To sign more pages, go to another page and press **Add signature to page**, or use **Copy to all pages**. Then press **Download signed PDF**.",
    ],
    sections: [
      {
        heading: "Creating your signature",
        body: "- **Draw:** sign in the box with a mouse, finger or stylus. Choose black or blue ink and a pen width; **Undo stroke** and **Clear** fix mistakes.\n- **Type:** type your name and pick a style. Handwriting styles use fonts installed on your device, and the result is saved as an image exactly as previewed.\n- **Upload image:** use a photo or scan of your signature on white paper. **Remove white background** makes the paper transparent so only the ink appears on the page.\n\nThe signature is cropped to its edges and kept only in this browser tab; it isn't saved anywhere when you close the page.",
      },
      {
        heading: "Placing and resizing it",
        body: "The signature appears near the lower right of the page. Drag it, or select it and use the arrow keys (1 point per press, 10 with Shift), or type exact **X** and **Y** values; positions are in points from the top-left corner (72 points = 1 inch = 25.4 mm). Resize by dragging the corner handle, pressing plus or minus, or typing a **Width**; the height follows so the signature isn't distorted.\n\nEverything you add is drawn into the page content when you download, so it looks the same in every viewer and prints correctly. Pages that are stored rotated are handled, so the signature appears upright where you placed it.",
      },
      {
        heading: "Signing several pages",
        body: "Use **Previous**, **Next** or the page list to move through the document; pages with something on them are marked with a dot. **Add signature to page** puts your signature on the page you are viewing. With a signature selected, **Copy to all pages** places a copy at the same position on every page, and **Copy to pages** does the same for a range such as `2-4, 7`, which suits initials on every page of a contract.\n\n**Added items** lists everything you have placed, with its page, so you can jump back to check or remove it.",
      },
      {
        heading: "Electronic vs digital signatures",
        body: "An **electronic signature** is any mark that shows you agree to a document, including a signature image like the one this tool adds. A **digital signature** is a cryptographic seal made with a certificate (often from a trusted provider) that proves who signed and shows whether the file changed afterwards; PDF viewers display it in a signature panel.\n\nThis tool creates the first kind. It doesn't add a certificate, a signing record or tamper protection. For documents that require a certified or qualified signature, use a signing service or software that supports digital certificates.",
      },
      {
        heading: "Is a signed PDF legally binding?",
        body: "In many countries electronic signatures are generally accepted for everyday agreements; in the United States under the ESIGN Act and in the European Union under the eIDAS Regulation, a signature can't be denied legal effect just because it is electronic. Some documents, such as wills, certain property and court documents, or contracts that require a qualified signature, have stricter rules that vary by country.\n\nWhat often matters most is evidence that the person intended to sign. If in doubt, ask the person or organisation receiving the document what they accept. This is general information, not legal advice.",
      },
    ],
    faq: [
      {
        q: "Is this a legally binding e-signature?",
        a: "It is an electronic signature, which is accepted for many everyday documents, but it carries no certificate or audit trail. Check with the recipient when a document needs a certified digital signature.",
      },
      {
        q: "Can I sign on my phone?",
        a: "Yes. Draw your signature with a finger, then drag it into place or use the position fields. Rotating the phone to landscape gives a larger drawing area.",
      },
      {
        q: "Is my document uploaded?",
        a: "No. The PDF and your signature are processed in your browser and the signed file is created on your device.",
      },
    ],
    sources: [
      { label: "Electronic Signatures in Global and National Commerce Act (ESIGN), Public Law 106-229", url: "https://www.govinfo.gov/app/details/PLAW-106publ229" },
      { label: "Regulation (EU) No 910/2014 (eIDAS)", url: "https://eur-lex.europa.eu/eli/reg/2014/910/oj" },
    ],
    related: ["edit-pdf-online", "merge-pdf", "compress-pdf", "jpg-to-pdf", "split-pdf"],
    links: [
      { href: "/edit-pdf-online/", anchor: "add text to a PDF" },
      { href: "/merge-pdf/", anchor: "merge PDF" },
      { href: "/compress-pdf/", anchor: "compress PDF" },
      { href: "/blog/sign-pdf-without-printing/", anchor: "how to sign a PDF without printing" },
    ],
    guides: ["/blog/sign-pdf-without-printing/"],
    appCategory: "BusinessApplication",
    features: [
      "Draw, type or upload a signature",
      "Remove white background from signature photos",
      "Drag, arrow-key or numeric positioning and resizing",
      "Copy the signature to all or selected pages",
      "Add name and date; runs in the browser",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  {
    id: "edit-pdf-online",
    path: "/edit-pdf-online/",
    name: "Online PDF Editor",
    h1: "Online PDF Editor",
    title: "Edit PDF Online – Add Text, Checkboxes and Signatures",
    metaDescription:
      "Type text onto a PDF, add checkboxes, name and date fields or a signature, and drag them into place. Download the filled PDF. No upload needed.",
    summary:
      "Add text, dates, check marks, crosses, whiteout boxes and a signature anywhere on a PDF, or fill in its form fields, then download the result. Existing text can't be edited.",
    category: "pdf-tools",
    subgroup: "edit",
    card: "Add text, check marks, dates and a signature to any PDF.",
    archetype: "file",
    widget: "pdf-annotate",
    config: { mode: "edit" },
    aliases: ["add text to pdf", "pdf editor online", "fill pdf form online", "type on a pdf", "write on pdf", "add checkbox to pdf", "fill in pdf", "pdf filler", "annotate pdf", "edit pdf", "whiteout pdf"],
    keywords: ["text", "form", "checkbox", "date", "fill"],
    processing: "browser",
    limits: [
      "Text that is already in the PDF can't be changed; you can only cover it and add new text.",
      "Added text uses standard PDF fonts, which cover Western European characters only.",
    ],
    steps: [
      "Press **Choose PDF**. If it has fillable form fields, they are listed under **Form fields in this PDF**.",
      "Use **Add text**, **Add date**, **Check mark**, **Cross**, **Whiteout** or **Signature** to add an item to the page you are viewing; type its text in the **Text** box.",
      "Drag the item into place, or select it and use the arrow keys or the **X** and **Y** fields. Change **Font**, **Size** and **Color** as needed.",
      "Fill any form fields, decide whether to **Flatten form fields**, then press **Download PDF**.",
    ],
    sections: [
      {
        heading: "Adding text and fields",
        body: "**Add text** places a text box in the middle of the page and puts the cursor in the **Text** box, where Enter starts a new line. Choose Sans (Helvetica), Serif (Times) or Mono (Courier), a size in points and black, blue or red; your last choice is remembered for the next box. **Add date** inserts today's date in the format picked next to it, such as 2026-09-30 or 30 September 2026, as ordinary text you can change.\n\n**Check mark** and **Cross** add marks for tick boxes on printed forms, and **Signature** opens the signature maker (draw, type or upload). For signing alone, [sign a PDF](/signature-placement-in-pdf/) has the same tools with signing first.",
      },
      {
        heading: "Filling existing PDF forms",
        body: "If the PDF has interactive form fields (text fields, checkboxes, drop-down lists and radio buttons), they are read with their names and current values and shown as a form below the page. Fill them in there; the values are written into the real fields, so the PDF stays fillable unless you flatten it. Read-only fields are marked and can't be changed.\n\nForms made with Adobe LiveCycle (XFA) also contain a second, hidden form. It is removed on saving so that every viewer shows your values. PDFs without fields, such as scanned forms, are filled by placing text and check marks on the page instead.",
      },
      {
        heading: "Positioning and sizing",
        body: "Drag any item with a mouse or finger. With the keyboard, Tab to an item, then use the arrow keys (1 point per press, 10 with Shift), plus and minus to resize, and Delete to remove it. The **X**, **Y**, **Width** and **Height** fields set exact positions in points from the top-left corner (72 points = 1 inch = 25.4 mm), which helps line text up with printed boxes.\n\n**Copy to pages** or **Copy to all pages** repeats the selected item, for example a reference number in the same corner of every page. **Added items** lists everything with its page number.",
      },
      {
        heading: "What this editor can't change",
        body: "PDFs store text as positioned characters in a font that is often only partly embedded, so changing existing words reliably needs the original document. This editor doesn't edit, delete or reflow existing text or images. You can cover something with **Whiteout** (a white box) and type over it, but the original text is still in the file underneath and can be found by search or copied, so whiteout is not a way to hide confidential information.\n\nTo change the wording of a document, edit the original Word or Google Docs file and convert it again with [Word to PDF](/word-to-pdf/). To fix page order or orientation, use [merge PDF](/merge-pdf/) or [rotate PDF](/rotate-pdf/).",
      },
      {
        heading: "Saving and flattening",
        body: "Everything you add is drawn into the page content when you press **Download PDF**, so it looks the same in every viewer and prints exactly as placed, and it can't be moved again in another program. **Flatten form fields** does the same for the form: the values become plain page content that can't be edited later. Leave it unticked if someone else still needs to fill in the form.\n\nYour original file is not changed; the download is a new file ending in `-edited.pdf`.",
      },
    ],
    faq: [
      {
        q: "Can I edit the existing text in a PDF?",
        a: "No. You can cover it with **Whiteout** and type new text on top, but the original text stays in the file underneath. To change the content properly, edit the source document.",
      },
      {
        q: "Can I fill in a PDF form?",
        a: "Yes. Fillable fields are listed below the page for you to complete. For forms without fields, place text boxes and check marks over the printed boxes.",
      },
      {
        q: "Can the output be edited later?",
        a: "Form fields stay editable unless you tick **Flatten form fields**. Text, marks and signatures you add become part of the page and can't be moved in other programs.",
      },
    ],
    related: ["signature-placement-in-pdf", "merge-pdf", "rotate-pdf", "word-to-pdf", "compress-pdf"],
    links: [
      { href: "/signature-placement-in-pdf/", anchor: "sign a PDF" },
      { href: "/merge-pdf/", anchor: "merge PDF" },
      { href: "/rotate-pdf/", anchor: "rotate PDF" },
      { href: "/word-to-pdf/", anchor: "Word to PDF" },
    ],
    appCategory: "BusinessApplication",
    features: [
      "Add text, dates, check marks, crosses and whiteout boxes",
      "Fill and optionally flatten existing form fields",
      "Drag, arrow-key or numeric positioning",
      "Add a drawn, typed or uploaded signature",
      "Runs in the browser; files are not uploaded",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
];
