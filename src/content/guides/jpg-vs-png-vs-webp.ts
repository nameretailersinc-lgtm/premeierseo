import { defineGuide, toolLink as t } from "./shared";

export const jpgVsPngVsWebp = defineGuide({
  slug: "jpg-vs-png-vs-webp",
  title: "JPG vs PNG vs WebP vs AVIF: Which Image Format to Use",
  h1: "JPG vs PNG vs WebP vs AVIF",
  metaDescription:
    "When to use JPG, PNG, WebP, AVIF or SVG, with file-size comparisons, transparency and browser support explained, plus how to convert between them.",
  summary:
    "For photos on a website, use AVIF or WebP with a JPG fallback: in our test WebP files were about a quarter smaller than JPG, and AVIF files about 40% smaller, at the same measured quality. Use JPG for photos you email, print or upload to forms, PNG for screenshots and graphics that must stay pixel-exact, and SVG for logos and icons. Transparency rules out JPG.",
  cluster: "Image optimization",
  tools: ["image-compressor", "png-to-jpg-converter", "webp-to-jpg", "avif-to-jpg-converter", "jpg-to-svg-converter"],
  body: [
    {
      heading: "Quick answer by use case",
      body: `| You have | Use | Why |
|---|---|---|
| A photo for a web page | AVIF or WebP, with JPG as fallback | Smallest files at the same quality; every current browser supports both |
| A photo to email, print or upload to a form | JPG | Accepted everywhere, including older software and strict upload portals |
| A screenshot, chart or image with small text | PNG (or lossless WebP on the web) | Lossless: sharp edges and text stay exact |
| A logo or icon | SVG, with PNG where SVG isn't accepted | Vector: sharp at any size, usually tiny |
| A graphic that needs transparency | WebP or AVIF on the web, PNG elsewhere | JPG has no transparency |
| A short animation | Video, or animated WebP/AVIF | Far smaller than GIF |
| A master copy you will edit again | The original or a lossless format | Every lossy save loses a little more detail |

The rest of this guide explains the trade-offs and shows the numbers behind them.`,
    },
    {
      heading: "What we measured",
      body: `Published comparisons rarely say how they were made, so we ran our own and recorded the method.

**Method.** Four photographs from the Kodak test set (kodim03, kodim05, kodim15 and kodim23, each 768 × 512 pixels, stored losslessly) were encoded with sharp 0.35 (libvips 8.18: mozjpeg for JPG, libwebp 1.6 for WebP, libaom 3.15 for AVIF) at every quality setting from 5 to 100. For each format we kept the smallest file whose structural similarity (SSIM) to the original reached a target: 0.95, a level where differences are visible on close inspection, and 0.98, where they are hard to spot. SSIM was computed on the brightness channel in 8 × 8 windows.

**Results** (sizes in KB of 1,000 bytes):

| Photo | JPG at 0.95 | WebP at 0.95 | AVIF at 0.95 | JPG at 0.98 | WebP at 0.98 | AVIF at 0.98 |
|---|---|---|---|---|---|---|
| kodim03 (colored caps against sky) | 34.8 | 23.9 | 18.2 | 78.5 | 65.6 | 46.1 |
| kodim05 (motorbikes, busy detail) | 77.2 | 57.5 | 49.2 | 131.1 | 95.4 | 85.0 |
| kodim15 (child with face paint) | 52.5 | 37.6 | 31.5 | 123.4 | 87.8 | 71.0 |
| kodim23 (two parrots, smooth background) | 27.4 | 22.3 | 15.5 | 93.4 | 85.1 | 64.1 |
| **All four** | **191.9** | **141.3** | **114.3** | **426.4** | **333.9** | **266.3** |

Overall, WebP was 26% smaller than JPG at the 0.95 target and 22% smaller at 0.98; AVIF was 40% and 38% smaller. Per photo the WebP saving ranged from 9% to 31% and the AVIF saving from 31% to 48%, so the content of the image matters as much as the format.

The same photos stored losslessly took 545–869 KB each as PNG and 391–571 KB as lossless WebP, between 7 and 27 times the size of the JPGs above.

Two caveats. SSIM is one measure of quality, not a judgment by human viewers, and different encoders or settings (for example, a slower AVIF speed setting) shift these numbers. The direction, though, matches Google's own published figures for WebP, which it puts at 25–34% smaller than JPEG at equal SSIM.`,
    },
    {
      heading: "Photos: JPG, WebP or AVIF",
      body: `**JPG** (JPEG) has been the default photo format since the 1990s. Its compression throws away detail the eye is least likely to miss, and its quality setting trades size for sharpness. Every device, browser, email client and form accepts it, which is still its main advantage.

**Is WebP better than JPG?** For web delivery, yes. WebP makes smaller files at the same quality (22–26% smaller overall, 9–31% per photo in our test), supports transparency and animation, and every current major browser displays it. Its drawbacks show up outside the browser: some older desktop software, upload forms and email setups still accept only JPG and PNG.

**Should I use AVIF on my website?** Usually, with a fallback. AVIF gave the smallest files in our test (38–40% overall smaller than JPG) and supports transparency, wide color gamut and HDR. Its costs: encoding is noticeably slower, which matters if you convert thousands of images on upload, and AVIF images don't render progressively, so a large one appears all at once rather than gradually. Devices that can't run a recent browser, such as iPhones stuck on iOS 15, don't display it.

The usual way to get both is the \`<picture>\` element. The browser takes the first format it supports:

\`\`\`
<picture>
  <source srcset="photo.avif" type="image/avif">
  <source srcset="photo.webp" type="image/webp">
  <img src="photo.jpg" alt="Describe the photo" width="1200" height="800">
</picture>
\`\`\`

Many image CDNs and frameworks do the same automatically by reading the browser's \`Accept\` header. Format is only part of the saving: a photo sized to its display width saves more than any format switch.`,
    },
    {
      heading: "Graphics and transparency: PNG, WebP, SVG",
      body: `**When is PNG the right choice?** When every pixel must survive exactly: screenshots, UI mock-ups, diagrams, charts, images with small text, and images you will edit again. PNG compression is lossless, and it supports full transparency. It is a poor choice for photos: our four test photos averaged 708 KB as PNG, against tens of kilobytes as JPG.

Graphics with gradients and soft shadows sit in between. We converted the hero illustration on our own homepage (270 × 237 pixels, with a transparent background, glows and small text; 84.5 KB as an optimized PNG):

| Version | Size |
|---|---|
| PNG, as published | 84.5 KB |
| PNG reduced to a 256-color palette | 33.0 KB |
| WebP lossless | 58.5 KB |
| AVIF lossless | 67.7 KB |
| WebP lossy, quality 85, with transparency | 9.5 KB |
| AVIF lossy, quality 60, with transparency | 6.3 KB |
| JPG quality 85 (transparency flattened to white) | 13.0 KB |

Lossy WebP and AVIF kept the transparency at a ninth of the PNG's size or less, but they soften fine text, so zoom in before you switch. The palette PNG is the safe middle ground where WebP isn't accepted.

**SVG** is different in kind: it describes shapes rather than pixels, so a logo stays sharp at any size and often weighs a few kilobytes. If you only have a logo as a JPG, the ${t("jpg-to-svg-converter", "JPG to SVG converter")} traces it into vector paths; that works for flat logos and line art, not for photos.

JPG can't store transparency at all. Converting a transparent PNG with the ${t("png-to-jpg-converter", "PNG to JPG converter")} fills the transparent areas with a background color, so pick one that matches where the image will sit.`,
    },
    {
      heading: "Browser and app support",
      body: `As of October 2026, according to MDN's compatibility data:

| Format | Current Chrome, Edge, Firefox, Safari | Notes |
|---|---|---|
| JPG | Yes | Universal, including email and print |
| PNG | Yes | Universal |
| GIF | Yes | Universal, but large; 256 colors per frame |
| SVG | Yes | Not accepted by most upload forms or by some email clients |
| WebP | Yes | Safari has supported it since version 14 |
| AVIF | Yes | Safari since version 16.1; the last major browser to add it was Edge |
| HEIC | Mostly no | The iPhone camera's format; convert before sharing |

Browser support is now the easy part. The gaps are elsewhere: government and job portals that accept only JPG or PNG, older image editors and office software, and email clients. If a recipient can't open a WebP or AVIF, convert it back: ${t("webp-to-jpg", "WebP to JPG")} and ${t("avif-to-jpg-converter", "AVIF to JPG")} both run in the browser.`,
    },
    {
      heading: "Converting between formats",
      body: `Converting is easy; converting without losing quality or growing the file takes a little care:

1. **Lossy to lossless doesn't restore anything.** Saving a JPG as PNG keeps its compression artifacts and usually makes the file several times larger. Convert to PNG only if you need to edit it losslessly from here on.
2. **Each lossy save loses a bit more.** Go from the original or a lossless master to each output format, rather than chaining JPG to WebP to AVIF.
3. **Transparency needs a decision.** PNG, WebP and AVIF keep it; JPG needs a background color.
4. **Check color and metadata.** Photos from phones and cameras may carry a color profile and EXIF data (location, camera, rotation). Converters may drop or rewrite it, which is often what you want for privacy but can shift colors slightly.
5. **Resize first, then convert and compress.** Pixel count drives file size more than format does.

For web images, the ${t("image-compressor", "image compressor")} can resize, convert to WebP and compress in one pass, with a before-and-after preview so you can judge the quality setting yourself.`,
    },
  ],
  sources: [
    { label: "MDN: Image file type and format guide", url: "https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types" },
    { label: "Google for Developers: An image format for the Web (WebP)", url: "https://developers.google.com/speed/webp" },
    { label: "Alliance for Open Media: AV1 Image File Format (AVIF) specification", url: "https://aomediacodec.github.io/av1-avif/" },
    { label: "W3C: Portable Network Graphics (PNG) Specification, Third Edition", url: "https://www.w3.org/TR/png-3/" },
    { label: "W3C: Scalable Vector Graphics (SVG) 2", url: "https://www.w3.org/TR/SVG2/" },
    { label: "Wang, Bovik, Sheikh and Simoncelli (2004): Image quality assessment, from error visibility to structural similarity (SSIM)", url: "https://doi.org/10.1109/TIP.2003.819861" },
    { label: "Kodak Lossless True Color Image Suite (test photos)", url: "https://r0k.us/graphics/kodak/" },
    { label: "sharp image library (encoders used in the test)", url: "https://sharp.pixelplumbing.com/" },
  ],
});
