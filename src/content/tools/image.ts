import type { ToolDef } from "@/lib/types";

/*
 * Image tools. Titles, H1s, descriptions and H2 outlines follow docs/keyword-map.json.
 * Every tool runs in the browser (canvas, plus lazily loaded upng-js, heic2any, imagetracerjs, gifenc, fflate).
 * Dimension estimates for size targets are computed from an explicit assumption (medium-quality JPG at
 * roughly 1–2 bits per pixel, 4:3 photo) and are labelled as approximate; the tool reports real results.
 */

const COMMON = {
  category: "imaging-tools",
  archetype: "file",
  processing: "browser",
  appCategory: "MultimediaApplication",
  indexable: true,
  updated: "2026-09-30",
} as const;

const SIZE_STEPS = [
  "Press **Choose images** (or drag files in, or paste with Ctrl+V). Several images can be added at once.",
  "Each image is compressed straight away. Optional: set **Max width** or **Max height** if the image must also fit a pixel size.",
  "Check the result row: new size in KB and exact bytes, dimensions and quality. Press **Preview** for a before/after comparison.",
  "Press **Download** on a row, or **Download all (ZIP)** for every file.",
];

const SIZE_FEATURES = (kb: string) => [
  `Fixed ${kb} target, counted as 1,000-byte KB (1,024-byte option)`,
  "Quality lowered first, dimensions reduced only when needed",
  "Batch processing with Download all (ZIP)",
  "Before/after preview with exact byte count and dimensions",
  "Accepts JPG, PNG, WebP, HEIC and AVIF",
];

export const IMAGE_TOOLS: ToolDef[] = [
  /* ------------------------------------------------------------------ size: custom */
  {
    ...COMMON,
    id: "reduce-image-size-in-kb",
    path: "/reduce-image-size-in-kb/",
    name: "Reduce Image Size in KB",
    h1: "Reduce Image Size in KB",
    title: "Reduce Image Size in KB – Compress to Any Target Size",
    metaDescription:
      "Set a target such as 20KB, 50KB, 100KB or 500KB and the tool finds the best quality and dimensions that fit. For form uploads, email and websites.",
    summary:
      "Enter a file-size limit in KB or MB and get each image back at or under it, at the highest quality that fits. Works on JPG, PNG, WebP, HEIC and AVIF, several images at a time.",
    subgroup: "size",
    card: "Compress photos to any KB or MB limit you type in.",
    widget: "image-target-size",
    config: { mode: "custom" },
    aliases: [
      "reduce photo size in kb",
      "image size reducer in kb",
      "compress image to kb",
      "resize image in kb",
      "compress image to specific size",
      "reduce jpg size in kb",
      "photo size reducer",
      "reduce pic size",
      "kb reducer",
    ],
    keywords: ["form upload", "file size limit", "target size", "mb to kb"],
    limits: [
      "Output is JPG unless the image is transparent (then PNG) or you choose another format under More options.",
      "Very small targets reduce the dimensions, so small text in a photo can become unreadable.",
    ],
    steps: [
      "Type the limit into **Target size** and choose **KB** or **MB**, or press a quick button such as **50 KB**.",
      "Press **Choose images**, drag images in, or paste one with Ctrl+V. Each image is compressed straight away.",
      "Read the result row: size in KB and exact bytes, dimensions and quality. Press **Preview** to compare before and after.",
      "Press **Download** on a row or **Download all (ZIP)**. Change the target at any time and the images update.",
    ],
    example: {
      title: "How the limit is counted",
      input: "Target size: 50 KB",
      output: "Limit used: 50,000 bytes (1 KB = 1,000 bytes)\nWith 1 KB = 1,024 bytes: 51,200 bytes",
      note: "A file saved under 50,000 bytes passes both kinds of check, which is why 1,000 is the default.",
    },
    sections: [
      {
        heading: "Setting a target size",
        body: "Enter the number the form or website states, not a rounder one: if the limit is 50 KB, type 50. The quick buttons cover the most common limits from 20 KB to 1 MB.\n\nBy default 1 KB counts as 1,000 bytes, so a 50 KB target means at most 50,000 bytes. Some upload forms count 1 KB as 1,024 bytes (51,200 bytes for 50 KB); a file made with the 1,000-byte setting passes both. Switch **1 KB equals** to 1,024 bytes under **More options** only if you know the form uses binary kilobytes and want the extra quality. Every result shows its exact byte count so you can compare it with the limit yourself.",
      },
      {
        heading: "How the tool reaches the target",
        body: "1. It saves the image as a high-quality JPG. If that already fits, you get that file.\n2. If not, it searches for the highest quality that fits. The search halves the range each time, so it needs about seven tries rather than dozens.\n3. If even medium-low quality is too big, it reduces width and height in proportion and searches again. It prefers a slightly smaller picture at decent quality over a larger, blocky one.\n\nAn image that is already under the target, in the same format, is left untouched and you download the original. Press **Re-save** on that row if you still want it re-encoded, for example to remove location data. Re-saved images have their location and camera details (EXIF) removed.",
      },
      {
        heading: "When the target is too small",
        body: "Small targets force small dimensions. As a rough guide, at medium JPG quality (about 1–2 bits per pixel) the longer side of a 4:3 photo comes out around:\n\n| Target | Approximate longer side |\n|---|---|\n| 10 KB | 230–330 px |\n| 20 KB | 330–460 px |\n| 50 KB | 520–730 px |\n| 100 KB | 730–1,030 px |\n| 200 KB | 1,030–1,460 px |\n\nPlain backgrounds keep more pixels; busy scenes fewer. If you switch off **Allow smaller dimensions if needed**, only quality is lowered, and when even the lowest quality is too big the row shows the smallest file it could make with a warning. To get more out of a small target, crop away background first with the [crop tool](/free-crop-image-online/), or tick **Black and white (grayscale)** for scanned documents and signatures.",
      },
      {
        heading: "Common targets for application forms",
        body: "| Upload | Limits often seen | Tip |\n|---|---|---|\n| Signature scan | 10–20 KB | Crop tight to the ink and use grayscale |\n| Passport-style photo | 20–50 KB, sometimes up to 100 KB | Keep the face large in the frame |\n| ID or certificate scan | 100–300 KB | Grayscale saves a lot on paper documents |\n| CV or portfolio image | 200 KB–1 MB | Quality matters more than pixels |\n\nThese are typical ranges, not any organization's rules. Use the numbers printed on the form you are filling in; requirements differ and change over time. Fixed-size pages exist for the most common limits, such as [compress image to 20KB](/compress-image-to-20kb/) and [compress image to 50KB](/compress-image-to-50kb/).",
      },
      {
        heading: "KB limits vs pixel requirements",
        body: "A KB limit is about file size; a pixel requirement such as 200 × 230 px is about dimensions. They are separate checks, and a form can enforce both. This page meets the KB limit and keeps your photo's proportions. You can cap the size with **Max width** and **Max height**, but the image only fits inside them.\n\nIf the form gives exact dimensions, or a size in cm or mm, use the [photo resizer in KB](/photo-resizer-in-kb/). It crops to the required shape, sets the exact pixels and then meets the KB range.",
      },
    ],
    faq: [
      {
        q: "How do I reduce a photo from 2 MB to 100 KB?",
        a: "Enter 100, choose KB and add the photo. A 2 MB phone photo usually has to shrink as well as lose some quality to reach 100 KB; expect a longer side of roughly 700–1,000 px, which is plenty for a form or an email.",
      },
      {
        q: "Why is my image slightly under the target?",
        a: "The tool stops at the highest quality that fits, and quality changes in steps, so results usually land a few percent below the limit. Forms only check that the file is under the limit, so there is nothing to gain from hitting it exactly.",
      },
      {
        q: "Will reducing size change the dimensions?",
        a: "Only if quality alone can't reach the target and **Allow smaller dimensions if needed** is on (the default). The result row shows the new width and height. The proportions never change.",
      },
    ],
    related: ["photo-resizer-in-kb", "compress-image-to-20kb", "compress-image-to-50kb", "compress-jpeg-to-100kb", "image-compressor", "free-crop-image-online"],
    links: [
      { href: "/photo-resizer-in-kb/", anchor: "set pixel size and KB together" },
      { href: "/compress-image-to-20kb/", anchor: "compress image to 20KB" },
      { href: "/compress-image-to-50kb/", anchor: "compress image to 50KB" },
      { href: "/compress-jpeg-to-100kb/", anchor: "compress image to 100KB" },
      { href: "/compress-jpeg-to-30kb/", anchor: "compress JPEG to 30KB" },
      { href: "/blog/reduce-photo-size-in-kb/", anchor: "how to reduce photo size in KB" },
    ],
    guides: ["/blog/reduce-photo-size-in-kb/"],
    features: [
      "Any target in KB or MB, with 1,000- or 1,024-byte KB",
      "Quality searched first, dimensions reduced only when needed",
      "Batch processing with Download all (ZIP)",
      "Before/after preview with exact byte counts",
      "HEIC, PNG, WebP and AVIF input",
    ],
    priority: 1,
  },

  /* ------------------------------------------------------------------ size: pixels + KB */
  {
    ...COMMON,
    id: "photo-resizer-in-kb",
    path: "/photo-resizer-in-kb/",
    name: "Photo Resizer in KB",
    h1: "Photo Resizer in KB",
    title: "Photo Resizer in KB – Set Pixels and File Size Together",
    metaDescription:
      "Resize a photo to exact pixel dimensions and a target file size in one step, for exam and job forms that specify both (e.g. 200x230 px, 20-50KB).",
    summary:
      "Resize a photo to the exact width and height a form asks for, in pixels, mm, cm or inches, and keep the file inside a KB range such as 20–50 KB.",
    subgroup: "size",
    card: "Resize a photo to exact pixels and a KB limit in one step.",
    widget: "image-target-size",
    config: { mode: "photo" },
    aliases: [
      "passport photo resizer",
      "photo resizer",
      "resize photo in kb and pixels",
      "resize image in cm and kb",
      "signature resizer",
      "exam photo resizer",
      "resize photo to 200x230",
      "photo size reducer",
      "resize photo kb",
    ],
    keywords: ["exam form", "job portal", "signature", "dpi", "passport size"],
    limits: [
      "Output is JPG by default. Presets are common sizes, not the official rules of any exam or organization.",
      "Cropping is centered. If the face is off-center, crop the photo first.",
    ],
    steps: [
      "Enter **Width** and **Height** and choose the **Unit** (pixels, mm, cm or inches; add the **DPI** for physical units), or pick a preset under **Start from a common size**.",
      "Set **Max file size** in KB, and **Min file size** if the form gives a range.",
      "Choose what happens if the shape differs: **Crop to fit**, **Add borders** or **Stretch**.",
      "Press **Choose images**, then check the result row and press **Download**.",
    ],
    example: {
      title: "Converting a size in mm to pixels",
      input: "35 × 45 mm at 300 DPI",
      output: "413 × 531 px",
      note: "Pixels = millimetres ÷ 25.4 × DPI, rounded to the nearest whole pixel.",
    },
    sections: [
      {
        heading: "Entering width, height and KB",
        body: "Type the **Width** and **Height** from the form and choose the **Unit**. For mm, cm or inches, also enter the **DPI** (dots per inch) the form states; 300 is common for photos. The tool converts to pixels (pixels = inches × DPI, with 25.4 mm or 2.54 cm per inch) and shows the output size before you add a photo. The DPI is also written into the JPG header, which some portals read.\n\nThen set **Max file size** in KB, and **Min file size** if the form gives a range such as 20–50 KB. Because the dimensions are fixed, only JPG quality changes to meet the range. If the maximum can't be met even at the lowest quality, the row says so: raise the KB limit or use smaller dimensions.",
      },
      {
        heading: "Cropping to the required aspect ratio",
        body: "When your photo's shape differs from the box, choose under **If the photo's shape is different**:\n\n- **Crop to fit** trims the edges evenly. This is the default and what most photo forms expect.\n- **Add borders** keeps the whole photo and fills the gaps with the color set under **More options**.\n- **Stretch** forces the photo into the box and distorts faces, so avoid it for ID photos.\n\nCropping is centered. If the face isn't in the middle, [crop the photo first](/free-crop-image-online/) with its 35 × 45 mm or 3:4 preset, then resize it here.",
      },
      {
        heading: "Typical form requirements",
        body: "Forms usually state three things: dimensions (pixels or cm), a file-size range in KB, and a format, almost always JPG/JPEG. Common patterns include:\n\n- a photo of about 200 × 230 px between 20 and 50 KB\n- a signature of about 140 × 60 px between 10 and 20 KB\n- a passport-style photo of 35 × 45 mm\n\nThe presets under **Start from a common size** fill in numbers like these, but they are examples. Copy the exact figures from the form you're filling in, including any rule about a white or light background.",
      },
      {
        heading: "Signature images",
        body: "Sign in dark ink on plain white paper and photograph it square-on in good light. Crop tightly around the signature so little empty paper is left, then use the signature preset or type the form's size. Under **More options**, tick **Black and white (grayscale)**: removing color makes small files much cleaner. If the result looks faint, photograph it again with more contrast instead of lowering the quality further.",
      },
      {
        heading: "Checking the result before upload",
        body: "Each result shows the size in KB and in exact bytes, plus the pixel dimensions. Before uploading, check that:\n\n1. Width × height match the form exactly.\n2. The size is inside the range. A warning under the file means a limit couldn't be met.\n3. The file name ends in .jpg. A few portals reject .jpeg or other extensions; rename the file if so.\n4. The face fills most of the frame and is sharp in **Preview**.",
      },
    ],
    faq: [
      {
        q: "How do I resize a photo to 200x230 pixels under 50KB?",
        a: "Pick the 200 × 230 px preset, or type 200 and 230 with **pixels** as the unit and set **Max file size** to 50. Add your photo: it is cropped to the right shape, resized, and saved at the highest JPG quality under 50 KB.",
      },
      {
        q: "What if the form gives the size in cm?",
        a: "Choose **cm** or **mm** and enter the DPI the form mentions. If it doesn't mention one, 300 DPI is the usual assumption for photos. The size in pixels is shown before you add a file.",
      },
      {
        q: "Why does the portal still reject my photo?",
        a: "Usually the dimensions or format don't match exactly, or the file is below a minimum size; set **Min file size** if the form has one. Some portals also check the photo itself, such as face size or background color, which resizing can't fix.",
      },
    ],
    related: ["reduce-image-size-in-kb", "free-crop-image-online", "compress-image-to-20kb", "compress-image-to-50kb", "compress-image-to-10kb", "image-resizer"],
    links: [
      { href: "/reduce-image-size-in-kb/", anchor: "reduce image size in KB" },
      { href: "/free-crop-image-online/", anchor: "crop the photo first" },
      { href: "/compress-image-to-20kb/", anchor: "compress image to 20KB" },
      { href: "/blog/reduce-photo-size-in-kb/", anchor: "photo size guide for forms" },
    ],
    guides: ["/blog/reduce-photo-size-in-kb/"],
    features: [
      "Exact output size in pixels, mm, cm or inches with DPI",
      "Maximum and optional minimum file size in KB",
      "Crop, add borders or stretch to the required shape",
      "DPI written into the JPG header",
      "Grayscale option for signatures",
    ],
    priority: 1,
  },

  /* ------------------------------------------------------------------ size: fixed presets */
  {
    ...COMMON,
    id: "compress-image-to-10kb",
    path: "/compress-image-to-10kb/",
    name: "Compress Image to 10KB",
    h1: "Compress Image to 10KB",
    title: "Compress Image to 10KB – For Signatures and Small Photos",
    metaDescription:
      "Shrink a photo or signature scan to 10KB or less for strict upload limits. The tool lowers quality and dimensions together and shows the final size.",
    summary:
      "Get a signature scan or small photo to 10 KB (10,000 bytes) or less. The tool lowers quality first and shrinks the dimensions only as far as it has to.",
    subgroup: "size",
    card: "Shrink a signature scan or small photo to 10 KB or less.",
    widget: "image-target-size",
    config: { targetKB: 10 },
    targetKB: 10,
    media: "image",
    aliases: [
      "compress image to 10 kb",
      "10kb",
      "10 kb",
      "resize image to 10kb",
      "compress signature to 10kb",
      "photo to 10kb",
      "reduce image size to 10kb",
      "compress jpg to 10kb",
      "10kb jpeg",
      "signature 10kb",
    ],
    keywords: ["signature", "form upload", "small photo"],
    limits: ["10 KB usually means a few hundred pixels across; dimensions are reduced automatically."],
    steps: SIZE_STEPS,
    sections: [
      {
        heading: "Why 10KB usually means small dimensions",
        body: "10 KB is 10,000 bytes, a few hundredths of a percent of a typical phone photo. A JPG photo needs roughly 1–2 bits per pixel at medium quality to stay recognizable, so 10 KB holds somewhere around 40,000–80,000 pixels: about 230–330 px on the longer side of a 4:3 photo. That is why the tool reduces the dimensions for this target. A full-size photo at the lowest quality would still be far over 10 KB, and would look worse than a smaller, cleaner one.\n\nImages with plain backgrounds and few details, such as signatures, logos and line drawings, keep more pixels at 10 KB than photos do.",
      },
      {
        heading: "Signatures: crop tight, then compress",
        body: "Most 10 KB uploads are signatures. Sign with a dark pen on white paper, photograph it square-on in daylight, and crop so the signature fills the frame with only a small margin: every extra strip of paper costs bytes. Use the [crop tool](/free-crop-image-online/) first, then compress here.\n\nIf the form gives exact pixel dimensions as well as 10 KB, use the [photo resizer in KB](/photo-resizer-in-kb/) instead, so both the size and the dimensions are right.",
      },
      {
        heading: "Grayscale for scanned signatures",
        body: "Open **More options** and tick **Black and white (grayscale)**. A signature has no useful color, and paper tint and camera color noise waste bytes. In grayscale the same 10 KB buys more pixels and cleaner strokes.\n\nIf the signature is faint, photograph it again with more light or a darker pen. Compression can't restore ink the camera didn't capture, and lowering the quality only makes faint strokes blotchier.",
      },
      {
        heading: "If the form accepts 10-20KB",
        body: "When the form allows 10 to 20 KB, aim for the top of the range for a sharper result: use [compress image to 20KB](/compress-image-to-20kb/), or the photo resizer in KB with a minimum and a maximum. If the form only states a maximum of 10 KB, this page is all you need.\n\nResults are counted with 1 KB = 1,000 bytes, so a result under 10 KB here is also under a 10,240-byte limit.",
      },
    ],
    faq: [
      {
        q: "Can a color photo be 10KB?",
        a: "Yes, but only at small dimensions, typically a few hundred pixels across. A face stays recognizable at that size; fine detail and small text don't.",
      },
      {
        q: "What size should a signature image be?",
        a: "Whatever the form states; some ask for around 140 × 60 px. Enter the exact numbers in the [photo resizer in KB](/photo-resizer-in-kb/). If only a KB limit is given, crop tight and let this page choose the dimensions.",
      },
      {
        q: "Why is the result blurry?",
        a: "At 10 KB the image has only a few hundred pixels across, and the preview enlarges it to fill the box. Crop away empty space or use grayscale so more of the 10 KB goes on the subject.",
      },
    ],
    related: ["compress-image-to-20kb", "photo-resizer-in-kb", "free-crop-image-online", "reduce-image-size-in-kb", "compress-jpeg-to-30kb"],
    links: [
      { href: "/compress-image-to-20kb/", anchor: "compress image to 20KB" },
      { href: "/photo-resizer-in-kb/", anchor: "photo resizer in KB" },
      { href: "/free-crop-image-online/", anchor: "crop image" },
      { href: "/reduce-image-size-in-kb/", anchor: "other target sizes" },
    ],
    features: SIZE_FEATURES("10 KB"),
    priority: 2,
  },
  {
    ...COMMON,
    id: "compress-image-to-20kb",
    path: "/compress-image-to-20kb/",
    name: "Compress Image to 20KB",
    h1: "Compress Image to 20KB",
    title: "Compress Image to 20KB – Resize Photo to 20KB Online",
    metaDescription:
      "Reduce a photo to 20KB or less for application forms and ID uploads. The tool balances quality and dimensions automatically and shows the exact size.",
    summary:
      "Compress or resize a photo to 20 KB or less for application forms and ID uploads. Quality is lowered first and the dimensions only as much as needed; you see the exact size in bytes.",
    subgroup: "size",
    card: "Compress or resize a photo to 20 KB or less.",
    widget: "image-target-size",
    config: { targetKB: 20 },
    targetKB: 20,
    media: "image",
    aliases: [
      "resize image to 20kb",
      "20kb",
      "20 kb",
      "compress photo to 20kb",
      "reduce image size to 20kb",
      "compress jpg to 20kb",
      "20kb photo",
      "passport photo 20kb",
      "image to 20kb",
      "resize photo to 20kb",
    ],
    keywords: ["application form", "id photo", "signature"],
    limits: ["Most phone photos are reduced to a few hundred pixels across to fit in 20 KB."],
    steps: SIZE_STEPS,
    sections: [
      {
        heading: "Getting a photo under 20KB",
        body: "Add one or more photos and each is processed straight away. The tool saves a JPG at the highest quality that fits in 20,000 bytes. If quality alone isn't enough, it reduces width and height in proportion, aiming for a clean result at medium quality rather than a larger, blocky one. The row shows the new size in KB and bytes, the dimensions and the quality used. Photos already under 20 KB in the same format are left as they are.\n\nIf the image must also fit a pixel size, fill in **Max width** and **Max height**: it will fit inside them and still be under 20 KB.",
      },
      {
        heading: "Dimensions that work at 20KB",
        body: "At medium JPG quality (about 1–2 bits per pixel), a 4:3 photo at 20 KB typically ends up around 330–460 px on the longer side. A head-and-shoulders portrait against a plain wall sits at the top of that range; a group photo or a busy street at the bottom. That is enough for an ID thumbnail or a form photo, which is usually shown small.\n\nIf the form specifies exact pixels, such as 200 × 230 px, use the [photo resizer in KB](/photo-resizer-in-kb/), which sets the dimensions and the file size together.",
      },
      {
        heading: "Photo vs signature uploads",
        body: "Photos and signatures need different treatment. For a photo, keep the color and crop so the face fills most of the frame. For a signature, crop tightly and tick **Black and white (grayscale)** under **More options**: in grayscale the same 20 KB gives a larger, crisper signature. For forms that cap signatures at 10 KB, see [compress image to 10KB](/compress-image-to-10kb/).",
      },
      {
        heading: "If you need between 20KB and 50KB",
        body: "When a form allows 20 to 50 KB, more bytes mean a sharper photo, so aim for the top of the range with [compress image to 50KB](/compress-image-to-50kb/). If the form also sets a minimum, such as \"at least 20 KB\", a file compressed to 19 KB would be rejected: use the photo resizer in KB and fill in **Min file size**.",
      },
    ],
    faq: [
      {
        q: "What dimensions work for a 20KB photo?",
        a: "Roughly 330–460 px on the longer side for a typical photo at medium JPG quality. The tool finds the exact size for your photo and shows it in the result.",
      },
      {
        q: "Resize vs compress: what's the difference?",
        a: "Compressing lowers the quality setting and keeps the pixels; resizing reduces the pixel dimensions. Getting a phone photo to 20 KB needs both, which this tool does automatically, so \"resize image to 20KB\" and \"compress image to 20KB\" are the same job.",
      },
      {
        q: "Why does my 20KB photo look soft?",
        a: "It has far fewer pixels than the original, and the preview enlarges it. Crop away background before compressing so the face gets more of the pixels.",
      },
    ],
    related: ["compress-image-to-10kb", "compress-image-to-50kb", "photo-resizer-in-kb", "reduce-image-size-in-kb", "free-crop-image-online"],
    links: [
      { href: "/compress-image-to-10kb/", anchor: "compress image to 10KB" },
      { href: "/compress-image-to-50kb/", anchor: "compress image to 50KB" },
      { href: "/photo-resizer-in-kb/", anchor: "photo resizer in KB" },
      { href: "/reduce-image-size-in-kb/", anchor: "other target sizes" },
    ],
    features: SIZE_FEATURES("20 KB"),
    priority: 1,
  },
  {
    ...COMMON,
    id: "compress-jpeg-to-30kb",
    path: "/compress-jpeg-to-30kb/",
    name: "Compress JPEG to 30KB",
    h1: "Compress JPEG to 30KB",
    title: "Compress JPEG to 30KB – Get Any Image Under 30KB",
    metaDescription:
      "Get a JPG or any other image under 30KB for thumbnails and upload forms. The tool scales and re-encodes as JPEG until it fits, then shows the size.",
    summary:
      "Get a JPG, PNG, WebP or HEIC image under 30 KB for thumbnails and upload forms. It is saved as a JPEG at the highest quality that fits, and scaled down only if needed.",
    subgroup: "size",
    card: "Get a JPG or any other image under 30 KB.",
    widget: "image-target-size",
    config: { targetKB: 30, format: "jpeg" },
    targetKB: 30,
    media: "image",
    aliases: [
      "compress image to 30kb",
      "30kb",
      "30 kb",
      "resize image to 30kb",
      "reduce jpg to 30kb",
      "jpeg 30kb",
      "compress photo to 30kb",
      "jpg under 30kb",
      "30kb photo",
    ],
    keywords: ["thumbnail", "form upload", "jpeg"],
    limits: ["Output is JPEG; transparent areas are filled with white unless you choose PNG under More options."],
    steps: SIZE_STEPS,
    sections: [
      {
        heading: "Getting an image under 30KB",
        body: "Add JPG, PNG, WebP or HEIC images. Each is saved as a JPEG at the highest quality that fits in 30,000 bytes, with the dimensions reduced in proportion only when quality alone isn't enough. A JPEG that is already under 30 KB is returned unchanged; press **Re-save** if you want it re-encoded anyway.\n\n30 KB suits small profile photos, thumbnails and forms with a 30 KB cap. It gives noticeably more room than 20 KB for a face photo.",
      },
      {
        heading: "Dimensions that work at 30KB",
        body: "At medium quality (about 1–2 bits per pixel), expect roughly 400–570 px on the longer side for a 4:3 photo. Simple images, such as a face against a plain wall, a logo or a grayscale document, keep more pixels; detailed scenes fewer.\n\nSet **Max width** or **Max height** if the image must be no larger than a particular size. It still comes out under 30 KB, and usually at a higher quality because there are fewer pixels to store.",
      },
      {
        heading: "Why the output is JPEG",
        body: "JPEG is the format upload forms accept almost everywhere, and for photos it is much smaller than PNG: PNG is lossless, so a PNG photo is usually several times larger at the same dimensions. PNG, WebP and HEIC input is therefore converted to JPEG here, and transparent areas are filled with white (change the color under **More options**).\n\nIf you must keep transparency, choose PNG in **Output format**. The tool then reduces the number of colors and, if needed, the dimensions to fit 30 KB.",
      },
      {
        heading: "Checking the result",
        body: "Each result row shows the size in KB and exact bytes, the width and height, and the JPEG quality used. Press **Preview** to compare it with the original side by side. If a form still rejects it, check whether it also requires exact dimensions or a minimum size; the [photo resizer in KB](/photo-resizer-in-kb/) handles both.",
      },
    ],
    faq: [
      {
        q: "Can I compress a PNG to 30KB?",
        a: "Yes. It is converted to JPEG, which is how most PNG photos get under 30 KB. Transparent areas become white unless you choose PNG output under **More options**.",
      },
      {
        q: "What dimensions fit in 30KB?",
        a: "Around 400–570 px on the longer side for a typical photo at medium quality, more for simple images. The result shows the exact dimensions.",
      },
      {
        q: "Why is my image under 30KB but still rejected?",
        a: "The form may also check the dimensions, a minimum size or the file extension (.jpg vs .jpeg). Size is not usually the problem: results are measured with 1 KB = 1,000 bytes, which also passes 1,024-byte checks.",
      },
    ],
    related: ["compress-image-to-20kb", "compress-image-to-50kb", "reduce-image-size-in-kb", "photo-resizer-in-kb", "compress-jpg-image"],
    links: [
      { href: "/compress-image-to-20kb/", anchor: "compress image to 20KB" },
      { href: "/compress-image-to-50kb/", anchor: "compress image to 50KB" },
      { href: "/reduce-image-size-in-kb/", anchor: "other target sizes" },
    ],
    features: SIZE_FEATURES("30 KB"),
    priority: 2,
  },
  {
    ...COMMON,
    id: "compress-image-to-50kb",
    path: "/compress-image-to-50kb/",
    name: "Compress Image to 50KB",
    h1: "Compress Image to 50KB",
    title: "Compress Image to 50KB – Resize Photo to 50KB Online",
    metaDescription:
      "Reduce a photo to 50KB or less for application forms, job portals and ID uploads. Quality and dimensions are adjusted automatically to fit.",
    summary:
      "Compress or resize a photo to 50 KB or less for application forms, job portals and ID uploads, keeping it as sharp as the limit allows. Several photos can be done at once.",
    subgroup: "size",
    card: "Compress or resize a photo to 50 KB or less.",
    widget: "image-target-size",
    config: { targetKB: 50 },
    targetKB: 50,
    media: "image",
    aliases: [
      "resize image to 50kb",
      "50kb",
      "50 kb",
      "compress photo to 50kb",
      "reduce image size to 50kb",
      "compress jpg to 50kb",
      "50kb passport photo",
      "image to 50kb",
      "resize photo to 50kb",
    ],
    keywords: ["government form", "job portal", "id photo"],
    limits: ["Large photos are usually reduced to several hundred pixels across to fit in 50 KB."],
    steps: SIZE_STEPS,
    sections: [
      {
        heading: "Getting a photo under 50KB",
        body: "Add one or more photos, including HEIC photos from an iPhone. Each is saved as a JPG at the highest quality that fits in 50,000 bytes; if quality alone can't get there, the width and height are reduced in proportion. The result row shows the size in KB and exact bytes, the dimensions and the quality used, and **Preview** shows the original and the result side by side.\n\nA photo that is already under 50 KB in the same format is left unchanged.",
      },
      {
        heading: "Dimensions that work at 50KB",
        body: "At medium JPG quality (about 1–2 bits per pixel), a 4:3 photo at 50 KB comes out around 520–730 px on the longer side. That is enough for a sharp passport-style photo on screen and for most profile pictures. If you only need a small photo, set **Max width**: fewer pixels leave room for a higher quality, which often looks better than a larger image at lower quality.\n\nFor exact dimensions, such as 200 × 230 px, use the [photo resizer in KB](/photo-resizer-in-kb/).",
      },
      {
        heading: "Forms that ask for 20-50KB",
        body: "A range means both limits are checked. This page guarantees the maximum. A typical photo lands just under 50 KB, well above 20 KB, but a very simple or very small image can come out smaller than the minimum. If the result is under 20 KB and the form has a minimum, use the photo resizer in KB with **Min file size** set to 20: it keeps the quality high enough to stay inside the range. For a strict 20 KB cap, use [compress image to 20KB](/compress-image-to-20kb/).",
      },
      {
        heading: "Keeping faces sharp",
        body: "- Crop before compressing so the face fills most of the frame; the bytes then go on the face, not the wall behind it.\n- Take the photo in daylight. Noise from dim indoor photos is expensive to compress and turns blotchy.\n- Start from the original photo each time. Every JPG save loses a little more detail, so compressing an already-compressed file twice gives a worse result than compressing the original once.",
      },
    ],
    faq: [
      {
        q: "What resolution fits in 50KB?",
        a: "Roughly 520–730 px on the longer side for a typical photo at medium JPG quality, more for plain backgrounds. The result shows the exact dimensions of your file.",
      },
      {
        q: "Is resize the same as compress?",
        a: "Not quite: resizing changes the pixel dimensions, compressing changes the quality setting. For a 50 KB limit you often need both, so this page does both, which is why \"resize image to 50KB\" and \"compress image to 50KB\" give the same result here.",
      },
      {
        q: "Why was my 50KB photo rejected?",
        a: "Check the dimensions, any minimum size, the format and the background rules on the form. File size is rarely the issue: results are counted with 1 KB = 1,000 bytes, stricter than the 1,024 some portals use.",
      },
    ],
    related: ["compress-image-to-20kb", "compress-jpeg-to-100kb", "photo-resizer-in-kb", "reduce-image-size-in-kb", "free-crop-image-online"],
    links: [
      { href: "/compress-image-to-20kb/", anchor: "compress image to 20KB" },
      { href: "/compress-jpeg-to-100kb/", anchor: "compress image to 100KB" },
      { href: "/photo-resizer-in-kb/", anchor: "photo resizer in KB" },
      { href: "/reduce-image-size-in-kb/", anchor: "other target sizes" },
    ],
    features: SIZE_FEATURES("50 KB"),
    priority: 1,
  },
  {
    ...COMMON,
    id: "compress-jpeg-to-100kb",
    path: "/compress-jpeg-to-100kb/",
    name: "Compress JPEG to 100KB",
    h1: "Compress JPEG to 100KB",
    title: "Compress JPEG to 100KB – Resize Any Image to 100KB",
    metaDescription:
      "Get a JPG or any other image under 100KB for job portals, forms and email while keeping it sharp. Quality and dimensions are tuned automatically.",
    summary:
      "Compress or resize a JPG, PNG, WebP or HEIC image to 100 KB or less for job portals, forms and email. The result is a JPEG at the highest quality that fits.",
    subgroup: "size",
    card: "Compress or resize any image to 100 KB or less.",
    widget: "image-target-size",
    config: { targetKB: 100, format: "jpeg" },
    targetKB: 100,
    media: "image",
    aliases: [
      "compress image to 100kb",
      "100kb",
      "100 kb",
      "resize image to 100kb",
      "reduce photo size to 100kb",
      "compress jpg to 100kb",
      "jpeg 100kb",
      "resume photo 100kb",
      "image to 100kb",
      "resize photo to 100kb",
    ],
    keywords: ["job portal", "resume", "email", "jpeg"],
    limits: ["Output is JPEG; transparent areas are filled with white unless you choose PNG under More options."],
    steps: SIZE_STEPS,
    sections: [
      {
        heading: "Getting an image under 100KB",
        body: "Add one or more images. Each is saved as a JPEG at the highest quality that fits in 100,000 bytes; when quality alone isn't enough, width and height are reduced in proportion. JPEGs that are already under 100 KB are returned unchanged. Each result shows the size in KB and exact bytes, the dimensions and the quality used.\n\n100 KB is a comfortable limit for a profile or CV photo: it usually allows good quality at a size that looks sharp on screen.",
      },
      {
        heading: "Dimensions that work at 100KB",
        body: "At medium quality (about 1–2 bits per pixel), a 4:3 photo at 100 KB comes out around 730–1,030 px on the longer side. Portraits with plain backgrounds can be larger. If the image is displayed small, for example as a profile picture, set **Max width** to around 600 px: the file stays under 100 KB at a higher quality.",
      },
      {
        heading: "Keeping detail sharp",
        body: "- Crop to the subject first so no bytes go on empty background.\n- Compress the original, not a copy that has already been compressed. Each JPEG save discards a little more detail.\n- Don't enlarge small images to reach a size: extra pixels add bytes but no detail.\n- For scanned documents, tick **Black and white (grayscale)** under **More options**; text stays legible at larger dimensions.\n\nPress **Preview** and look at edges and faces. Blocky patches or halos around edges mean quality is too low for those dimensions; a smaller **Max width** usually fixes it.",
      },
      {
        heading: "PNG and HEIC input",
        body: "iPhone HEIC photos are decoded in your browser (natively in Safari, otherwise by a decoder that loads the first time you need it) and saved as JPEG. PNG screenshots and graphics are converted to JPEG too, with transparent areas filled with white. For screenshots full of small text, check the preview: JPEG can blur sharp text edges, and the [PNG compressor](/compress-png-image/) may give a cleaner result.",
      },
    ],
    faq: [
      {
        q: "How do I reduce a photo to 100KB?",
        a: "Add it here. The tool picks the highest JPEG quality under 100,000 bytes and reduces the dimensions only if it has to. Download the result, or several at once as a ZIP.",
      },
      {
        q: "Will 100KB be enough for a clear photo?",
        a: "For a face or profile photo, yes: around 730–1,030 px on the longer side at medium quality is plenty for screens and forms. It isn't enough for printing a large photo.",
      },
      {
        q: "Can I compress a PNG to 100KB?",
        a: "Yes. It is converted to JPEG, which is much smaller for photos. To keep transparency, choose PNG under **More options**; the tool then reduces colors and, if needed, dimensions.",
      },
    ],
    related: ["compress-image-to-50kb", "compress-jpeg-to-200kb", "reduce-image-size-in-kb", "compress-jpg-image", "photo-resizer-in-kb"],
    links: [
      { href: "/compress-image-to-50kb/", anchor: "compress image to 50KB" },
      { href: "/compress-jpeg-to-200kb/", anchor: "compress JPEG to 200KB" },
      { href: "/reduce-image-size-in-kb/", anchor: "other target sizes" },
      { href: "/compress-jpg-image/", anchor: "compress JPG by quality" },
    ],
    features: SIZE_FEATURES("100 KB"),
    priority: 1,
  },
  {
    ...COMMON,
    id: "compress-jpeg-to-200kb",
    path: "/compress-jpeg-to-200kb/",
    name: "Compress JPEG to 200KB",
    h1: "Compress JPEG to 200KB",
    title: "Compress JPEG to 200KB – Keep Quality Under 200KB",
    metaDescription:
      "Bring a JPG or other image under 200KB with as little visible loss as possible. Good for websites, email and forms with a 200KB limit.",
    summary:
      "Bring a JPG or other image under 200 KB with as little visible loss as possible, for websites, email and forms with a 200 KB limit.",
    subgroup: "size",
    card: "Bring a JPG or other image under 200 KB with little visible loss.",
    widget: "image-target-size",
    config: { targetKB: 200, format: "jpeg" },
    targetKB: 200,
    media: "image",
    aliases: [
      "compress image to 200kb",
      "200kb",
      "200 kb",
      "resize image to 200kb",
      "reduce jpg to 200kb",
      "jpeg 200kb",
      "compress photo under 200kb",
      "image to 200kb",
    ],
    keywords: ["website", "email", "jpeg"],
    limits: ["Output is JPEG; transparent areas are filled with white unless you choose PNG under More options."],
    steps: SIZE_STEPS,
    sections: [
      {
        heading: "Getting an image under 200KB",
        body: "Add one or more images. Each is saved as a JPEG at the highest quality that fits in 200,000 bytes, and is scaled down in proportion only when quality alone isn't enough. JPEGs already under 200 KB are returned unchanged. Every result shows the size in KB and bytes, the dimensions and the JPEG quality used, so you can see how much was given up.",
      },
      {
        heading: "Dimensions that work at 200KB",
        body: "At medium quality (about 1–2 bits per pixel), a 4:3 photo at 200 KB comes out around 1,030–1,460 px on the longer side, and simple images more. That covers a full-width image on most web pages and a photo that fills a laptop screen. Phone photos straight from the camera are much larger than this, so expect them to be scaled down.",
      },
      {
        heading: "Web images at 200KB",
        body: "For a website, 200 KB is a reasonable ceiling for a large photo at the top of a page, but heavy for a thumbnail or for images in a list. Resize images to the width they are actually displayed at (a 1,200 px content column doesn't need a 4,000 px photo), then compress. WebP is usually smaller than JPEG at similar quality; choose it under **More options** if your site supports it.\n\nFor compression by quality rather than a size target, use the [image compressor](/image-compressor/).",
      },
      {
        heading: "Checking the result",
        body: "Press **Preview** and look at the areas that show compression first: smooth gradients such as sky (banding), sharp edges against a plain background (halos) and fine textures such as hair or grass (smearing). If you see them, set **Max width** a little lower; fewer pixels at a higher quality usually look better than more pixels at a lower one.",
      },
    ],
    faq: [
      {
        q: "Is 200KB a good size for website images?",
        a: "For a large hero photo, yes. For thumbnails, product grids and images in articles, aim lower, often well under 100 KB, by resizing to the displayed width first.",
      },
      {
        q: "Can I compress a PNG to 200KB?",
        a: "Yes. It is converted to JPEG, which is much smaller for photos. Choose PNG under **More options** if you need to keep transparency.",
      },
      {
        q: "How do I avoid visible artifacts?",
        a: "Start from the original image, crop away anything you don't need, and lower **Max width** if the preview shows blockiness or banding. Don't re-compress an image that has already been compressed.",
      },
    ],
    related: ["compress-jpeg-to-100kb", "compress-image-to-1mb", "reduce-image-size-in-kb", "image-compressor", "image-resizer"],
    links: [
      { href: "/compress-jpeg-to-100kb/", anchor: "compress JPEG to 100KB" },
      { href: "/compress-image-to-1mb/", anchor: "compress image to 1MB" },
      { href: "/reduce-image-size-in-kb/", anchor: "other target sizes" },
    ],
    features: SIZE_FEATURES("200 KB"),
    priority: 2,
  },
  {
    ...COMMON,
    id: "compress-image-to-1mb",
    path: "/compress-image-to-1mb/",
    name: "Compress Image to 1MB",
    h1: "Compress Image to 1MB",
    title: "Compress Image to 1MB – Shrink Large Photos Under 1MB",
    metaDescription:
      "Bring large phone or camera photos under 1MB for email, forms and websites, keeping full detail where possible. Runs in your browser.",
    summary:
      "Bring large phone or camera photos under 1 MB (1,000,000 bytes) for email, forms and websites, keeping as much resolution as the limit allows.",
    subgroup: "size",
    card: "Shrink large phone or camera photos to under 1 MB.",
    widget: "image-target-size",
    config: { targetKB: 1000 },
    targetKB: 1000,
    media: "image",
    aliases: [
      "compress image to 1 mb",
      "1mb",
      "1 mb",
      "reduce image size to 1mb",
      "compress photo under 1mb",
      "resize image to 1mb",
      "photo under 1mb",
      "compress png to 1mb",
      "image to 1mb",
    ],
    keywords: ["email", "phone photo", "camera"],
    limits: ["Very large camera files may be scaled down moderately; the result shows the final dimensions."],
    steps: SIZE_STEPS,
    sections: [
      {
        heading: "Getting large photos under 1MB",
        body: "Add one or more photos. Each is saved as a JPG at the highest quality that fits in 1,000,000 bytes (1 MB with 1 KB = 1,000 bytes; switch to 1,024 under **More options** for a 1,048,576-byte limit). Photos already under 1 MB in the same format are left untouched. Each result row shows the new size in KB and bytes, the dimensions and the quality used.",
      },
      {
        heading: "Keeping resolution high",
        body: "Phone and camera photos are usually several megabytes. Getting them under 1 MB mostly needs a lower quality setting rather than fewer pixels, so the full resolution is often kept or reduced only moderately. As a rough guide at medium quality (1–2 bits per pixel), 1 MB holds a 4:3 photo of about 2,300–3,300 px on the longer side.\n\nIf you will only view the photo on screens, setting **Max width** to around 2,000 px lets the tool use a higher quality, which often looks better than full resolution at a lower one.",
      },
      {
        heading: "HEIC and PNG input",
        body: "iPhone HEIC photos are decoded in the browser (natively in Safari, otherwise by a decoder that loads the first time it is needed) and saved as JPG, which every email client and form accepts. PNG photos and screenshots are saved as JPG too, unless they are transparent: those stay PNG, with fewer colors, so the transparency survives. Choose JPG under **Output format** to fill the background instead, which usually allows larger dimensions.",
      },
      {
        heading: "When 1MB is still too big for a web page",
        body: "1 MB is fine for an email attachment or a form, but heavy for a web page, where each image adds to loading time on mobile connections. For the web, resize the image to the width it is displayed at with the [image resizer](/image-resizer/), then compress it to a few hundred KB or less; see [compress JPEG to 200KB](/compress-jpeg-to-200kb/). WebP output is usually smaller than JPG at similar quality.",
      },
    ],
    faq: [
      {
        q: "How do I make a photo smaller than 1MB?",
        a: "Add it here. The tool finds the highest JPG quality under 1,000,000 bytes and reduces the dimensions only if it must. Several photos can be done at once and downloaded as a ZIP.",
      },
      {
        q: "Will I lose resolution?",
        a: "Often not, or only a little: most phone photos fit in 1 MB by lowering quality alone. The result row shows the final dimensions next to the size.",
      },
      {
        q: "Is 1MB a good size for website images?",
        a: "It's on the heavy side. Most web images can be well under 200 KB once they are resized to the width they are displayed at.",
      },
    ],
    related: ["compress-jpeg-to-200kb", "reduce-image-size-in-kb", "image-compressor", "heic-to-jpg-converter", "image-resizer"],
    links: [
      { href: "/compress-jpeg-to-200kb/", anchor: "compress JPEG to 200KB" },
      { href: "/mb-to-kb-converter/", anchor: "MB to KB converter" },
      { href: "/reduce-image-size-in-kb/", anchor: "other target sizes" },
      { href: "/image-compressor/", anchor: "image compressor" },
    ],
    features: SIZE_FEATURES("1 MB"),
    priority: 2,
  },

  /* ------------------------------------------------------------------ compress by quality */
  {
    ...COMMON,
    id: "image-compressor",
    path: "/image-compressor/",
    name: "Image Compressor",
    h1: "Image Compressor",
    title: "Image Compressor – Compress JPG, PNG and WebP Online",
    metaDescription:
      "Shrink JPG, PNG and WebP images in your browser with a quality slider and before/after preview. Convert to WebP for smaller files. Nothing is uploaded.",
    summary:
      "Make JPG, PNG and WebP images smaller with a quality slider, see the saving and a before/after preview for each file, and download them one by one or as a ZIP.",
    subgroup: "compress",
    card: "Shrink JPG, PNG and WebP images with a quality slider.",
    widget: "image-compress",
    config: { preset: "general" },
    aliases: [
      "compress image",
      "compress images online",
      "reduce image size",
      "image size reducer",
      "photo compressor",
      "picture compressor",
      "compress pic",
      "image optimizer",
      "compress image to webp",
      "shrink image",
    ],
    keywords: ["quality", "webp", "batch", "website images"],
    limits: [
      "PNG photos rarely shrink much as PNG; convert them to JPG or WebP for large savings.",
      "Animated GIFs and WebPs are saved as their first frame.",
    ],
    steps: [
      "Press **Choose images**, drag files in or paste one with Ctrl+V.",
      "Move the **Quality (JPG and WebP)** slider; lower means smaller files. Each image is recompressed as you change it.",
      "Optionally pick an **Output format** (WebP is usually smallest) or a **Max width** to shrink large photos.",
      "Compare with **Preview**, then press **Download** or **Download all (ZIP)**.",
    ],
    sections: [
      {
        heading: "Choosing the quality level",
        body: "The quality slider controls how much detail JPG and WebP keep. As a starting point:\n\n| Quality | Typical use |\n|---|---|\n| 85–92 | Photos where detail matters: portfolios, products |\n| 75–85 | Most website and email images |\n| 60–75 | Thumbnails and images shown small |\n| Below 60 | Only when size matters more than looks |\n\nThe file size falls quickly from 100 down to about 80, then more slowly, while visible damage rises the further you go. Check faces, skies and sharp edges in **Preview** before settling on a value. The setting applies to every image in the list, and each one updates when you move the slider.",
      },
      {
        heading: "JPG, PNG or WebP output",
        body: "**Same as original** keeps each file's format, which is safest when the images go back where they came from. **JPG** suits photos and is accepted everywhere; transparent areas are filled with a color you choose. **WebP** is usually smaller than JPG at similar quality and keeps transparency; every current browser displays it, but some older programs can't open it. **PNG** is lossless: use it for screenshots, logos and graphics with sharp edges, and choose **Reduce colors** for real savings.\n\nIf your browser can't save WebP, the tool says so and saves JPG or PNG instead.",
      },
      {
        heading: "Compressing several images",
        body: "Add as many images as you like; they are processed one after another so the page stays responsive, and **Stop** halts the queue. Each row shows the old and new size, the saving in percent and the dimensions. **Download all (ZIP)** packs the results into one file; duplicate names get a number added. Change any setting and the whole list is recompressed with the new values.",
      },
      {
        heading: "Compressing to an exact file size",
        body: "This page compresses by quality, so the size you get depends on the image. If a form or website gives a limit such as 50 KB or 200 KB, use [reduce image size in KB](/reduce-image-size-in-kb/) instead: you type the limit and it finds the best quality, and dimensions if needed, that fit.",
      },
      {
        heading: "Why some images barely shrink",
        body: "- **Already compressed.** Photos from websites and messaging apps have usually been compressed once; there is little left to remove, and recompressing costs quality.\n- **PNG photos.** PNG is lossless, so a photo saved as PNG stays large. Convert it to JPG or WebP, or use **Reduce colors**.\n- **Same quality as before.** Saving a JPG at a higher quality than it was made with can make it bigger. When a result is larger than the original in the same format, the tool keeps your original file and says so.",
      },
    ],
    faq: [
      {
        q: "How much can I compress without visible loss?",
        a: "For most photos, JPG quality 80–85 looks the same as the original on screen and is often much smaller than a camera file. Images saved by phones or websites are already compressed, so the saving there is smaller.",
      },
      {
        q: "Why did my PNG get bigger?",
        a: "Re-saving a well-optimized PNG without reducing colors can come out larger. The tool then keeps your original. Choose **Reduce colors**, or switch the output to WebP or JPG.",
      },
      {
        q: "Can I convert to WebP while compressing?",
        a: "Yes. Set **Output format** to WebP. Transparency is kept, and the file is usually smaller than a JPG of similar quality.",
      },
    ],
    related: ["reduce-image-size-in-kb", "compress-jpg-image", "compress-png-image", "image-resizer", "compress-jpeg-to-200kb"],
    links: [
      { href: "/reduce-image-size-in-kb/", anchor: "compress to an exact size in KB" },
      { href: "/compress-jpg-image/", anchor: "compress JPG" },
      { href: "/compress-png-image/", anchor: "compress PNG" },
      { href: "/image-resizer/", anchor: "image resizer" },
      { href: "/blog/optimize-images-for-web/", anchor: "how to optimise images for the web" },
    ],
    features: [
      "Quality slider with live result sizes",
      "Keep the format or convert to JPG, PNG or WebP",
      "PNG color reduction that keeps transparency",
      "Batch processing with Download all (ZIP)",
      "Before/after preview and percent saved",
    ],
    priority: 1,
  },
  {
    ...COMMON,
    id: "compress-jpg-image",
    path: "/compress-jpg-image/",
    name: "Compress JPG Images",
    h1: "Compress JPG Images",
    title: "Compress JPG – Reduce JPEG File Size With Quality Control",
    metaDescription:
      "Reduce JPG/JPEG file size with a quality slider or presets (high, balanced, small), compare side by side and download. Runs in your browser.",
    summary:
      "Reduce the file size of JPG/JPEG photos with a quality slider or three presets, compare each result side by side with the original, and download them singly or as a ZIP.",
    subgroup: "compress",
    card: "Reduce JPEG file size with a quality slider or presets.",
    widget: "image-compress",
    config: { preset: "jpeg" },
    aliases: [
      "compress jpeg",
      "jpg compressor",
      "jpeg compressor",
      "reduce jpg size",
      "jpeg optimizer",
      "optimize jpeg",
      "compress jpg",
      "jpg size reducer",
      "compress photo jpg",
    ],
    keywords: ["quality", "exif", "progressive", "photo"],
    formats: { from: ["jpg"], to: ["jpg"] },
    limits: ["Saved files are baseline (not progressive) JPEGs, which is what browsers' built-in encoders write."],
    steps: [
      "Press **Choose images** and add one or more JPG files.",
      "Pick a preset (**High quality**, **Balanced** or **Small file**) or move the quality slider.",
      "Check each row's new size and saving, and press **Preview** to compare side by side.",
      "Press **Download** or **Download all (ZIP)**.",
    ],
    sections: [
      {
        heading: "JPEG quality settings explained",
        body: "JPEG quality (here 10–100) controls how coarsely the encoder rounds away fine detail. It isn't a percentage of the original quality, and the same number gives slightly different results in different programs. What matters is the shape of the curve: going from 100 to about 85 removes a lot of bytes with no visible change on most photos; below about 70 the savings shrink while blockiness, color smearing and halos around edges become easier to see.\n\nJPEG works best on photos. Screenshots with text, logos and line art show artifacts around every sharp edge at almost any quality; keep those as PNG.",
      },
      {
        heading: "Presets: high, balanced, small",
        body: "| Preset | Quality | Use it for |\n|---|---|---|\n| High quality | 90 | Photos you'll print or zoom into, product shots |\n| Balanced | 78 | Websites, email, social posts |\n| Small file | 60 | Thumbnails, previews, images shown small |\n\nThe presets just set the slider, so you can fine-tune afterwards. If a result is larger than your original (your photo was already compressed harder than the setting), the tool keeps your original file and tells you.",
      },
      {
        heading: "Removing metadata (EXIF)",
        body: "Phone photos carry EXIF data: date and time, camera model and settings, and often GPS coordinates of where the photo was taken. Every image saved by this tool is re-encoded from its pixels, so none of that metadata is copied. That makes files a little smaller and safer to share publicly. The photo's rotation is applied to the pixels first, so it still displays the right way up.\n\nIf you need to keep the date taken, keep a copy of your original.",
      },
      {
        heading: "Progressive JPEGs",
        body: "A progressive JPEG stores a rough version of the whole image first and refines it as it loads; a baseline JPEG loads top to bottom. Progressive files are often slightly smaller for large photos, and on slow connections they show something sooner. The browser encoders this tool uses write baseline JPEGs only, so the output is baseline. For most web images the difference in size is small; compressing to a sensible quality and resizing to the displayed width save far more.",
      },
      {
        heading: "When to switch to WebP",
        body: "If the images are for your own website, WebP is usually smaller than JPEG at similar visual quality and also supports transparency. All current browsers display it. Keep JPEG when the file goes to a form, a print shop or someone who may open it in older software. To convert, use the [image compressor](/image-compressor/) and set **Output format** to WebP.",
      },
    ],
    faq: [
      {
        q: "What JPEG quality should I use for a website?",
        a: "Start around 75–80 and check the preview. Resize the image to the width it's displayed at first; that usually saves more than lowering the quality further.",
      },
      {
        q: "Does compressing a JPG twice lose more quality?",
        a: "Yes. Each save rounds away detail again, so repeated compression adds damage. Always compress from the original file, and keep the original.",
      },
      {
        q: "Is EXIF location data removed?",
        a: "Yes. Saved files contain only the image, without GPS location, camera details or date taken.",
      },
    ],
    related: ["image-compressor", "compress-png-image", "reduce-image-size-in-kb", "compress-jpeg-to-100kb", "png-to-jpg-converter"],
    links: [
      { href: "/image-compressor/", anchor: "image compressor" },
      { href: "/compress-png-image/", anchor: "compress PNG" },
      { href: "/reduce-image-size-in-kb/", anchor: "compress to a set size in KB" },
      { href: "/compress-jpeg-to-100kb/", anchor: "compress JPEG to 100KB" },
    ],
    features: ["Quality slider from 10 to 100", "High, balanced and small presets", "Removes EXIF metadata including GPS", "Batch with Download all (ZIP)", "Side-by-side before/after preview"],
    priority: 1,
  },
  {
    ...COMMON,
    id: "compress-png-image",
    path: "/compress-png-image/",
    name: "Compress PNG Images",
    h1: "Compress PNG Images",
    title: "Compress PNG – Reduce PNG Size and Keep Transparency",
    metaDescription:
      "Make PNG files smaller while keeping transparency, with lossless optimisation or colour reduction, or convert to WebP or JPG when size matters more.",
    summary:
      "Make PNG files smaller while keeping transparency, either losslessly or by reducing the number of colors, or convert them to WebP or JPG when size matters more.",
    subgroup: "compress",
    card: "Shrink PNG files and keep their transparency.",
    widget: "image-compress",
    config: { preset: "png" },
    aliases: [
      "png compressor",
      "reduce png size",
      "optimize png",
      "compress png",
      "png optimizer",
      "compress png keep transparency",
      "make png smaller",
      "png size reducer",
      "tinypng alternative",
    ],
    keywords: ["transparency", "palette", "png-8", "lossless"],
    formats: { from: ["png"], to: ["png"] },
    limits: ["Color reduction is lossy: gradients and photos can show banding below about 128 colors."],
    steps: [
      "Press **Choose images** and add your PNG files.",
      "Under **PNG compression**, choose **Reduce colors** (default, 256 colors) or **Lossless**.",
      "Lower **Colors in the palette** for smaller files, checking **Preview** for banding.",
      "Press **Download** or **Download all (ZIP)**. Transparency is kept.",
    ],
    sections: [
      {
        heading: "Lossless vs lossy PNG compression",
        body: "**Lossless** re-saves the PNG with different filtering and keeps every pixel exactly, then picks the smaller of two encoders. Savings depend on how the original was made: files from screenshot tools and design apps often shrink a little, files already optimized may not shrink at all (the original is then kept).\n\n**Reduce colors** is lossy: it rebuilds the image with a palette of at most 256 colors and stores it as an 8-bit palette PNG. Most screenshots, icons, logos and illustrations use far fewer distinct colors than they could, so this typically cuts the size by half or more with no difference you can see.",
      },
      {
        heading: "Keeping transparency",
        body: "Both modes keep transparency, including soft, semi-transparent edges: the palette includes transparency levels as well as colors. Nothing is filled with white or black unless you change **Output format** to JPG, which can't store transparency. The preview shows transparent areas on a checkerboard so you can see that they survived.",
      },
      {
        heading: "Reducing colors (palette PNG)",
        body: "| Colors | Suits |\n|---|---|\n| 256 | Screenshots, illustrations, most graphics |\n| 128–64 | Logos, icons, charts, flat artwork |\n| 32–8 | Simple icons and diagrams with few colors |\n\nFewer colors mean a smaller file, but smooth gradients and photos start to show bands of flat color. Lower the count step by step and stop when **Preview** shows banding.",
      },
      {
        heading: "When PNG is the wrong format",
        body: "PNG is lossless, which makes it large for photographs: a photo saved as PNG is usually several times bigger than the same photo as JPG. If your PNG is a photo with no transparency, set **Output format** to JPG, or use the [PNG to JPG converter](/png-to-jpg-converter/). If it is a photo with transparency, WebP keeps the transparency at a fraction of the size, as long as wherever you're putting it accepts WebP.",
      },
    ],
    faq: [
      {
        q: "Why is my PNG file so large?",
        a: "PNG stores every pixel exactly, so photos and images with gradients or noise take a lot of space. Reducing colors helps graphics; photos are much smaller as JPG or WebP.",
      },
      {
        q: "Can PNG be compressed without losing quality?",
        a: "Yes, with **Lossless**, but the savings are usually modest. Large reductions come from reducing colors, which changes pixels slightly.",
      },
      {
        q: "Should I convert PNG to JPG?",
        a: "For photos without transparency, yes. Keep PNG for screenshots, logos, text and anything transparent: JPG blurs sharp edges and fills transparent areas.",
      },
    ],
    related: ["image-compressor", "compress-jpg-image", "png-to-jpg-converter", "png-to-svg-converter", "reduce-image-size-in-kb"],
    links: [
      { href: "/image-compressor/", anchor: "image compressor" },
      { href: "/compress-jpg-image/", anchor: "compress JPG" },
      { href: "/png-to-jpg-converter/", anchor: "PNG to JPG" },
      { href: "/blog/jpg-vs-png-vs-webp/", anchor: "JPG vs PNG vs WebP" },
    ],
    guides: ["/blog/jpg-vs-png-vs-webp/"],
    features: ["Lossless PNG re-encoding", "Palette reduction from 256 to 8 colors", "Keeps full and partial transparency", "Optional conversion to WebP or JPG", "Batch with Download all (ZIP)"],
    priority: 1,
  },

  /* ------------------------------------------------------------------ resize and crop */
  {
    ...COMMON,
    id: "image-resizer",
    path: "/image-resizer/",
    name: "Image Resizer",
    h1: "Image Resizer",
    title: "Image Resizer – Resize Images by Pixels or Percentage",
    metaDescription:
      "Resize JPG, PNG or WebP images to exact pixel dimensions or a percentage, keep or unlock the aspect ratio, and resize a batch at once, in your browser.",
    summary:
      "Resize JPG, PNG, WebP and HEIC images to exact pixels, a percentage or a longest side, with the aspect ratio kept or unlocked, one image or a whole batch.",
    subgroup: "resize",
    card: "Resize images to exact pixels, a percentage or a longest side.",
    widget: "image-resize",
    isNew: true,
    aliases: [
      "resize image",
      "resize image online",
      "photo resizer",
      "picture resizer",
      "resize image to pixels",
      "resize image by percentage",
      "change image size",
      "resize pic",
      "bulk image resizer",
      "resize image 1080x1080",
    ],
    keywords: ["pixels", "percentage", "aspect ratio", "instagram", "batch"],
    limits: ["Enlarging can't add detail: images scaled above 100% look softer."],
    steps: [
      "Press **Choose images** and add one or more images.",
      "Under **Resize by**, choose **Pixels**, **Percentage** or **Longest side** and enter the size, or press one of the **Common sizes**.",
      "Leave **Keep aspect ratio** ticked to avoid distortion; untick it to set both width and height, then choose how to handle a different shape.",
      "Check the new dimensions in each row and press **Download** or **Download all (ZIP)**.",
    ],
    example: {
      title: "A 4032 × 3024 phone photo",
      input: "Pixels, width 1080, Keep aspect ratio on\nPercentage, 50%\nLongest side, 1600 px",
      output: "1080 × 810 px\n2016 × 1512 px\n1600 × 1200 px",
      note: "A portrait photo (3024 × 4032) with Longest side 1600 becomes 1200 × 1600 px.",
    },
    sections: [
      {
        heading: "Pixels, percentage or longest side",
        body: "- **Pixels** sets an exact width and/or height. With the aspect ratio kept, type only the width or only the height and the other follows.\n- **Percentage** scales width and height by the same amount: 50% halves both sides, leaving a quarter of the pixels.\n- **Longest side** limits whichever side is longer, so landscape and portrait photos in one batch both end up no bigger than, say, 1,600 px. It's the best choice for a mixed batch.\n\nThe line under the settings shows what the first image will become before you download anything.",
      },
      {
        heading: "Keeping the aspect ratio",
        body: "With **Keep aspect ratio** ticked, each image keeps its own proportions, so nothing is stretched, even in a batch of different shapes. Untick it to enter both width and height. When an image's shape doesn't match, choose under **If the shape is different**: **Crop to fill** fills the size exactly and trims the edges evenly; **Fit with borders** keeps the whole image and adds bars in a color you pick (or transparent for PNG/WebP); **Stretch** distorts the image to fit and is rarely what you want for photos. For a crop you position yourself, use the [crop tool](/free-crop-image-online/).",
      },
      {
        heading: "Common social media sizes",
        body: "| Use | Size (px) | Shape |\n|---|---|---|\n| Instagram square post | 1080 × 1080 | 1:1 |\n| Instagram portrait post | 1080 × 1350 | 4:5 |\n| Stories and Reels | 1080 × 1920 | 9:16 |\n| YouTube thumbnail | 1280 × 720 | 16:9 |\n| Link preview (Open Graph) | 1200 × 630 | about 1.91:1 |\n| Full HD | 1920 × 1080 | 16:9 |\n\nThe **Common sizes** buttons set these values with **Crop to fill**. Platforms change their recommendations from time to time; check their help pages for anything critical.",
      },
      {
        heading: "Upscaling limits",
        body: "You can enter a size larger than the original, and the row warns you when an image is enlarged. Enlarging creates new pixels by blending neighbors, so edges and text get softer; it can't recover detail the original never had. Up to about 150% usually looks acceptable on screen; beyond 200% the softness is obvious. If you need a large image, start from the largest original you have.",
      },
      {
        heading: "Resizing vs compressing",
        body: "Resizing changes the number of pixels; compressing changes how efficiently those pixels are stored. Fewer pixels almost always means a smaller file, but if you need a specific file size in KB, use [reduce image size in KB](/reduce-image-size-in-kb/), or the [photo resizer in KB](/photo-resizer-in-kb/) when you need exact pixels and a KB limit together. To shrink files without changing dimensions, use the [image compressor](/image-compressor/).",
      },
    ],
    faq: [
      {
        q: "How do I resize without distorting the image?",
        a: "Keep **Keep aspect ratio** ticked and enter only the width or the height. If you need an exact width and height with a different shape, choose **Crop to fill** or **Fit with borders** rather than **Stretch**.",
      },
      {
        q: "Can I make a small image bigger without blur?",
        a: "Not really. Standard resizing can only blend existing pixels, so enlarged images look softer. Moderate enlargement (up to about 1.5×) is usually fine for screens.",
      },
      {
        q: "What size is an Instagram post?",
        a: "1080 px wide: 1080 × 1080 for square posts and 1080 × 1350 for portrait (4:5). Stories and Reels use 1080 × 1920.",
      },
    ],
    sources: [
      { label: "YouTube Help: Add video thumbnails", url: "https://support.google.com/youtube/answer/72431" },
      { label: "Meta for Developers: Images in link shares", url: "https://developers.facebook.com/docs/sharing/webmasters/images/" },
    ],
    related: ["free-crop-image-online", "photo-resizer-in-kb", "image-compressor", "reduce-image-size-in-kb", "compress-jpeg-to-200kb"],
    links: [
      { href: "/photo-resizer-in-kb/", anchor: "resize to pixels and KB" },
      { href: "/free-crop-image-online/", anchor: "crop image" },
      { href: "/image-compressor/", anchor: "image compressor" },
      { href: "/reduce-image-size-in-kb/", anchor: "reduce image size in KB" },
    ],
    features: [
      "Resize by pixels, percentage or longest side",
      "Aspect-ratio lock per image in a batch",
      "Crop to fill, fit with borders or stretch",
      "Presets for common social media sizes",
      "Batch with Download all (ZIP)",
    ],
    priority: 1,
  },
  {
    ...COMMON,
    id: "free-crop-image-online",
    path: "/free-crop-image-online/",
    name: "Crop Image",
    h1: "Crop Image",
    title: "Crop Image Online – Square, Circle and Custom Ratios",
    metaDescription:
      "Crop photos to a square, circle, 16:9, 4:5 or any custom size, with a live preview and exact pixel readout. Download as PNG or JPG. No upload.",
    summary:
      "Crop a photo to a square, circle, 16:9, 4:5 or any custom shape by dragging the box or typing exact pixel values, then download it as PNG, JPG or WebP.",
    subgroup: "resize",
    card: "Crop a photo to a square, circle or any exact size.",
    widget: "image-crop",
    aliases: [
      "crop image online",
      "image cropper",
      "crop photo",
      "circle crop",
      "crop picture",
      "crop image to square",
      "crop pic",
      "photo cropper",
      "crop image to circle",
      "crop image 16:9",
    ],
    keywords: ["square", "circle", "profile picture", "aspect ratio", "rotate"],
    limits: ["Rotation is in 90° steps; there is no free-angle straightening."],
    steps: [
      "Press **Choose image** (or paste one with Ctrl+V).",
      "Pick an **Aspect ratio** such as **1:1 square** or **16:9**, or leave it on **Free**.",
      "Drag the box or its handles, or type **X (left)**, **Y (top)**, **Width** and **Height**. With the box focused, arrow keys move it.",
      "Tick **Circle crop** for a round profile picture, choose a **Format**, then press **Download cropped image**.",
    ],
    example: {
      title: "Starting box for a 4000 × 3000 photo",
      input: "Aspect ratio: 1:1 square",
      output: "X 650, Y 150, Width 2700, Height 2700",
      note: "The starting box is the largest centered square, at 90% size so the handles are easy to grab.",
    },
    sections: [
      {
        heading: "Aspect ratio presets",
        body: "| Preset | Typical use |\n|---|---|\n| 1:1 square | Profile pictures, Instagram square posts, product photos |\n| 4:5 | Instagram portrait posts |\n| 3:4 and 4:3 | Standard photo prints and many camera photos |\n| 3:2 | 35 mm-style photos, 6 × 4 in prints |\n| 16:9 and 9:16 | Video thumbnails, wide banners, Stories and Reels |\n| 35 × 45 mm photo | Passport-style photo proportions |\n\n**Free** lets you draw any shape. **Custom** accepts your own ratio such as 2:3 or 5:7. Changing the ratio refits the current box around its center.",
      },
      {
        heading: "Circle crop for profile pictures",
        body: "Tick **Circle crop** to make everything outside the circle transparent. The ratio switches to 1:1 so you get a true circle (with **Free** or another ratio you get an oval). Save as PNG or WebP to keep the transparent corners. If you save as JPG, which has no transparency, the corners are filled with the color you choose.\n\nMost social networks crop profile pictures to a circle themselves and expect a square upload; the circle crop is for places that show your file as it is, such as email signatures, slides and websites.",
      },
      {
        heading: "Exact pixel dimensions",
        body: "The fields under **Exact crop (pixels)** show the box position (**X (left)**, **Y (top)**) and size in the image's own pixels, and you can type into them. With a ratio selected, changing **Width** updates **Height** to match. The **Result** panel shows the final size. To make the output a particular width, such as 1080 px, fill in **Resize result to width**.\n\nFor keyboard use, focus the crop box and use the arrow keys: one pixel per press, ten with Shift; hold Alt or Ctrl to resize instead of move.",
      },
      {
        heading: "Rotating and flipping",
        body: "**Rotate left** and **Rotate right** turn the image by 90°; **Flip horizontal** mirrors it, for example to undo a mirrored selfie; **Flip vertical** turns it upside down. The crop box resets after each change. Photos taken on a phone are already shown the right way up, because the orientation stored in the photo is applied when it is opened. Free-angle straightening (for example 2° to level a horizon) isn't available.",
      },
    ],
    faq: [
      {
        q: "How do I crop an image into a circle?",
        a: "Add the image, tick **Circle crop**, position the box, choose PNG and press **Download cropped image**. The corners outside the circle are transparent.",
      },
      {
        q: "Does cropping reduce quality?",
        a: "Cropping only removes pixels outside the box; the pixels inside are copied unchanged. PNG output is lossless. JPG and WebP are re-compressed at the quality you set, so use 90 or higher for no visible change.",
      },
      {
        q: "What aspect ratio does Instagram use?",
        a: "Posts can be square (1:1), portrait (4:5) or landscape (about 1.91:1); Stories and Reels are 9:16. The 1:1, 4:5 and 9:16 presets cover the common ones.",
      },
    ],
    related: ["image-resizer", "photo-resizer-in-kb", "image-compressor", "favicon-generator", "compress-image-to-20kb"],
    links: [
      { href: "/image-resizer/", anchor: "image resizer" },
      { href: "/photo-resizer-in-kb/", anchor: "photo resizer in KB" },
      { href: "/image-compressor/", anchor: "image compressor" },
      { href: "/favicon-generator/", anchor: "favicon generator" },
    ],
    features: [
      "Drag handles plus numeric X, Y, width and height",
      "Aspect presets including 1:1, 4:5, 16:9 and custom ratios",
      "Circle crop with transparent corners",
      "Rotate 90° and flip",
      "Keyboard nudging with arrow keys",
    ],
    priority: 1,
  },

  /* ------------------------------------------------------------------ icons */
  {
    ...COMMON,
    id: "favicon-generator",
    path: "/favicon-generator/",
    name: "Favicon Generator",
    h1: "Favicon Generator",
    title: "Favicon Generator – ICO, PNG and Apple Touch Icons",
    metaDescription:
      "Turn an image, text or emoji into a favicon set (favicon.ico, PNGs from 16 to 512px, an Apple touch icon and a web manifest) plus the HTML tags to paste in.",
    summary:
      "Make a complete favicon set from an image, a letter or an emoji: favicon.ico, PNG icons from 16 to 512 px, an Apple touch icon, a web manifest and the HTML tags for your site.",
    subgroup: "icons",
    card: "Make favicon.ico, PNG and Apple touch icons from an image or text.",
    archetype: "generator",
    widget: "favicon",
    aliases: [
      "favicon maker",
      "favicon.ico generator",
      "create favicon",
      "favicon from image",
      "apple touch icon generator",
      "favicon creator",
      "site icon generator",
      "favicon from text",
      "emoji favicon",
      "favicon generator for wordpress",
    ],
    keywords: ["ico", "apple-touch-icon", "web manifest", "browser tab icon"],
    formats: { from: ["png", "jpg", "svg"], to: ["ico", "png"] },
    limits: ["Text and emoji use the fonts installed on your device, so emoji look like your system's emoji set."],
    steps: [
      "Under **Make the favicon from**, choose **An image** and press **Choose image**, or choose **Text or emoji** and type one to three characters.",
      "Set the **Shape**, **Padding** and **Background**, and check the icons at real size under **Preview**.",
      "Optionally fill in **Site name (for the manifest)**, **Theme color** and **Folder on your site**.",
      "Press **Download all (ZIP)**, upload the files to your site, and paste the tags from **Copy HTML** into the page's `<head>`.",
    ],
    sections: [
      {
        heading: "Which favicon files you need",
        body: "| File | Size | Used by |\n|---|---|---|\n| favicon.ico | 16, 32 and 48 px inside | Browsers, bookmarks, older software that looks for /favicon.ico |\n| favicon-16x16.png, favicon-32x32.png | 16 and 32 px | Browser tabs |\n| favicon-48x48.png | 48 px | Larger tab and taskbar icons |\n| apple-touch-icon.png | 180 px | iPhone and iPad home-screen shortcuts |\n| android-chrome-192x192.png, -512x512.png | 192 and 512 px | Android home screen and installed web apps, via site.webmanifest |\n\nThe ZIP contains all of these, the manifest and a small HTML file with the tags. If you only need a single .ico, the [PNG to ICO converter](/png-to-ico-converter/) is quicker.",
      },
      {
        heading: "Designing for 16x16",
        body: "At 16 × 16 px a favicon has 256 pixels in total. Detailed logos, thin lines and words turn into a smudge. What works:\n\n- one bold shape or one to three letters, not a full wordmark\n- strong contrast against both light and dark browser themes (the preview shows both)\n- little padding, so the shape uses the whole square\n- a solid background if your mark is thin or light-colored\n\nIf your logo has a symbol and a name, use the symbol only. Crop it to a square first with the [crop tool](/free-crop-image-online/) so it isn't shrunk to fit a wide image.",
      },
      {
        heading: "The HTML to add",
        body: "Upload the files to the folder you entered under **Folder on your site** (the site root, /, is usual), then paste the tags from the HTML panel inside `<head>` on every page, or in your theme or template's head section. The tags point browsers to the .ico, the 16 and 32 px PNGs, the Apple touch icon and the manifest, and set a theme color.\n\nAfter uploading, open a file's address directly, such as /favicon.ico, to check it loads. Browsers cache favicons aggressively, so a changed icon may take a while to appear; a private window shows the new one sooner.",
      },
      {
        heading: "Favicons in Google search results",
        body: "Google shows your favicon next to results when it can find and crawl it. Its guidelines ask for a square image (at least 8 × 8 px, with larger than 48 × 48 px recommended) declared with a `<link rel=\"icon\">` tag on the home page, a stable URL that Googlebot is allowed to crawl, and an image that represents your brand. The 48 px and larger files in this set meet the size advice. Updates aren't instant: Google picks up a new favicon when it recrawls your home page, which can take days or weeks.",
      },
    ],
    faq: [
      {
        q: "What size should a favicon be?",
        a: "There isn't one size: browsers use 16 and 32 px, Google recommends larger than 48 px, Apple uses 180 px and Android 192 and 512 px. This generator makes all of them from one image.",
      },
      {
        q: "Why isn't my favicon showing in Google?",
        a: "Google has to recrawl your home page first, which can take a while. Check that the icon link is in the home page's `<head>`, that the file loads at its URL, and that robots.txt doesn't block it.",
      },
      {
        q: "Do I still need favicon.ico?",
        a: "It's still worth including. Some browsers, feed readers and tools request /favicon.ico directly without reading your HTML, and it costs only a few KB.",
      },
    ],
    sources: [
      { label: "Google Search Central: Define a favicon to show in search results", url: "https://developers.google.com/search/docs/appearance/favicon-in-search" },
      { label: "MDN: Web app manifest icons", url: "https://developer.mozilla.org/en-US/docs/Web/Manifest/icons" },
    ],
    related: ["png-to-ico-converter", "free-crop-image-online", "svg-to-png", "image-resizer", "png-to-svg-converter"],
    links: [
      { href: "/png-to-ico-converter/", anchor: "PNG to ICO" },
      { href: "/free-crop-image-online/", anchor: "crop image" },
      { href: "/meta-tag-generator/", anchor: "meta tag generator" },
    ],
    features: [
      "favicon.ico with 16, 32 and 48 px images",
      "PNG icons from 16 to 512 px and a 180 px Apple touch icon",
      "site.webmanifest and ready-to-paste HTML tags",
      "Make icons from an image, letters or emoji",
      "Light and dark tab previews; ZIP download",
    ],
    priority: 2,
  },
  {
    ...COMMON,
    id: "png-to-ico-converter",
    path: "/png-to-ico-converter/",
    name: "PNG to ICO Converter",
    h1: "PNG to ICO Converter",
    title: "PNG to ICO Converter – Multi-Size .ico Files",
    metaDescription:
      "Convert PNG images to .ico files containing one or several sizes (16 to 256 px), with transparency kept. For favicons and Windows icons.",
    summary:
      "Convert a PNG into a single .ico file that holds one or several icon sizes from 16 to 256 px, with transparency kept, for favicons and Windows icons.",
    subgroup: "icons",
    card: "Convert PNG images to multi-size .ico files with transparency.",
    widget: "image-convert",
    config: { from: "png", to: "ico" },
    aliases: [
      "png to ico",
      "convert png to ico",
      "ico converter",
      "image to ico",
      "png to icon",
      "make ico file",
      "ico maker",
      "jpg to ico",
      "favicon ico converter",
    ],
    keywords: ["favicon", "windows icon", "transparency"],
    formats: { from: ["png", "jpg", "webp", "svg"], to: ["ico"] },
    limits: ["Each size is stored as a PNG inside the ICO, which Windows Vista and later and all current browsers support."],
    steps: [
      "Press **Choose images** and add one or more PNG files (JPG, WebP and SVG work too).",
      "Under **Sizes inside the .ico file**, tick the sizes you need: 16, 32 and 48 for a favicon; add 256 for a Windows icon.",
      "If an image isn't square, choose **Fit (transparent edges)** or **Crop to square**.",
      "Press **Download** for each .ico file, or **Download all (ZIP)**.",
    ],
    sections: [
      {
        heading: "Choosing icon sizes",
        body: "An .ico file is a container that holds several images; the program showing it picks the closest size. More sizes means a bigger file but sharper results everywhere.\n\n| Use | Sizes to include |\n|---|---|\n| Website favicon | 16, 32, 48 |\n| Windows desktop or app icon | 16, 24, 32, 48, 64, 256 |\n| Small toolbar or tray icon | 16, 24, 32 |\n\nEach size is scaled down from your image separately, in steps, which keeps edges cleaner than one big jump. Start from an image at least as large as the biggest size you tick; 256 px or more is ideal.",
      },
      {
        heading: "Transparency",
        body: "Transparent and semi-transparent pixels are kept in every size, so rounded logos and soft shadows look right on any background. If your PNG isn't square, **Fit (transparent edges)** centers it on a transparent square; **Crop to square** trims the longer side evenly instead. JPG input has no transparency, so its background stays as it is.",
      },
      {
        heading: "ICO for favicons vs Windows apps",
        body: "For a website, a favicon.ico with 16, 32 and 48 px is enough, alongside PNG icons for phones and Google. The [favicon generator](/favicon-generator/) makes that whole set, including the Apple touch icon and the HTML tags. For a Windows shortcut, folder or app icon, include 256 px: Windows uses it for large icon views and scales it for other sizes. This tool stores every size as a compressed PNG inside the ICO, which Windows has supported since Vista; very old software expecting bitmap-only icons may not read it.",
      },
      {
        heading: "Converting JPG or SVG",
        body: "JPG, WebP and SVG files are accepted too. JPG has no transparency, so crop it close to the subject first with the [crop tool](/free-crop-image-online/). An SVG is drawn at its own declared size before scaling; if that's small (for example 24 × 24), the 256 px icon will be soft, so render it larger first with [SVG to PNG](/svg-to-png/) and convert that PNG.",
      },
    ],
    faq: [
      {
        q: "Which sizes should an ICO contain?",
        a: "16, 32 and 48 px for a favicon. For a Windows icon add 24, 64 and 256 px. Only tick sizes up to your source image's size to avoid blurry enlargements.",
      },
      {
        q: "Does ICO keep transparency?",
        a: "Yes. Every size keeps full and partial transparency from your PNG.",
      },
      {
        q: "Can I convert JPG to ICO?",
        a: "Yes, add the JPG here. It won't have a transparent background, because JPG doesn't store transparency.",
      },
    ],
    related: ["favicon-generator", "svg-to-png", "jpg-to-png-converter", "free-crop-image-online", "image-resizer"],
    links: [
      { href: "/favicon-generator/", anchor: "favicon generator" },
      { href: "/svg-to-png/", anchor: "SVG to PNG" },
      { href: "/jpg-to-png-converter/", anchor: "JPG to PNG" },
    ],
    features: ["Choose any of 16, 24, 32, 48, 64, 128 and 256 px", "Keeps full and partial transparency", "Fit or crop non-square images", "Batch conversion with ZIP download"],
    priority: 2,
  },

  /* ------------------------------------------------------------------ converters */
  {
    ...COMMON,
    id: "png-to-jpg-converter",
    path: "/png-to-jpg-converter/",
    name: "PNG to JPG Converter",
    h1: "PNG to JPG Converter",
    title: "PNG to JPG Converter – Batch Convert With Quality Control",
    metaDescription:
      "Convert PNG images to JPG in a batch, choose the quality and the background colour for transparent areas, and download each file or a ZIP.",
    summary:
      "Convert PNG images to JPG, one or many at a time, with a quality setting and your choice of background color for transparent areas.",
    subgroup: "convert",
    card: "Convert PNG images to JPG with a quality and background setting.",
    widget: "image-convert",
    config: { from: "png", to: "jpeg" },
    aliases: ["png to jpeg", "convert png to jpg", "png to jpg converter", "png2jpg", "png into jpg", "save png as jpg", "batch png to jpg", "png to jpg white background"],
    keywords: ["transparency", "background", "batch"],
    formats: { from: ["png"], to: ["jpg"] },
    limits: ["JPG can't store transparency: transparent areas are filled with the background color."],
    steps: [
      "Press **Choose images** and add one or more PNG files.",
      "Set **JPG quality** (85–92 is visually lossless for most images).",
      "Under **Background for transparent areas**, choose **White**, **Black** or **Custom**.",
      "Press **Download** on each row or **Download all (ZIP)**.",
    ],
    sections: [
      {
        heading: "What happens to transparency",
        body: "JPG has no transparency. Every transparent or semi-transparent pixel is blended onto the background color you choose, white by default. Soft edges such as shadows and anti-aliased outlines blend smoothly into that color, so pick the color of the page or document where the image will go. If you need to keep transparency, stay with PNG, or use WebP, which supports it and is much smaller.",
      },
      {
        heading: "Choosing JPG quality",
        body: "Quality 85–92 looks the same as the PNG for most photos and gives a much smaller file. Lower values save more but show blocky patches in smooth areas and halos around sharp edges. Screenshots, text and line art show these artifacts sooner than photos, which is one reason they are usually better left as PNG. The **Preview** shows the selected file side by side with the original.",
      },
      {
        heading: "Batch conversion",
        body: "Add as many PNGs as you like; they are converted one after another and each row shows the old and new size. Change the quality or background and the whole list is converted again. **Download all (ZIP)** saves every JPG in one file, keeping the original names with .jpg.",
      },
      {
        heading: "When to keep PNG",
        body: "Keep PNG for logos, icons, screenshots, diagrams and anything with text or sharp edges, and for anything that needs transparency. Convert to JPG for photos, which are usually several times smaller as JPG. To shrink a PNG while keeping it a PNG, use [compress PNG](/compress-png-image/).",
      },
    ],
    faq: [
      {
        q: "Why did my transparent background turn black?",
        a: "Some programs fill transparency with black when they save JPG. Here you choose the color: white by default, or black or any custom color.",
      },
      {
        q: "Does converting PNG to JPG reduce quality?",
        a: "Slightly, because JPG is lossy, but at quality 85–92 the difference is rarely visible on photos. Text and sharp graphics are affected more.",
      },
      {
        q: "Can I convert many files at once?",
        a: "Yes. Add them all together and use **Download all (ZIP)**.",
      },
    ],
    related: ["jpg-to-png-converter", "compress-jpg-image", "webp-to-jpg", "compress-png-image", "image-compressor"],
    links: [
      { href: "/jpg-to-png-converter/", anchor: "JPG to PNG" },
      { href: "/compress-jpg-image/", anchor: "compress JPG" },
      { href: "/webp-to-jpg/", anchor: "WebP to JPG" },
      { href: "/blog/jpg-vs-png-vs-webp/", anchor: "JPG vs PNG vs WebP" },
    ],
    guides: ["/blog/jpg-vs-png-vs-webp/"],
    features: ["Batch PNG to JPG conversion", "Quality slider", "White, black or custom background for transparency", "Download all as ZIP"],
    priority: 1,
  },
  {
    ...COMMON,
    id: "jpg-to-png-converter",
    path: "/jpg-to-png-converter/",
    name: "JPG to PNG Converter",
    h1: "JPG to PNG Converter",
    title: "JPG to PNG Converter – Convert JPEG Images to PNG",
    metaDescription:
      "Convert JPG or JPEG images to PNG in your browser, one at a time or in a batch. Learn why conversion won't restore detail or add transparency.",
    summary:
      "Convert JPG or JPEG images to PNG, one at a time or in a batch. The PNG copies the JPG's pixels exactly; it doesn't restore lost detail or add transparency.",
    subgroup: "convert",
    card: "Convert JPG or JPEG images to PNG, one or many at a time.",
    widget: "image-convert",
    config: { from: "jpg", to: "png" },
    aliases: ["jpeg to png", "convert jpg to png", "jpg to png converter", "jpg2png", "save jpg as png", "batch jpg to png", "jpeg to png converter", "jpg into png"],
    keywords: ["lossless", "editing", "batch"],
    formats: { from: ["jpg"], to: ["png"] },
    limits: ["The PNG is usually larger than the JPG and has no transparency unless the original had it."],
    steps: [
      "Press **Choose images** and add one or more JPG or JPEG files.",
      "Each file is converted straight away; check the new size in its row.",
      "Press **Preview** to compare, then **Download** or **Download all (ZIP)**.",
    ],
    sections: [
      {
        heading: "When converting to PNG helps",
        body: "- **Editing.** PNG is lossless, so you can edit and save the image many times without adding JPG artifacts at each save. Convert once, edit the PNG, and export a JPG at the end if needed.\n- **Software that requires PNG.** Some upload forms, design tools and game engines only accept PNG.\n- **Adding text or graphics.** Text added on top of a photo stays crisp when the result is saved as PNG.\n\nFor photos that will just be viewed or shared, keep the JPG: it's smaller and looks the same.",
      },
      {
        heading: "Transparency: what conversion can't do",
        body: "A JPG has no transparency, so its PNG copy has none either: a white background stays white. Making the background transparent means deciding which pixels are background, which needs an editor with a background-removal or magic-wand tool. For simple logos on a plain background, tracing the logo with the [PNG to SVG converter](/png-to-svg-converter/) can be an alternative.",
      },
      {
        heading: "File size after conversion",
        body: "Expect the PNG to be larger, often several times larger for photos. JPG throws away detail the eye barely notices to save space; PNG stores every pixel exactly, including the noise and compression artifacts in the JPG. The conversion is exact, so it doesn't lose anything further, but it can't recover detail the JPG already lost.",
      },
      {
        heading: "Batch conversion",
        body: "Add any number of files at once. They are converted one after another, each row shows the original and new size, and **Download all (ZIP)** saves them together. Location and camera details (EXIF) aren't copied into the PNG.",
      },
    ],
    faq: [
      {
        q: "Will converting JPG to PNG improve quality?",
        a: "No. The PNG is an exact copy of the JPG's pixels, including any blur or artifacts. It only stops further loss if you edit and save the image again.",
      },
      {
        q: "How do I make the background transparent?",
        a: "Conversion alone can't. Remove the background in an image editor first; the result can then be saved as PNG with transparency.",
      },
      {
        q: "Why is the PNG larger?",
        a: "PNG is lossless and stores every pixel exactly, while JPG discards fine detail to save space. For photos that difference is large.",
      },
    ],
    related: ["png-to-jpg-converter", "compress-png-image", "png-to-svg-converter", "webp-to-png", "image-compressor"],
    links: [
      { href: "/png-to-jpg-converter/", anchor: "PNG to JPG" },
      { href: "/compress-png-image/", anchor: "compress PNG" },
      { href: "/png-to-svg-converter/", anchor: "PNG to SVG" },
    ],
    features: ["Exact, lossless JPG to PNG conversion", "Batch conversion", "Download all as ZIP", "EXIF metadata not copied"],
    priority: 1,
  },
  {
    ...COMMON,
    id: "webp-to-png",
    path: "/webp-to-png/",
    name: "WebP to PNG Converter",
    h1: "WebP to PNG Converter",
    title: "WebP to PNG Converter – Keep Transparency",
    metaDescription:
      "Convert WebP images to PNG with transparency kept, one file or a batch at a time, so they open in any editor or app that doesn't support WebP.",
    summary:
      "Convert WebP images to PNG with any transparency kept, so they open in editors and apps that don't support WebP. Convert one file or a whole batch.",
    subgroup: "convert",
    card: "Convert WebP images to PNG and keep the transparency.",
    widget: "image-convert",
    config: { from: "webp", to: "png" },
    aliases: ["webp to png converter", "convert webp to png", "webp converter", "open webp", "webp2png", "save webp as png", "batch webp to png", "webp transparent png"],
    keywords: ["transparency", "open webp", "batch"],
    formats: { from: ["webp"], to: ["png"] },
    limits: ["Animated WebP files are converted to their first frame only."],
    steps: [
      "Press **Choose images** and add one or more .webp files.",
      "Each file is converted to PNG straight away; transparent areas stay transparent.",
      "Press **Download** on each row or **Download all (ZIP)**.",
    ],
    sections: [
      {
        heading: "Why convert WebP files",
        body: "Many websites serve images as WebP because it is usually smaller than JPG or PNG at similar quality. When you save one, you get a .webp file, and some older image editors, office programs, upload forms and print services won't open it. PNG works everywhere and is lossless, so converting doesn't lose anything further; the PNG is an exact copy of the decoded WebP.",
      },
      {
        heading: "Transparency and animation",
        body: "WebP supports transparency, and so does PNG, so transparent backgrounds and soft edges are kept exactly. The preview shows transparent areas on a checkerboard.\n\nWebP can also be animated. This converter uses your browser's image decoder, which gives the first frame only, so an animated WebP becomes a still PNG. For a moving image you would need an animated format such as GIF or animated PNG, which this tool doesn't produce.",
      },
      {
        heading: "Batch conversion",
        body: "Add a whole folder's worth of WebP files at once. They are converted one after another, each row shows the original and new size, and **Download all (ZIP)** saves them together with their original names and a .png extension. Expect the PNGs to be larger than the WebPs, especially for photos.",
      },
      {
        heading: "WebP to JPG instead?",
        body: "For photos without transparency, JPG is a better target: it is accepted everywhere and the file stays small. Use the [WebP to JPG converter](/webp-to-jpg/). Choose PNG for graphics, screenshots, logos and anything transparent.",
      },
    ],
    faq: [
      {
        q: "Why do images save as WebP?",
        a: "The website served them as WebP to load faster, and your browser saves the file it received. Converting to PNG or JPG makes them open in any program.",
      },
      {
        q: "Are animated WebPs supported?",
        a: "Only the first frame is converted, giving a still PNG.",
      },
      {
        q: "Should I convert to PNG or JPG?",
        a: "PNG for graphics, screenshots and anything transparent; JPG for photos, where it gives a much smaller file.",
      },
    ],
    related: ["webp-to-jpg", "png-to-jpg-converter", "compress-png-image", "jpg-to-png-converter", "image-compressor"],
    links: [
      { href: "/webp-to-jpg/", anchor: "WebP to JPG" },
      { href: "/png-to-jpg-converter/", anchor: "PNG to JPG" },
      { href: "/compress-png-image/", anchor: "compress PNG" },
    ],
    features: ["Keeps transparency", "Lossless PNG output", "Batch conversion with ZIP download", "Runs in the browser"],
    priority: 1,
  },
  {
    ...COMMON,
    id: "webp-to-jpg",
    path: "/webp-to-jpg/",
    name: "WebP to JPG Converter",
    h1: "WebP to JPG Converter",
    title: "WebP to JPG Converter – Save WebP Images as JPG",
    metaDescription:
      "Convert WebP images to JPG in your browser, one file or many, with a quality setting and a background colour for transparent areas. No upload.",
    summary:
      "Convert WebP images to JPG, one or many at a time, with a quality setting and a background color for any transparent areas.",
    subgroup: "convert",
    card: "Save WebP images as JPG, one or many at a time.",
    widget: "image-convert",
    config: { from: "webp", to: "jpeg" },
    isNew: true,
    aliases: ["webp to jpeg", "convert webp to jpg", "webp to jpg converter", "save webp as jpg", "webp2jpg", "batch webp to jpg", "open webp as jpg", "webp to jpg windows"],
    keywords: ["quality", "transparency", "batch"],
    formats: { from: ["webp"], to: ["jpg"] },
    limits: ["Animated WebP files are converted to their first frame. Transparent areas are filled with the background color."],
    steps: [
      "Press **Choose images** and add one or more .webp files.",
      "Set **JPG quality**; 85–92 keeps photos visually unchanged.",
      "If the images have transparent areas, choose a **Background for transparent areas**.",
      "Press **Download** on each row or **Download all (ZIP)**.",
    ],
    sections: [
      {
        heading: "Why some sites serve WebP",
        body: "WebP was designed for the web: it usually produces smaller files than JPG at similar quality and supports transparency, so pages load faster. Image services and content delivery networks often convert images to WebP automatically for browsers that support it, which is why \"Save image as\" gives you a .webp file even when the site uploaded a JPG. Some editors, upload forms and older apps still don't accept WebP; JPG works everywhere.",
      },
      {
        heading: "Quality and file size",
        body: "Both formats are lossy, so converting re-encodes the image. At JPG quality 85–92 the result looks the same as the WebP for photos, but the JPG is usually somewhat larger, because WebP compresses more efficiently. Lower the quality only if the file must be small, and check the **Preview** for blockiness in skies and smooth areas.",
      },
      {
        heading: "Transparent WebP files",
        body: "WebP can be transparent; JPG can't. Transparent areas are filled with the color you choose under **Background for transparent areas**: white by default, black, or a custom color matching where the image will go. To keep the transparency, convert to PNG with the [WebP to PNG converter](/webp-to-png/) instead.",
      },
      {
        heading: "Batch conversion",
        body: "Add any number of WebP files. They are converted one by one, each row shows the size before and after, and changing the quality reconverts the whole list. **Download all (ZIP)** saves the JPGs together with their original names.",
      },
    ],
    faq: [
      {
        q: "Why does my browser save images as WebP?",
        a: "The website delivered the image as WebP, and the browser saves exactly what it received. Converting here gives you a JPG that opens anywhere.",
      },
      {
        q: "Does converting lose quality?",
        a: "A little, as with any JPG save, but at quality 85 or above the difference is rarely visible.",
      },
      {
        q: "Can I convert back to WebP?",
        a: "Yes, with the [image compressor](/image-compressor/): set **Output format** to WebP.",
      },
    ],
    related: ["webp-to-png", "png-to-jpg-converter", "compress-jpg-image", "avif-to-jpg-converter", "image-compressor"],
    links: [
      { href: "/webp-to-png/", anchor: "WebP to PNG" },
      { href: "/png-to-jpg-converter/", anchor: "PNG to JPG" },
      { href: "/compress-jpg-image/", anchor: "compress JPG" },
    ],
    features: ["Batch WebP to JPG conversion", "Quality slider", "Background color for transparent areas", "Download all as ZIP"],
    priority: 1,
  },
  {
    ...COMMON,
    id: "heic-to-jpg-converter",
    path: "/heic-to-jpg-converter/",
    name: "HEIC to JPG Converter",
    h1: "HEIC to JPG Converter",
    title: "HEIC to JPG Converter – Convert iPhone Photos in Bulk",
    metaDescription:
      "Convert iPhone HEIC photos to JPG in your browser, in bulk, with a quality setting. Files stay on your device. Works on Windows, Mac and Android.",
    summary:
      "Convert iPhone and iPad HEIC photos to JPG in bulk, with a quality setting and an option to keep the date and camera details. Works in browsers on Windows, Mac and Android.",
    subgroup: "convert",
    card: "Convert iPhone HEIC photos to JPG, many at a time.",
    widget: "image-convert",
    config: { from: "heic", to: "jpeg" },
    aliases: ["heic to jpeg", "convert heic to jpg", "heic converter", "iphone photo to jpg", "heif to jpg", "open heic on windows", "heic to jpg bulk", "heic2jpg", "hiec to jpg"],
    keywords: ["iphone", "heif", "windows", "exif", "bulk"],
    formats: { from: ["heic", "heif"], to: ["jpg"] },
    limits: [
      "Outside Safari, a HEIC decoder (about 1.4 MB) downloads the first time you convert, and large photos take a few seconds each.",
      "Some Live Photo, burst or edited HEIC files may not decode; export them as JPG from the Photos app instead.",
    ],
    steps: [
      "Press **Choose images** and select your .heic or .heif photos (you can pick many at once).",
      "Set **JPG quality**; 90 keeps photos visually identical.",
      "Tick **Keep photo details** if you want the date taken, camera and location kept.",
      "Press **Download** on each row or **Download all (ZIP)**.",
    ],
    sections: [
      {
        heading: "What HEIC is and why iPhones use it",
        body: "HEIC is Apple's name for HEIF images compressed with HEVC, the same codec used for 4K video. iPhones and iPads save photos in it by default (the **High Efficiency** camera setting) because it stores a photo in roughly half the space of a JPG at similar quality. The catch is support: Windows needs extra codec extensions from the Microsoft Store to open HEIC, many websites and forms reject it, and most browsers other than Safari can't display it.\n\nThis converter uses Safari's built-in decoder where available, and elsewhere a HEIC decoder that runs in your browser and loads only when you add a HEIC file.",
      },
      {
        heading: "Converting in bulk",
        body: "Select all the photos at once; they are converted one after another and each row shows the result size. Large photos take a few seconds each outside Safari. **Download all (ZIP)** saves them together with their original names and a .jpg extension.\n\nIf your phone has already converted a photo (iPhones often send JPGs when you share or upload, even if the file name still says .heic), the tool detects that the file is really a JPG from its contents and saves it unchanged with a .jpg name, with no second compression.",
      },
      {
        heading: "Keeping EXIF data (date, location)",
        body: "By default the JPG contains only the picture: date taken, camera model and GPS location are left out, which is safer for photos you'll share. Tick **Keep photo details (EXIF: date taken, camera, location)** to copy them into the JPG, for example when moving photos into a library that sorts by date. The orientation tag is reset because the photo is already rotated upright. PNG output can't carry EXIF; this applies to JPG only.",
      },
      {
        heading: "Stopping your iPhone saving HEIC",
        body: "To get JPGs straight from the camera, open **Settings › Camera › Formats** and choose **Most Compatible**. New photos are then saved as JPG (they take more space). To keep HEIC on the phone but get JPGs on a computer, set **Settings › Photos › Transfer to Mac or PC** to **Automatic**, and the photos are converted when you copy them over a cable.",
      },
    ],
    faq: [
      {
        q: "Why can't I open HEIC files on Windows?",
        a: "Windows needs the HEIF and HEVC codec extensions from the Microsoft Store to display HEIC. Converting to JPG avoids that and also makes the photos acceptable to most websites.",
      },
      {
        q: "Does converting lose quality?",
        a: "JPG is re-compressed, but at quality 90 the difference isn't visible. The JPG is usually larger than the HEIC, because HEIC compresses more efficiently.",
      },
      {
        q: "Is location data kept?",
        a: "Not by default. Tick **Keep photo details** to copy the EXIF data, including GPS location, into the JPG.",
      },
    ],
    related: ["heic-to-png-converter", "compress-jpg-image", "reduce-image-size-in-kb", "image-resizer", "compress-image-to-1mb"],
    links: [
      { href: "/heic-to-png-converter/", anchor: "HEIC to PNG" },
      { href: "/jpg-to-pdf/", anchor: "JPG to PDF" },
      { href: "/compress-jpg-image/", anchor: "compress JPG" },
      { href: "/blog/open-heic-files-windows/", anchor: "how to open HEIC files on Windows" },
    ],
    features: [
      "Bulk HEIC/HEIF to JPG conversion",
      "Optional EXIF copy (date taken, camera, location)",
      "Detects iPhone photos that are already JPG",
      "Quality slider and ZIP download",
      "Native decoding in Safari, in-browser decoder elsewhere",
    ],
    priority: 1,
  },
  {
    ...COMMON,
    id: "heic-to-png-converter",
    path: "/heic-to-png-converter/",
    name: "HEIC to PNG Converter",
    h1: "HEIC to PNG Converter",
    title: "HEIC to PNG Converter – Lossless Copies of iPhone Photos",
    metaDescription:
      "Convert HEIC photos to PNG when you need a lossless file for editing. Batch conversion runs in your browser; PNGs are much larger than JPGs.",
    summary:
      "Convert iPhone HEIC photos to lossless PNG files for editing, one or many at a time. Expect PNGs to be much larger than the HEIC or a JPG.",
    subgroup: "convert",
    card: "Convert iPhone HEIC photos to lossless PNG files.",
    widget: "image-convert",
    config: { from: "heic", to: "png" },
    aliases: ["heic to png converter", "convert heic to png", "heif to png", "iphone photo to png", "heic2png", "heic png batch", "heic to png for editing"],
    keywords: ["iphone", "lossless", "editing"],
    formats: { from: ["heic", "heif"], to: ["png"] },
    limits: [
      "PNG files of full-size photos are large, often several times the size of the HEIC.",
      "Outside Safari, a HEIC decoder (about 1.4 MB) downloads on first use. EXIF details are not kept in PNG.",
    ],
    steps: [
      "Press **Choose images** and select your .heic or .heif photos.",
      "Each photo is decoded and saved as PNG; the row shows the new size.",
      "Press **Download** on each row or **Download all (ZIP)**.",
    ],
    sections: [
      {
        heading: "HEIC to PNG vs HEIC to JPG",
        body: "Choose PNG when you'll edit the photo heavily or repeatedly: PNG is lossless, so each save keeps every pixel, and you can export a final JPG at the end. Choose JPG for everything else (sharing, uploading, email, printing): it is accepted everywhere and a fraction of the size. For that, use the [HEIC to JPG converter](/heic-to-jpg-converter/).",
      },
      {
        heading: "File size expectations",
        body: "HEIC is very efficient and PNG is lossless, so the PNG of a 12-megapixel photo is commonly many megabytes, several times the HEIC's size. That is normal: PNG stores every pixel exactly, including sensor noise, which compresses poorly. If size matters, convert to JPG instead, or reduce the PNG afterwards with [compress PNG](/compress-png-image/), though photos rarely shrink much as PNG.",
      },
      {
        heading: "Batch conversion",
        body: "Select many photos at once; they are converted one after another to keep your browser responsive. In Safari, HEIC is decoded natively and quickly; in other browsers a HEIC decoder loads the first time and each large photo takes a few seconds. **Download all (ZIP)** saves the PNGs in one file. A file that is actually a JPG inside (iPhones often convert when sharing) is decoded and converted the same way.",
      },
      {
        heading: "Editing after conversion",
        body: "PNG opens in every editor, including those that don't support HEIC. Note that PNG has no standard place for camera EXIF data in most editors, so the date taken and location aren't copied; keep the original HEIC if you need them. Colors are converted to standard sRGB as the browser displays them.",
      },
    ],
    faq: [
      {
        q: "Should I convert HEIC to PNG or JPG?",
        a: "JPG for sharing and uploading; PNG only when you need a lossless file for repeated editing.",
      },
      {
        q: "Why is the PNG so big?",
        a: "PNG is lossless and photos contain fine noise that compresses poorly, so a full-size photo becomes many megabytes. That's expected.",
      },
      {
        q: "Does HEIC have transparency?",
        a: "The HEIF format can store it, but iPhone camera photos don't use it, so the PNG will be fully opaque.",
      },
    ],
    related: ["heic-to-jpg-converter", "compress-png-image", "png-to-jpg-converter", "image-resizer", "jpg-to-png-converter"],
    links: [
      { href: "/heic-to-jpg-converter/", anchor: "HEIC to JPG" },
      { href: "/compress-png-image/", anchor: "compress PNG" },
      { href: "/png-to-jpg-converter/", anchor: "PNG to JPG" },
    ],
    features: ["Lossless HEIC/HEIF to PNG", "Batch conversion with ZIP download", "Native decoding in Safari, in-browser decoder elsewhere"],
    priority: 2,
  },
  {
    ...COMMON,
    id: "avif-to-jpg-converter",
    path: "/avif-to-jpg-converter/",
    name: "AVIF to JPG Converter",
    h1: "AVIF to JPG Converter",
    title: "AVIF to JPG Converter – Open and Convert AVIF Images",
    metaDescription:
      "Convert AVIF images to JPG so they open anywhere. Set the quality, compare the preview and download. Conversion runs in your browser.",
    summary:
      "Convert AVIF images to JPG so they open in any app or upload form. Set the quality, compare the result with the original and download one file or a ZIP.",
    subgroup: "convert",
    card: "Convert AVIF images to JPG so they open anywhere.",
    widget: "image-convert",
    config: { from: "avif", to: "jpeg" },
    aliases: ["avif to jpeg", "convert avif to jpg", "avif converter", "open avif file", "avif2jpg", "avif to jpg batch", "save avif as jpg"],
    keywords: ["avif", "open", "quality"],
    formats: { from: ["avif"], to: ["jpg"] },
    limits: ["Your browser must be able to decode AVIF; current Chrome, Edge, Firefox and Safari can. Animated AVIF gives the first frame."],
    steps: [
      "Press **Choose images** and add one or more .avif files.",
      "Set **JPG quality** and, for transparent images, the background color.",
      "Press **Preview** to compare, then **Download** or **Download all (ZIP)**.",
    ],
    sections: [
      {
        heading: "What AVIF is",
        body: "AVIF is an image format based on the AV1 video codec. It compresses photos very efficiently, often better than WebP and much better than JPG at similar quality, and supports transparency and HDR. Websites increasingly serve AVIF to browsers that support it, so images you save from the web may arrive as .avif files that many editors, office programs and upload forms can't open yet.",
      },
      {
        heading: "Browser support for AVIF",
        body: "This converter decodes AVIF with your browser's own decoder, so it works where the browser can display AVIF: current versions of Chrome, Edge, Firefox and Safari. If your browser is too old, the tool says so instead of producing a broken file; update the browser or open this page in another one. Animated AVIF files are converted to their first frame.",
      },
      {
        heading: "Quality settings",
        body: "Converting re-encodes the image as JPG. Quality 85–92 keeps photos visually identical to the AVIF; the JPG will usually be larger, because AVIF is more efficient. Transparent areas are filled with the color you choose (white by default), since JPG has no transparency. The **Preview** shows the original and the JPG side by side.",
      },
      {
        heading: "AVIF vs WebP vs JPG",
        body: "| Format | Strengths | Weak points |\n|---|---|---|\n| AVIF | Smallest files at similar quality, transparency, HDR | Slow to encode, newer, limited app support |\n| WebP | Small files, transparency, wide browser support | Some apps and forms still reject it |\n| JPG | Opens everywhere | Larger files, no transparency |\n\nFor publishing on the web, AVIF or WebP save bandwidth. For sharing, printing and uploads, JPG is the safe choice. See [image formats compared](/blog/jpg-vs-png-vs-webp/).",
      },
    ],
    faq: [
      {
        q: "Why can't I open an AVIF file?",
        a: "Many desktop apps, older operating systems and upload forms don't support AVIF yet. Converting to JPG solves that.",
      },
      {
        q: "Is AVIF better than WebP?",
        a: "It usually compresses photos smaller at the same visual quality, but it is slower to create and less widely supported outside browsers.",
      },
      {
        q: "Does conversion lose quality?",
        a: "Slightly, as with any JPG save; at quality 85 or above the difference is rarely visible.",
      },
    ],
    related: ["webp-to-jpg", "png-to-jpg-converter", "compress-jpg-image", "image-compressor", "heic-to-jpg-converter"],
    links: [
      { href: "/webp-to-jpg/", anchor: "WebP to JPG" },
      { href: "/blog/jpg-vs-png-vs-webp/", anchor: "image formats compared" },
      { href: "/compress-jpg-image/", anchor: "compress JPG" },
    ],
    guides: ["/blog/jpg-vs-png-vs-webp/"],
    features: ["AVIF to JPG with the browser's own decoder", "Quality slider and background color", "Batch conversion with ZIP download", "Clear message if the browser can't decode AVIF"],
    priority: 2,
  },
  {
    ...COMMON,
    id: "svg-to-png",
    path: "/svg-to-png/",
    name: "SVG to PNG Converter",
    h1: "SVG to PNG Converter",
    title: "SVG to PNG Converter – Export at Any Size, Transparent",
    metaDescription:
      "Render SVG files to PNG at any width or scale, keep the transparent background and download. Handy for icons, logos and social images.",
    summary:
      "Render SVG files to sharp PNG images at any scale or exact width, with a transparent or colored background. Convert one file or a batch.",
    subgroup: "convert",
    card: "Render SVG files to sharp PNGs at any size.",
    widget: "image-convert",
    config: { from: "svg", to: "png" },
    aliases: ["svg to png converter", "convert svg to png", "svg to png high resolution", "svg2png", "svg to image", "export svg as png", "svg to png transparent", "batch svg to png"],
    keywords: ["vector", "icon", "logo", "resolution"],
    formats: { from: ["svg"], to: ["png"] },
    limits: ["SVGs that load fonts or images from other files or websites render without them; embedded fonts and images work."],
    steps: [
      "Press **Choose SVG files** and add one or more .svg files.",
      "Under **Output size**, choose a **Scale** (1× to 8×) or **Width in pixels**.",
      "Pick a **Background**: **Transparent**, **White**, **Black** or **Custom**.",
      "Press **Download** on each row or **Download all (ZIP)**.",
    ],
    sections: [
      {
        heading: "Choosing output size",
        body: "An SVG is drawn from shapes, so it can be rendered at any size without blur; the PNG is a snapshot at the size you pick. **Scale** multiplies the SVG's own size (its width and height, or its viewBox): an icon declared as 24 × 24 becomes 96 × 96 at 4×. **Width in pixels** sets an exact width, such as 1,024 or 1,200 for a social image, and the height follows the SVG's proportions. Each row shows the resulting pixel size.\n\nFor high-density screens, export at 2× or 3× the size the image is displayed at.",
      },
      {
        heading: "Transparency",
        body: "Areas the SVG doesn't paint stay transparent in the PNG by default, so a logo can sit on any background. Choose **White**, **Black** or **Custom** under **Background** to fill them instead, for example for apps or documents that show transparency as black. The preview shows transparent areas on a checkerboard.",
      },
      {
        heading: "Fonts and external images in SVGs",
        body: "Browsers draw an SVG converted this way as a self-contained image: for security, it can't load anything from other files or websites. Text uses fonts installed on your device unless the font is embedded in the SVG, so a design made with a web font may render in a fallback font. Images linked by URL are left out; images embedded as data URIs appear normally. For reliable results, convert text to outlines (paths) in your design app before exporting the SVG.",
      },
      {
        heading: "Batch export",
        body: "Add several SVGs at once; each is rendered with the same size and background settings, and **Download all (ZIP)** saves them together. Changing a setting re-renders the whole list. Very large outputs (above about 50 megapixels) are refused because browsers can't draw them; choose a smaller width.",
      },
    ],
    faq: [
      {
        q: "Will the PNG be blurry?",
        a: "No. The SVG is rendered directly at the output size, not enlarged from a small image, so edges stay sharp at any scale.",
      },
      {
        q: "Why are my fonts wrong?",
        a: "The SVG uses a font that isn't embedded and isn't installed on your device. Embed the font or convert text to paths in your design app.",
      },
      {
        q: "Can I export at 4x?",
        a: "Yes. Choose **Scale** and press **4×**, or 8× for very large output.",
      },
    ],
    related: ["png-to-svg-converter", "png-to-ico-converter", "favicon-generator", "jpg-to-svg-converter", "compress-png-image"],
    links: [
      { href: "/png-to-svg-converter/", anchor: "PNG to SVG" },
      { href: "/png-to-ico-converter/", anchor: "PNG to ICO" },
      { href: "/favicon-generator/", anchor: "favicon generator" },
    ],
    features: ["Render at 1× to 8× or an exact width", "Transparent or colored background", "Sharp output at any size", "Batch export with ZIP download"],
    priority: 1,
  },
  {
    ...COMMON,
    id: "jpg-to-svg-converter",
    path: "/jpg-to-svg-converter/",
    name: "JPG to SVG Converter",
    h1: "JPG to SVG Converter",
    title: "JPG to SVG Converter – Trace JPEG Images Into Vectors",
    metaDescription:
      "Trace JPG or JPEG images into real vector SVG paths, with controls for colours, detail and smoothing. Works best for logos, icons and line art.",
    summary:
      "Trace a JPG or JPEG into real vector SVG paths, with presets and controls for colors, detail and smoothing and a live preview. Best for logos, icons and line art; photos become posterized shapes.",
    subgroup: "convert",
    card: "Trace JPG images into real, scalable SVG vector paths.",
    widget: "image-to-svg",
    config: { from: "jpg" },
    aliases: [
      "jpeg to svg",
      "convert jpg to svg",
      "jpg to svg converter",
      "image to svg",
      "vectorize image",
      "jpg to vector",
      "trace image to svg",
      "jpg to svg for cricut",
      "logo to svg",
      "raster to vector",
    ],
    keywords: ["vector", "trace", "cricut", "logo", "illustrator"],
    formats: { from: ["jpg", "jpeg"], to: ["svg"] },
    limits: [
      "Tracing turns photos into flat, posterized shapes; it can't reproduce photographic detail.",
      "Large images are traced at a reduced resolution (400–2,000 px) and the SVG is scaled back to full size.",
    ],
    steps: [
      "Press **Choose image** and add a JPG. Tracing starts automatically with the **Logo or icon** preset.",
      "Try the other presets (**Line art (black and white)**, **Detailed illustration**, **Posterized photo**) and watch the preview.",
      "Fine-tune **Colors**, **Detail**, **Remove specks smaller than** and **Blur before tracing**.",
      "Press **Download SVG**, or **Copy SVG code** to paste it into a web page.",
    ],
    sections: [
      {
        heading: "Tracing vs embedding",
        body: "A real SVG is made of shapes (paths) that stay sharp at any size and can be edited, recolored and cut. **Vector paths (traced)** creates exactly that: it groups the image into a few colors and draws the outline of every region as a smooth path. **Embedded image (not vector)** only wraps your JPG inside an SVG file. It is still pixels, blurs when enlarged and can't be edited as shapes; use it only when software demands an .svg file but doesn't need vectors.\n\nMany online \"converters\" do the embedding silently. This page labels which one you get.",
      },
      {
        heading: "Choosing colors and detail",
        body: "- **Colors** is the number of flat colors in the result. A two-color logo needs 2–4; a flat illustration 8–16. More colors mean more paths and a bigger file.\n- **Detail** controls how closely the paths follow the pixels: low values give smooth, simplified curves; high values follow every bump.\n- **Remove specks smaller than** drops tiny shapes caused by JPG noise; 8–16 px is a good start.\n- **Blur before tracing** smooths JPG artifacts and grain before the colors are grouped; 1–2 helps most JPGs.\n\nThe footer shows the path count and file size, so you can see the effect of each change.",
      },
      {
        heading: "Images that trace well and those that don't",
        body: "Tracing works well for logos, icons, signatures, stamps, clip art, text and drawings with clear edges and flat colors. It works poorly for photos, gradients, soft shadows and textures: those become posterized bands of flat color with jagged edges, because a photo has no clean regions to outline. A JPG of a logo traces better if it is large and sharp; if you have a PNG of the same logo, use the [PNG to SVG converter](/png-to-svg-converter/), which avoids JPG artifacts and keeps transparency.",
      },
      {
        heading: "Using the SVG in Cricut, Illustrator or on the web",
        body: "**Cutting machines (Cricut, Silhouette):** use the **Line art (black and white)** preset or few colors, and raise **Remove specks** so the machine doesn't cut dozens of tiny pieces. Each color becomes a separate layer you can weld or hide.\n\n**Illustrator, Inkscape, Figma:** open the SVG and edit the paths directly; each color region is a separate path.\n\n**Web:** paste the code from **Copy SVG code** into your HTML or save the file. Keep traced SVGs small: if the file is over a few hundred KB, reduce colors and detail.",
      },
    ],
    faq: [
      {
        q: "Why does my photo look posterized as SVG?",
        a: "A traced SVG can only contain flat-colored shapes, so smooth shading turns into bands. That's inherent to vector tracing; keep photos as JPG or WebP.",
      },
      {
        q: "Is a JPG embedded in an SVG a real vector?",
        a: "No. It's the same pixels inside an SVG file and won't scale sharply or edit as shapes. Use **Vector paths (traced)** for a real vector.",
      },
      {
        q: "Can I edit the result?",
        a: "Yes. Every color region is a separate path you can move, recolor or delete in Illustrator, Inkscape, Figma or Cricut Design Space.",
      },
    ],
    related: ["png-to-svg-converter", "svg-to-png", "jpg-to-png-converter", "free-crop-image-online", "compress-jpg-image"],
    links: [
      { href: "/png-to-svg-converter/", anchor: "PNG to SVG" },
      { href: "/svg-to-png/", anchor: "SVG to PNG" },
      { href: "/blog/jpg-vs-png-vs-webp/", anchor: "image formats compared" },
    ],
    features: [
      "Real vector tracing with imagetracerjs",
      "Presets for logos, line art, illustrations and photos",
      "Live preview with path count and file size",
      "Black-and-white mode with adjustable threshold",
      "Optional embedded (non-vector) SVG output",
    ],
    priority: 1,
  },
  {
    ...COMMON,
    id: "png-to-svg-converter",
    path: "/png-to-svg-converter/",
    name: "PNG to SVG Converter",
    h1: "PNG to SVG Converter",
    title: "PNG to SVG Converter – Vectorize Logos and Icons",
    metaDescription:
      "Convert PNG logos, icons and line art into scalable SVG paths, keeping transparent areas empty. Adjust colours and detail, then download the SVG.",
    summary:
      "Trace PNG logos, icons and line art into scalable SVG paths, with transparent areas left empty. Adjust colors and detail with a live preview, then download the SVG.",
    subgroup: "convert",
    card: "Vectorize PNG logos and icons into scalable SVG paths.",
    widget: "image-to-svg",
    config: { from: "png" },
    aliases: [
      "png to svg converter",
      "convert png to svg",
      "vectorize png",
      "png to vector",
      "png logo to svg",
      "png to svg for cricut",
      "trace png",
      "png to svg transparent",
      "icon to svg",
    ],
    keywords: ["vector", "trace", "logo", "transparency", "cricut"],
    formats: { from: ["png"], to: ["svg"] },
    limits: [
      "Photos and gradients become flat, posterized shapes.",
      "Large images are traced at a reduced resolution (400–2,000 px) and the SVG is scaled back to full size.",
    ],
    steps: [
      "Press **Choose image** and add a PNG. Tracing starts with the **Logo or icon** preset.",
      "Compare presets and adjust **Colors**, **Detail** and **Remove specks smaller than** while watching the preview.",
      "For one-color artwork, tick **Black and white only** and set the threshold.",
      "Press **Download SVG** or **Copy SVG code**.",
    ],
    sections: [
      {
        heading: "Tracing vs embedding",
        body: "**Vector paths (traced)** turns each color region of your PNG into an outlined path, which gives a true vector: sharp at any size, editable and cuttable. **Embedded image (not vector)** just places the PNG inside an SVG file; it stays pixels. Only use embedding when a program insists on an .svg file but you don't need to scale or edit it.",
      },
      {
        heading: "Transparency",
        body: "Fully transparent pixels are traced as empty space: no shape is drawn there, so the SVG's background stays transparent and the logo sits on any color. Soft, semi-transparent edges (anti-aliasing, shadows) are grouped with the nearest color, which may leave a thin halo; if you see one, reduce **Colors** or raise **Detail** slightly. In **Black and white only** mode, transparent areas count as white.",
      },
      {
        heading: "Color count and detail",
        body: "Set **Colors** to roughly the number of colors in your design, plus one or two for anti-aliased edges. Too few merges parts of the logo; too many creates slivers along edges. **Detail** trades smoothness against accuracy: lower for clean curves on simple logos, higher for small text and intricate shapes. **Tracing resolution** controls how many pixels are analysed; raise it for small text or fine lines, at the cost of time.",
      },
      {
        heading: "Cleaning up the result",
        body: "- Raise **Remove specks smaller than** to delete stray dots.\n- If edges look jagged, start from a larger PNG; tracing a 64 px icon can't invent smooth curves.\n- Open the SVG in Inkscape, Illustrator or Figma to delete or merge shapes; each color is a separate path.\n- Keep the file light for the web: the footer shows the size and path count.",
      },
    ],
    faq: [
      {
        q: "Will my PNG become a true vector?",
        a: "Yes, with **Vector paths (traced)**: the result contains only paths, no pixels. How faithful it is depends on how clean and large the PNG is.",
      },
      {
        q: "Why are edges jagged?",
        a: "The PNG is small or the detail is too high. Use a larger source image, lower **Detail** or raise **Tracing resolution**.",
      },
      {
        q: "Can I convert a photo?",
        a: "You can, with the **Posterized photo** preset, but the result is a stylized, poster-like image of flat colors, not a photographic SVG.",
      },
    ],
    related: ["jpg-to-svg-converter", "svg-to-png", "jpg-to-png-converter", "compress-png-image", "favicon-generator"],
    links: [
      { href: "/jpg-to-svg-converter/", anchor: "JPG to SVG" },
      { href: "/svg-to-png/", anchor: "SVG to PNG" },
      { href: "/jpg-to-png-converter/", anchor: "JPG to PNG" },
    ],
    features: [
      "Real vector tracing that keeps transparent areas empty",
      "Presets for logos, line art, illustrations and photos",
      "Adjustable colors, detail, speck removal and blur",
      "Live preview, path count and file size",
      "Download SVG or copy the code",
    ],
    priority: 1,
  },

  /* ------------------------------------------------------------------ video */
  {
    ...COMMON,
    id: "video-to-gif",
    path: "/video-to-gif/",
    name: "Video to GIF Converter",
    h1: "Video to GIF Converter",
    title: "Video to GIF Converter – MP4, MOV and WebM to GIF",
    metaDescription:
      "Turn a clip from an MP4, MOV or WebM video into an animated GIF: choose start time, length, frame rate and width. No watermark and no upload.",
    summary:
      "Turn a clip from an MP4, MOV or WebM video into an animated GIF. Choose the start, length (up to 30 seconds), frame rate, width and looping; there is no watermark.",
    subgroup: "video",
    card: "Turn a clip from an MP4, MOV or WebM video into a GIF.",
    widget: "video-to-gif",
    aliases: [
      "mp4 to gif",
      "video to gif converter",
      "convert video to gif",
      "mov to gif",
      "webm to gif",
      "make a gif from a video",
      "gif maker",
      "mp4 to gif no watermark",
      "clip to gif",
    ],
    keywords: ["gif", "mp4", "trim", "fps", "discord"],
    formats: { from: ["mp4", "mov", "webm"], to: ["gif"] },
    limits: [
      "GIFs are limited to 30 seconds and 600 frames. Sound is dropped: GIF has no audio.",
      "The video must play in your browser; iPhone HEVC (.mov) videos often play only in Safari.",
    ],
    steps: [
      "Press **Choose video** and add an MP4, MOV or WebM file.",
      "Set **Start (seconds)** and **Length**, or play the video, pause where the GIF should begin and press **Start at current position**.",
      "Choose **Frames per second**, **Width**, **Colors per frame** and **Loop**; the estimated size updates as you go.",
      "Press **Create GIF** (you can **Cancel**), then **Download GIF**.",
    ],
    sections: [
      {
        heading: "Trimming the clip",
        body: "A GIF stores every frame as a full image, so it should be short: pick the few seconds that matter. Enter **Start (seconds)** and **Length**, or use the video player: play or scrub to the moment you want, pause, and press **Start at current position**. The line under the fields shows the exact time range. Length is capped at 30 seconds and 600 frames, both to keep the file usable and because frames are captured one at a time in your browser.",
      },
      {
        heading: "Frame rate, width and file size",
        body: "GIF size grows with frames × width × height. Doubling the width roughly quadruples the size; doubling the frame rate doubles it.\n\n| Setting | Suggested |\n|---|---|\n| Frames per second | 10–15 for most clips; 20+ only for fast motion |\n| Width | 320–480 px for chat and social; up to 800 px for slides |\n| Colors per frame | 256 for video; 64–128 to save space on simple footage |\n\nThe estimate before you press **Create GIF** is a range, because busy, fast-moving scenes compress far worse than static ones. **Shared** palette uses one set of colors for the whole GIF, which reduces flicker and size; **Per frame** gives each frame its best 256 colors.",
      },
      {
        heading: "GIF size limits on Discord, Slack and X",
        body: "Chat apps and social networks cap upload sizes, and the limits differ by plan and change from time to time, so check the platform's help page for the current figure. Some also convert uploaded GIFs to video, or stop animating large ones. As a practical rule, GIFs for chat work best under about 10 MB. To get under a limit, lower the width first, then the frame rate, then the length; reducing colors to 128 or 64 helps a little more.",
      },
      {
        heading: "When to use MP4 or WebP instead of GIF",
        body: "GIF dates from 1989: 256 colors per frame and inefficient compression make it many times larger than the same clip as MP4. Use a GIF where only GIFs are accepted or where it must autoplay everywhere, such as email and some chat apps. On your own website, a short muted, looping MP4 or WebM video (or an animated WebP) looks better at a fraction of the size. Keep the original video for that; this tool only creates GIFs.",
      },
    ],
    faq: [
      {
        q: "How long can the GIF be?",
        a: "Up to 30 seconds (and 600 frames). In practice 2–6 seconds is best: longer GIFs get large quickly.",
      },
      {
        q: "Why is my GIF so large?",
        a: "Each frame is stored as a separate image with at most 256 colors. Reduce the width, the frame rate or the length; the estimate updates as you change them.",
      },
      {
        q: "Will it add a watermark?",
        a: "No. The GIF contains only frames from your video.",
      },
    ],
    related: ["image-resizer", "free-crop-image-online", "image-compressor", "compress-png-image", "jpg-to-png-converter"],
    links: [
      { href: "/image-resizer/", anchor: "image resizer" },
      { href: "/free-crop-image-online/", anchor: "crop image" },
      { href: "/image-compressor/", anchor: "image compressor" },
    ],
    features: [
      "MP4, MOV and WebM input using the browser's own video decoder",
      "Start time, length, frame rate and width controls",
      "Loop forever, once or a set number of times",
      "Estimated size before encoding; progress with Cancel",
      "No watermark and no upload",
    ],
    priority: 1,
  },
];
