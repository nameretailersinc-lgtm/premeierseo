import { defineGuide, toolLink as t } from "./shared";

export const reducePhotoSizeInKb = defineGuide({
  slug: "reduce-photo-size-in-kb",
  title: "How to Reduce Photo Size in KB for Online Forms",
  h1: "How to reduce a photo's size in KB for online forms",
  metaDescription:
    "Why forms reject photos, what KB, pixel and DPI limits mean, and step-by-step ways to hit 10KB, 20KB, 50KB or 100KB without a blurry result.",
  summary:
    "An upload form checks up to three things: the pixel dimensions, the file size in KB and the format, which is almost always JPG. Crop the photo to the required shape, resize it to the exact pixels, then lower the JPG quality until the file fits. The smaller the KB limit, the fewer pixels you can keep sharp, so resize before you compress.",
  cluster: "Image optimization",
  tools: [
    "free-crop-image-online",
    "photo-resizer-in-kb",
    "reduce-image-size-in-kb",
    "compress-image-to-20kb",
    "compress-image-to-50kb",
    "mb-to-kb-converter",
  ],
  body: [
    {
      heading: "KB vs pixels vs DPI: what the form is asking for",
      body: `Most rejection messages come from mixing up three different measurements:

| Requirement | Example | What it controls |
|---|---|---|
| File size | "20 KB to 50 KB" | Bytes on disk. Lowered by compression or fewer pixels. |
| Dimensions | "200 × 230 pixels" | Width × height of the image. Width comes first. |
| DPI | "300 DPI" | Only converts mm, cm or inches into pixels. |

**KB** means kilobytes. Most portals count 1 KB as 1,000 bytes, but Windows Explorer shows sizes in units of 1,024 bytes and still labels them KB, so the same file can look like 51 KB on one screen and 50 KB on another. A file under 50,000 bytes passes either reading. A phone photo of 3.2 MB is 3,200 KB (or about 3,125 KB in 1,024-byte units); the ${t("mb-to-kb-converter", "MB to KB converter")} shows both.

**Pixels** are what you see. "200 × 230" means 200 pixels wide and 230 tall, a portrait box slightly taller than it is wide.

**DPI** matters only when the form gives a physical size. The conversion is pixels = mm ÷ 25.4 × DPI, so a 35 × 45 mm photo at 300 DPI is 413 × 531 pixels. Changing the DPI number stored in a JPG on its own changes neither the pixel count nor the file size.`,
    },
    {
      heading: "How many pixels fit in 20KB or 50KB",
      body: `A JPG photo at medium quality needs very roughly 1–2 bits per pixel, and detailed scenes need more than smooth ones. That is why a 12-megapixel phone photo (4,032 × 3,024 = 12.2 million pixels) is usually 1.5–3 MB, and why a 20 KB limit (160,000 bits) leaves room for somewhere between 80,000 and 160,000 pixels, roughly 350 × 230 up to 490 × 330.

To check this, we encoded two standard test photographs from the Kodak image set (768 × 512 pixels: kodim23, a smooth close-up of two parrots, and kodim05, a detailed street scene with motorbikes) as JPG at quality 75, using the mozjpeg encoder in sharp 0.35. Sizes are in KB of 1,000 bytes:

| Dimensions | Smooth photo (kodim23) | Detailed photo (kodim05) |
|---|---|---|
| 768 × 512 | 40.9 KB | 100.0 KB |
| 600 × 400 | 27.3 KB | 66.8 KB |
| 480 × 320 | 19.3 KB | 45.4 KB |
| 360 × 240 | 12.3 KB | 27.0 KB |

Two things follow. At the same dimensions, a busy photo can need more than twice the bytes of a plain one, so there is no single "right" size for 20 KB. And squeezing too many pixels into a small limit forces the quality down: to fit 20 KB at full 768 × 512, the detailed photo had to drop to quality 9, which looks blocky, while at 360 × 240 it fitted at quality 57. Your browser's encoder will give slightly different numbers, but the pattern holds.`,
    },
    {
      heading: "Step 1: crop to the right shape",
      body: `If the form gives dimensions, crop first so the photo has the same aspect ratio, otherwise resizing will stretch the face or add borders.

1. Work out the ratio: 200 × 230 is width ÷ height = 0.87. A portrait phone photo of 3,024 × 4,032 is 0.75, so it is too tall.
2. Keep the full width and cut the height to 3,024 ÷ 200 × 230 ≈ 3,478 pixels, removing the extra from above the head and below the shoulders.
3. Place the face where the form's sample shows it, usually centered with some space above the hair.

The ${t("free-crop-image-online", "crop tool")} has 1:1, 3:4 and 35 × 45 mm presets and numeric fields if you prefer to type the box. Crop generously around signatures and documents too: every strip of empty background costs bytes later.`,
    },
    {
      heading: "Step 2: resize the dimensions",
      body: `Now scale the cropped photo down to the exact pixel size. Going from 3,024 × 3,478 to 200 × 230 throws away over 99% of the pixels, which is fine: the form will only ever display it at that size.

If the form states both dimensions and a KB range, the ${t("photo-resizer-in-kb", "photo resizer in KB")} does steps 1 to 3 in one pass: enter the width, height and unit (with the DPI for mm or cm), set the maximum and minimum KB, and choose **Crop to fit**. Its crop is centered, so crop by hand first if the face is off to one side.

Never enlarge a small photo to meet a minimum dimension. Upscaling adds pixels but no detail, and it makes the file bigger without making it sharper. Take or scan the photo again at a higher resolution instead.`,
    },
    {
      heading: "Step 3: compress to the KB limit",
      body: `With the dimensions fixed, file size is controlled by JPG quality. Lower quality removes fine detail first, then produces visible 8 × 8 pixel blocks and color smearing.

- If the form only states a maximum, use ${t("reduce-image-size-in-kb", "reduce image size in KB")} and type the limit, or the fixed pages to ${t("compress-image-to-20kb", "compress an image to 20KB")} or ${t("compress-image-to-50kb", "compress a photo to 50KB")}. They search for the highest quality that fits and reduce the dimensions only when quality alone can't get there.
- For 10 KB, which is usually a signature, ${t("compress-image-to-10kb", "compress to 10KB")} expects small dimensions from the start.
- If the form states a range, aim near the top of it. More bytes means a sharper photo.

**Watch the minimum.** Small boxes can make the lower limit the hard part. In our test, the smooth 768 × 512 photo cropped and resized to 200 × 230 was 18.0 KB even at quality 95, under a 20 KB minimum; it needed quality 98 (26.1 KB). The detailed photo passed at quality 90 (25.2 KB). If a small photo comes out under the minimum, raise the quality rather than the dimensions.

**Why is my photo blurry after compressing?** Usually because the dimensions were kept large and the quality fell very low to compensate, or because a small image was enlarged. Fewer pixels at good quality looks better than many pixels at quality 10. Always compress from the original file: re-saving a JPG that was already compressed stacks the damage.`,
    },
    {
      heading: "Signatures and scanned documents",
      body: `Signature uploads are often 10–20 KB at sizes like 140 × 60 pixels. Sign with a dark pen on plain white paper, photograph it square-on in daylight, crop tightly and convert to grayscale. Color carries no information in a signature, and removing paper tint and camera color noise leaves more of the budget for clean strokes. If the ink looks faint, photograph it again with more light; compression can't recover contrast the camera didn't capture.

For certificates and ID documents uploaded as images, 150 DPI is a sensible scan resolution: an A4 page then measures about 1,240 × 1,754 pixels, which keeps normal print readable. Grayscale helps here too. If the form wants a PDF rather than a JPG, see [how to reduce PDF file size](/blog/reduce-pdf-file-size/).`,
    },
    {
      heading: "Why a portal still rejects your photo",
      body: `When the file looks right but the upload fails, check these in order:

1. **Dimensions off by a pixel.** Some validators need 200 × 230 exactly, not 200 × 229.
2. **Size near the limit.** 50.9 KB in Windows can be 52,100 bytes, over a 50,000-byte check. Aim a little under.
3. **Below the minimum.** See step 3; raise the quality.
4. **Wrong real format.** Renaming photo.heic or photo.png to photo.jpg doesn't convert it, and many portals read the file's contents. Convert iPhone photos with the ${t("heic-to-jpg-converter", "HEIC to JPG converter")} first.
5. **Extension.** A few portals accept .jpg but not .jpeg, or reject names with spaces. Rename to something like photo.jpg.
6. **Sideways photo.** Phones often store rotation as a metadata flag. A portal that ignores it shows the photo on its side. The image tools on this site apply the flag and save the pixels upright.
7. **Content checks.** Face size, background color, glasses or a missing border are rules about the photo itself. No resizing fixes these; retake the photo against a plain light background.

Rules differ between exams, employers and governments and change between years, so always copy the numbers from the current notice of the form you are filling in rather than from a general list.`,
    },
  ],
  sources: [
    { label: "NIST: Prefixes for binary multiples (kilo vs kibi)", url: "https://physics.nist.gov/cuu/Units/binary.html" },
    { label: "ITU-T Recommendation T.81: JPEG baseline compression (W3C copy)", url: "https://www.w3.org/Graphics/JPEG/itu-t81.pdf" },
    { label: "Kodak Lossless True Color Image Suite (test photos kodim05 and kodim23)", url: "https://r0k.us/graphics/kodak/" },
    { label: "sharp image library (encoder used for the size tests)", url: "https://sharp.pixelplumbing.com/" },
    { label: "MDN: Image file type and format guide", url: "https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types" },
  ],
});
