/*
 * Creates the article images in public/blog-images/. All artwork is generated here from our own
 * shapes and from screenshots of this site's tools using made-up sample files.
 *
 *   node scripts/build-blog-images.mjs                      covers (1200×630) and the two diagrams
 *   node scripts/build-blog-images.mjs <server> [--shots]   also capture tool screenshots (1200×750)
 *
 * Needs the installed Chrome for screenshots (CHROME_PATH overrides the location).
 */
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const OUT = "public/blog-images";
mkdirSync(OUT, { recursive: true });

const INK = "#0b1533";
const MUTED = "#4b5675";
const BLUE = "#1d63ed";
const PALE = "#e8f0ff";
const GREEN = "#15803d";
const ORANGE = "#c2410c";
const LINE = "#d5ddee";

const font = (px, weight = 700) => `${weight} ${px}px Arial, Helvetica, sans-serif`;
const save = (canvas, name) => writeFileSync(`${OUT}/${name}.jpg`, canvas.toBuffer("image/jpeg", 88));

function box(x, r, X, Y, w, h, fill, stroke) {
  r.beginPath();
  r.roundRect(X, Y, w, h, x);
  if (fill) (r.fillStyle = fill), r.fill();
  if (stroke) (r.strokeStyle = stroke), (r.lineWidth = 3), r.stroke();
}
function label(c, text, x, y, px, color = INK, weight = 700, align = "left") {
  c.font = font(px, weight);
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = "alphabetic";
  c.fillText(text, x, y);
}
function wrap(c, text, maxWidth, px) {
  c.font = font(px);
  const lines = [""];
  for (const word of text.split(" ")) {
    const next = `${lines.at(-1)} ${word}`.trim();
    if (c.measureText(next).width > maxWidth && lines.at(-1)) lines.push(word);
    else lines[lines.length - 1] = next;
  }
  return lines;
}
function arrow(c, x1, y, x2, color = BLUE) {
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineWidth = 10;
  c.beginPath();
  c.moveTo(x1, y);
  c.lineTo(x2 - 18, y);
  c.stroke();
  c.beginPath();
  c.moveTo(x2, y);
  c.lineTo(x2 - 26, y - 18);
  c.lineTo(x2 - 26, y + 18);
  c.fill();
}
const bars = (c, x, y, w, n, gap = 26, color = LINE) => {
  for (let i = 0; i < n; i++) box(5, c, x, y + i * gap, w * [1, 0.86, 0.94, 0.7][i % 4], 10, color);
};
function sheet(c, x, y, w, h, tag, color = BLUE) {
  box(16, c, x, y, w, h, "#ffffff", LINE);
  bars(c, x + 22, y + 34, w - 44, Math.max(1, Math.floor((h - 100) / 26)));
  if (tag) {
    box(10, c, x + 18, y + h - 54, w - 36, 36, color);
    label(c, tag, x + w / 2, y + h - 28, 22, "#ffffff", 700, "center");
  }
}
function scene(c, x, y, w, h) {
  c.save();
  c.beginPath();
  c.roundRect(x, y, w, h, 14);
  c.clip();
  const sky = c.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, "#7db4ff");
  sky.addColorStop(1, "#dbeafe");
  c.fillStyle = sky;
  c.fillRect(x, y, w, h);
  c.fillStyle = "#fbbf24";
  c.beginPath();
  c.arc(x + w * 0.76, y + h * 0.26, h * 0.11, 0, Math.PI * 2);
  c.fill();
  for (const [dx, peak, color] of [[0, 0.42, "#3b6fb0"], [0.34, 0.52, "#2f855a"]]) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x + w * (dx - 0.2), y + h);
    c.lineTo(x + w * (dx + 0.25), y + h * peak);
    c.lineTo(x + w * (dx + 0.8), y + h);
    c.fill();
  }
  c.restore();
}

/* Each motif draws inside a 440×400 area whose top-left corner is (x, y). */
const MOTIFS = {
  photo(c, x, y) {
    scene(c, x, y + 40, 260, 200);
    arrow(c, x + 278, y + 140, x + 330);
    scene(c, x + 338, y + 100, 102, 80);
    box(14, c, x + 316, y + 210, 124, 48, GREEN);
    label(c, "50 KB", x + 378, y + 243, 28, "#fff", 700, "center");
  },
  pdf(c, x, y) {
    sheet(c, x, y + 20, 220, 300, "PDF", ORANGE);
    arrow(c, x + 240, y + 170, x + 304);
    sheet(c, x + 314, y + 80, 126, 180, "PDF", GREEN);
  },
  merge(c, x, y) {
    sheet(c, x, y, 150, 190, "A");
    sheet(c, x, y + 210, 150, 190, "B");
    arrow(c, x + 176, y + 200, x + 244);
    sheet(c, x + 262, y + 70, 178, 260, "A + B", GREEN);
  },
  "images-pdf"(c, x, y) {
    for (const i of [0, 1, 2]) scene(c, x, y + i * 134, 160, 118);
    arrow(c, x + 184, y + 200, x + 254);
    sheet(c, x + 270, y + 55, 170, 290, "PDF", ORANGE);
  },
  convert(c, x, y, cover) {
    sheet(c, x, y + 70, 170, 240, cover.from, "#6d28d9");
    arrow(c, x + 190, y + 190, x + 252);
    sheet(c, x + 270, y + 70, 170, 240, cover.to, GREEN);
  },
  formats(c, x, y) {
    ["JPG", "PNG", "WebP"].forEach((f, i) => sheet(c, x + i * 150, y + 80 + (i % 2) * 40, 136, 220, f, [ORANGE, BLUE, GREEN][i]));
  },
  qr(c, x, y) {
    box(20, c, x + 40, y + 20, 360, 360, "#ffffff", LINE);
    const unit = 14;
    const ox = x + 73;
    const oy = y + 53;
    const finder = (fx, fy) => {
      c.fillStyle = INK;
      c.fillRect(ox + fx * unit, oy + fy * unit, unit * 7, unit * 7);
      c.fillStyle = "#fff";
      c.fillRect(ox + (fx + 1) * unit, oy + (fy + 1) * unit, unit * 5, unit * 5);
      c.fillStyle = INK;
      c.fillRect(ox + (fx + 2) * unit, oy + (fy + 2) * unit, unit * 3, unit * 3);
    };
    // Decorative pattern only: it is deliberately not a scannable code.
    for (let r = 0; r < 21; r++) for (let k = 0; k < 21; k++) {
      if ((r < 8 && (k < 8 || k > 12)) || (r > 12 && k < 8)) continue;
      if ((r * 7 + k * 11 + ((r * k) % 5)) % 3 === 0) (c.fillStyle = INK), c.fillRect(ox + k * unit, oy + r * unit, unit, unit);
    }
    finder(0, 0);
    finder(14, 0);
    finder(0, 14);
  },
  calendar(c, x, y) {
    box(20, c, x + 20, y + 30, 400, 340, "#ffffff", LINE);
    box(20, c, x + 20, y + 30, 400, 74, BLUE);
    label(c, "DATE OF BIRTH", x + 220, y + 78, 28, "#fff", 700, "center");
    for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) box(8, c, x + 46 + k * 60, y + 130 + r * 56, 48, 42, r === 2 && k === 3 ? ORANGE : PALE);
  },
  percent(c, x, y) {
    box(20, c, x + 20, y + 30, 400, 340, "#ffffff", LINE);
    box(10, c, x + 80, y + 220, 90, 110, "#93b4f5");
    box(10, c, x + 270, y + 140, 90, 190, GREEN);
    label(c, "80", x + 125, y + 355, 26, MUTED, 700, "center");
    label(c, "100", x + 315, y + 355, 26, MUTED, 700, "center");
    label(c, "+25%", x + 220, y + 108, 54, GREEN, 700, "center");
  },
  text(c, x, y) {
    sheet(c, x + 60, y, 270, 390, "", BLUE);
    box(18, c, x + 230, y + 270, 200, 90, BLUE);
    label(c, "1,000", x + 330, y + 316, 40, "#fff", 700, "center");
    label(c, "words", x + 330, y + 346, 22, "#dbeafe", 400, "center");
  },
  code(c, x, y) {
    box(20, c, x, y + 50, 440, 300, "#0f172a");
    const rows = [["{", "#e2e8f0"], ['  "name": "demo",', "#93c5fd"], ['  "count": 3,', "#fca5a5"], ["}", "#e2e8f0"]];
    rows.forEach(([t, color], i) => label(c, t, x + 34, y + 130 + i * 52, 30, color, 400));
    box(6, c, x + 28, y + 246, 270, 6, "#ef4444");
    label(c, "trailing comma", x + 34, y + 322, 24, "#fca5a5");
  },
  redirect(c, x, y) {
    for (const [i, code, text, color] of [[0, "301", "permanent", GREEN], [1, "302", "temporary", ORANGE]]) {
      box(18, c, x + 10, y + 40 + i * 180, 420, 140, "#ffffff", LINE);
      label(c, code, x + 44, y + 130 + i * 180, 66, color);
      arrow(c, x + 190, y + 100 + i * 180, x + 300, color);
      label(c, text, x + 245, y + 148 + i * 180, 26, MUTED, 700, "center");
    }
  },
  robots(c, x, y) {
    box(20, c, x, y + 40, 440, 320, "#ffffff", LINE);
    label(c, "robots.txt", x + 34, y + 98, 32, INK);
    [["User-agent: *", INK], ["Disallow: /admin/", ORANGE], ["Allow: /", GREEN], ["Sitemap: …/sitemap.xml", BLUE]].forEach(([t, color], i) => label(c, t, x + 34, y + 160 + i * 52, 28, color, 400));
  },
};

function cover(slug, category, spec) {
  const canvas = createCanvas(1200, 630);
  const c = canvas.getContext("2d");
  const bg = c.createLinearGradient(0, 0, 1200, 630);
  bg.addColorStop(0, "#f7f9ff");
  bg.addColorStop(1, "#dfe9ff");
  c.fillStyle = bg;
  c.fillRect(0, 0, 1200, 630);
  c.fillStyle = BLUE;
  c.fillRect(0, 0, 14, 630);
  c.font = font(24);
  const chip = c.measureText(category.toUpperCase()).width + 44;
  box(24, c, 72, 96, chip, 48, BLUE);
  label(c, category.toUpperCase(), 72 + chip / 2, 128, 24, "#fff", 700, "center");
  let px = 66;
  let lines = wrap(c, spec.headline, 560, px);
  while ((lines.length > 3 || lines.some((l) => c.measureText(l).width > 560)) && px > 40) lines = wrap(c, spec.headline, 560, (px -= 4));
  lines.forEach((line, i) => label(c, line, 72, 240 + i * px * 1.18, px));
  label(c, "Premier SEO Services", 72, 560, 28, MUTED);
  MOTIFS[spec.motif](c, 690, 115, spec);
  save(canvas, slug);
}

function table(name, title, head, rows, widths) {
  const canvas = createCanvas(1200, 750);
  const c = canvas.getContext("2d");
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, 1200, 750);
  label(c, title, 60, 90, 40);
  let y = 140;
  [head, ...rows].forEach((row, r) => {
    box(12, c, 60, y, 1080, 100, r === 0 ? BLUE : r % 2 ? "#f4f7ff" : "#ffffff", r === 0 ? null : LINE);
    let x = 84;
    row.forEach((cell, k) => {
      label(c, cell, x, y + 62, 30, r === 0 ? "#fff" : k === 0 ? INK : MUTED, r === 0 || k === 0 ? 700 : 400);
      x += widths[k];
    });
    y += 112;
  });
  save(canvas, name);
}

/* ---------------- covers and diagrams ---------------- */
for (const file of readdirSync("src/content/blog").filter((f) => f.endsWith(".md"))) {
  const meta = JSON.parse(/^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(`src/content/blog/${file}`, "utf8"))[1]);
  cover(file.slice(0, -3), meta.category, meta.cover);
}
table("jpg-vs-png-vs-webp-example", "JPG, PNG and WebP compared", ["Feature", "JPG", "PNG", "WebP"], [
  ["Compression", "Lossy", "Lossless", "Lossy or lossless"],
  ["Transparency", "No", "Yes", "Yes"],
  ["Animation", "No", "No (standard)", "Yes"],
  ["Typical use", "Photos", "Logos, screens", "Web pages"],
], [300, 220, 270, 270]);
table("301-vs-302-redirects-example", "How Google documents redirect types", ["Redirect", "Status codes", "URL shown in search results"], [
  ["Permanent", "301, 308", "The new target address"],
  ["Temporary", "302, 303, 307", "The original address"],
  ["Instant meta refresh", "—", "Treated as permanent"],
  ["Delayed meta refresh", "—", "Treated as temporary"],
], [330, 260, 460]);
console.log("covers and diagrams written");

/* ---------------- tool screenshots ---------------- */
const BASE = process.argv[2]?.replace(/\/$/, "");
if (!BASE) process.exit(0);

const { chromium } = require("playwright-core");
const { PDFDocument, StandardFonts } = require("pdf-lib");
const photo = (w, h) => {
  const k = createCanvas(w, h);
  const c = k.getContext("2d");
  scene(c, 0, 0, w, h);
  // Fine grain gives the sample the file size of a real photo, so compression has work to do.
  const data = c.getImageData(0, 0, w, h);
  for (let i = 0, seed = 11; i < data.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const n = ((seed >> 16) & 31) - 15;
    for (let j = 0; j < 3; j++) data.data[i + j] += n;
  }
  c.putImageData(data, 0, 0);
  return k.toBuffer("image/jpeg", 92);
};
const pdf = async (title, pages = 1) => {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) doc.addPage([595, 842]).drawText(`${title}, page ${i + 1}`, { x: 60, y: 760, size: 22, font: f });
  return Buffer.from(await doc.save());
};
const file = (name, buffer, mimeType) => ({ name, buffer, mimeType });
const upload = (page, files) => page.locator('#tool input[type="file"]').first().setInputFiles(files);
const tool = (page) => page.locator("#tool");

const SHOTS = {
  "reduce-photo-size-in-kb": ["/reduce-image-size-in-kb/", async (page) => {
    await tool(page).getByRole("button", { name: "50 KB", exact: true }).click();
    await upload(page, [file("application-photo.jpg", photo(1600, 1200), "image/jpeg")]);
    await tool(page).getByRole("button", { name: /^Download .*\.jpe?g$/i }).first().waitFor({ timeout: 60000 });
  }],
  "reduce-pdf-file-size": ["/compress-pdf/", async (page) => {
    const doc = await PDFDocument.create();
    const img = await doc.embedJpg(photo(2000, 1500));
    for (let i = 0; i < 3; i++) doc.addPage([600, 450]).drawImage(img, { x: 0, y: 0, width: 600, height: 450 });
    await upload(page, [file("sample-report.pdf", Buffer.from(await doc.save()), "application/pdf")]);
    await tool(page).getByText("Target size", { exact: true }).click();
    await tool(page).getByRole("button", { name: "500 KB", exact: true }).click();
  }],
  "how-to-merge-pdf-files-on-phone": ["/merge-pdf/", async (page) => {
    await upload(page, [file("1-form.pdf", await pdf("Application form", 2), "application/pdf"), file("2-id.pdf", await pdf("Identity document"), "application/pdf"), file("3-certificate.pdf", await pdf("Certificate"), "application/pdf")]);
    await tool(page).getByRole("button", { name: "Merge PDFs" }).waitFor();
  }, { phone: true }],
  "how-to-convert-images-to-pdf": ["/jpg-to-pdf/", async (page) => {
    await upload(page, [1, 2, 3].map((n) => file(`scan-${n}.jpg`, photo(800, 1000), "image/jpeg")));
    await tool(page).getByRole("button", { name: "Convert to PDF" }).waitFor();
  }],
  "how-to-convert-heic-to-jpg": ["/heic-to-jpg-converter/", async () => {}],
  "how-to-create-a-qr-code-for-a-website": ["/qr-code-generator/", async (page) => {
    await tool(page).getByLabel("Website address").fill("https://example.com/menu");
    await page.waitForFunction(() => document.querySelector('#tool img[alt^="QR code"]'));
  }],
  "how-to-calculate-age-from-date-of-birth": ["/age-calculator/", async (page) => {
    const dates = tool(page).locator('input[type="date"]');
    await dates.nth(0).fill("2000-08-15");
    await dates.nth(1).fill("2026-11-26");
  }],
  "how-to-calculate-percentage-increase": ["/percentage-calculator/", async (page) => {
    await tool(page).getByText("% change", { exact: true }).click();
    const fields = tool(page).locator('input[inputmode="decimal"]');
    await fields.nth(0).fill("80");
    await fields.nth(1).fill("100");
  }],
  "how-to-count-words-in-an-essay": ["/word-counter/", async (page) => {
    await tool(page).locator("textarea").first().fill("Public libraries do more than lend books. They give people a quiet place to study, free access to the internet and help from trained staff.\n\nThis essay argues that cutting opening hours affects students and job seekers first, because they have the fewest alternatives.");
  }],
  "how-to-fix-invalid-json": ["/json-viewer/", async (page) => {
    await tool(page).locator("textarea").first().fill('{\n  "name": "demo",\n  "tags": ["a", "b",],\n  "count": 3\n}');
    await page.waitForTimeout(800);
  }],
  "robots-txt-guide": ["/robots-txt-generator/", async (page) => {
    await tool(page).getByLabel("Path", { exact: false }).first().fill("/admin/");
    await page.waitForFunction(() => document.querySelector("#tool")?.innerText.includes("Disallow: /admin/"));
  }],
};

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const [slug, [route, prepare, opts = {}]] of Object.entries(SHOTS)) {
  const context = await browser.newContext({ viewport: opts.phone ? { width: 390, height: 844 } : { width: 1200, height: 900 }, deviceScaleFactor: opts.phone ? 2 : 1, colorScheme: "light", reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await prepare(page);
  await page.waitForTimeout(1200);
  await page.addStyleTag({ content: "header{position:static!important}" });
  const stage = tool(page);
  // On the phone the useful part is the file list and the button, not the empty top of the drop area.
  const png = await stage.screenshot({ animations: "disabled" });
  const shot = await loadImage(png);
  const canvas = createCanvas(1200, 750);
  const c = canvas.getContext("2d");
  c.fillStyle = "#eef3ff";
  c.fillRect(0, 0, 1200, 750);
  if (opts.phone) {
    const h = Math.min(shot.height, Math.round(shot.width * 1.9));
    const w = (710 / h) * shot.width;
    c.drawImage(shot, 0, 0, shot.width, h, (1200 - w) / 2, 20, w, 710);
  } else {
    const scale = 1160 / shot.width;
    const srcH = Math.min(shot.height, 710 / scale);
    c.drawImage(shot, 0, 0, shot.width, srcH, 20, (750 - srcH * scale) / 2, 1160, srcH * scale);
  }
  save(canvas, `${slug}-example`);
  console.log("captured", slug);
  await context.close();
}
await browser.close();
