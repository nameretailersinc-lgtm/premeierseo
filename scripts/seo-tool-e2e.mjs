/*
 * Real-browser output checks for priority and new tools, plus mobile overflow and WCAG (axe) checks.
 *
 *   node scripts/seo-tool-e2e.mjs http://localhost:3300 [screenshot-dir]
 *
 * Uses the installed Chrome (set CHROME_PATH if it lives elsewhere), Python with OpenCV for QR
 * decoding, and synthetic files only. Writes seo/browser-test-results.json.
 */
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { AxeBuilder } from "@axe-core/playwright";

const require = createRequire(import.meta.url);
const canvasLib = require("@napi-rs/canvas");
const { PDFDocument, StandardFonts } = require("pdf-lib");
const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const SHOTS = process.argv[3];
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

/* ---------- synthetic fixtures ---------- */
/** Deterministic noise so JPEG files are large enough that compression has real work to do. */
function noisy(w, h, mime = "image/jpeg") {
  const c = canvasLib.createCanvas(w, h);
  const x = c.getContext("2d");
  const data = x.createImageData(w, h);
  let seed = 7;
  for (let i = 0; i < data.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const n = (seed >> 16) & 63;
    const col = ((i / 4) % w) / w;
    data.data[i] = 60 + col * 150 + n;
    data.data[i + 1] = 90 + n;
    data.data[i + 2] = 200 - col * 120 + n;
    data.data[i + 3] = 255;
  }
  x.putImageData(data, 0, 0);
  return mime === "image/jpeg" ? c.toBuffer(mime, 92) : c.toBuffer(mime);
}
async function textPdf(pages) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const t of pages) doc.addPage([400, 500]).drawText(t, { x: 30, y: 440, size: 16, font });
  return Buffer.from(await doc.save());
}
async function photoPdf() {
  const doc = await PDFDocument.create();
  const img = await doc.embedJpg(noisy(2000, 1500));
  for (let i = 0; i < 2; i++) doc.addPage([600, 450]).drawImage(img, { x: 0, y: 0, width: 600, height: 450 });
  return Buffer.from(await doc.save());
}
const file = (name, buffer, mimeType) => ({ name, buffer, mimeType });

const browser = await chromium.launch({ executablePath: CHROME });
const results = [];
const consoleProblems = [];

async function test(name, route, run, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage();
  page.on("pageerror", (e) => consoleProblems.push({ route, error: e.message }));
  page.on("console", (m) => m.type() === "error" && consoleProblems.push({ route, error: m.text() }));
  try {
    await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });
    const detail = await run(page);
    results.push({ name, route, status: "PASS", detail: detail ?? "" });
  } catch (e) {
    results.push({ name, route, status: "FAIL", detail: e.message.split("\n").slice(0, 3).join(" ") });
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `fail-${results.length}.png`), fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
}

const tool = (page) => page.locator("#tool");
const text = async (page) => (await tool(page).innerText()).replace(/\u00a0/g, " ");
const waitText = (page, re) =>
  page.waitForFunction(([src, flags]) => new RegExp(src, flags).test(document.querySelector("#tool")?.innerText ?? ""), [re.source, re.flags], { timeout: 60000 });
async function download(page, locator) {
  const [d] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), locator.click()]);
  return { name: d.suggestedFilename(), bytes: fs.readFileSync(await d.path()) };
}
const click = (page, name) => tool(page).getByRole("button", { name, exact: true }).first().click();

/* ---------- calculators ---------- */
await test("APY: rate to APY, balance and reverse", "/apy-calculator/", async (page) => {
  await click(page, "Example");
  await waitText(page, /5\.1162%/);
  assert.match(await text(page), /10,511\.62/);
  await tool(page).getByText("APY → rate", { exact: true }).click();
  await click(page, "Example");
  await waitText(page, /Nominal annual rate\s+5\.00%/);
  await tool(page).getByText("Interest paid → APY", { exact: true }).click();
  await click(page, "Example");
  await waitText(page, /5\.392%/);
  await click(page, "Reset");
  await tool(page).getByLabel("Principal").fill("0");
  assert.doesNotMatch(await text(page), /NaN|Infinity/);
  return "5% monthly = 5.1162%; 10,511.62 after 12 months; reverse 5.00%; Regulation DD example 5.392% (5.39% rounded)";
});
await test("Body fat: both equations, units and invalid input", "/body-fat-calculator/", async (page) => {
  await click(page, "Example");
  await waitText(page, /16\.4%/);
  await tool(page).getByText("Female", { exact: true }).click();
  await click(page, "Example");
  await waitText(page, /26\.4%/);
  await tool(page).getByText("Imperial (in)", { exact: true }).click();
  assert.equal(await tool(page).getByLabel("Height").inputValue(), "", "switching units clears inputs");
  await tool(page).getByText("Male", { exact: true }).click();
  await tool(page).getByLabel("Height").fill("70");
  await tool(page).getByLabel("Neck").fill("30");
  await tool(page).getByLabel("Waist").fill("20");
  await waitText(page, /can't give a sensible estimate|can’t give a sensible estimate/);
  assert.doesNotMatch(await text(page), /NaN/);
  return "Male example 16.4%, female 26.4%; units reset; impossible measurements rejected";
});
await test("Percentage calculator example", "/percentage-calculator/", async (page) => {
  const fields = tool(page).locator('input[inputmode="decimal"]');
  await fields.nth(0).fill("15");
  await fields.nth(1).fill("200");
  await waitText(page, /\b30\b/);
  return "15% of 200 = 30";
});
await test("Word counter live count", "/word-counter/", async (page) => {
  await tool(page).locator("textarea").first().fill("One two three four five.\n\nSix seven.");
  await waitText(page, /\b7\b/);
  return "7 words counted";
});

/* ---------- QR ---------- */
await test("QR with logo: level locked to H, PNG and SVG downloads decode", "/qr-code-generator/", async (page) => {
  const url = "https://example.com/menu?table=12";
  await tool(page).getByLabel("Website address").fill(url);
  await page.waitForFunction(() => document.querySelector('#tool img[alt^="QR code"]'));
  const logo = canvasLib.createCanvas(300, 300);
  const lx = logo.getContext("2d");
  lx.fillStyle = "#0b57d0";
  lx.fillRect(0, 0, 300, 300);
  await tool(page).getByLabel("Logo in the center (optional)").setInputFiles(file("logo.png", logo.toBuffer("image/png"), "image/png"));
  await tool(page).getByRole("button", { name: "Remove logo" }).waitFor();
  const ecc = tool(page).getByLabel("Error correction");
  assert.equal(await ecc.inputValue(), "H");
  assert.equal(await ecc.isDisabled(), true);
  await tool(page).getByLabel(/^Logo width/).fill("22");
  await page.waitForTimeout(600);
  const png = await download(page, tool(page).getByRole("button", { name: "PNG" }));
  const py = "import sys,cv2,numpy as np\na=cv2.imdecode(np.frombuffer(sys.stdin.buffer.read(),dtype=np.uint8),cv2.IMREAD_COLOR)\nprint(cv2.QRCodeDetector().detectAndDecode(a)[0])";
  const decoded = spawnSync("python", ["-I", "-c", py], { input: png.bytes, encoding: "utf8", timeout: 30000 });
  assert.equal(decoded.status, 0, decoded.stderr);
  assert.equal(decoded.stdout.trim(), url);
  const svg = await download(page, tool(page).getByRole("button", { name: "SVG" }));
  assert.match(svg.bytes.toString("utf8"), /<image [^>]*href="data:image\/png;base64,/);
  await tool(page).locator('input[type="file"]').setInputFiles(file("x.svg", Buffer.from("<svg/>"), "image/svg+xml"));
  await waitText(page, /Choose a PNG, JPG or WebP/);
  return "Downloaded PNG with a 22% logo decoded to the entered URL; SVG embeds the logo; SVG upload rejected";
});

/* ---------- images ---------- */
await test("Compress image to 50KB: real output is at or under 50,000 bytes", "/compress-image-to-50kb/", async (page) => {
  const input = noisy(1600, 1200);
  await tool(page).locator('input[type="file"]').first().setInputFiles(file("photo.jpg", input, "image/jpeg"));
  const btn = tool(page).getByRole("button", { name: /^Download .*\.(jpe?g|png|webp)$/i }).first();
  await btn.waitFor({ timeout: 60000 });
  const out = await download(page, btn);
  assert.ok(out.bytes.length <= 50000, `output ${out.bytes.length}`);
  return `${input.length} -> ${out.bytes.length} bytes`;
});
await test("Image compressor produces a smaller file", "/image-compressor/", async (page) => {
  const input = noisy(1200, 900);
  await tool(page).locator('input[type="file"]').first().setInputFiles(file("photo.jpg", input, "image/jpeg"));
  const btn = tool(page).getByRole("button", { name: /^Download .*\.(jpe?g|png|webp)$/i }).first();
  await btn.waitFor({ timeout: 60000 });
  const out = await download(page, btn);
  assert.ok(out.bytes.length < input.length, `output ${out.bytes.length}`);
  return `${input.length} -> ${out.bytes.length} bytes`;
});
await test("3000x3000 converter: exact output dimensions", "/3000x3000-image-converter/", async (page) => {
  await tool(page).locator('input[type="file"]').first().setInputFiles(file("wide.jpg", noisy(1000, 750), "image/jpeg"));
  await waitText(page, /3,?000 × 3,?000/);
  const btn = tool(page).getByRole("button", { name: /^Download .*\.(jpe?g|png|webp)$/i }).first();
  await btn.waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  const out = await download(page, btn);
  const img = await canvasLib.loadImage(out.bytes);
  assert.deepEqual([img.width, img.height], [3000, 3000]);
  return `1000x750 source -> ${img.width}x${img.height}, ${out.bytes.length} bytes`;
});
await test("PNG to JPG conversion yields a JPEG", "/png-to-jpg-converter/", async (page) => {
  await tool(page).locator('input[type="file"]').first().setInputFiles(file("shot.png", noisy(400, 300, "image/png"), "image/png"));
  const btn = tool(page).getByRole("button", { name: /^Download .*\.jpe?g$/i }).first();
  await btn.waitFor({ timeout: 60000 });
  const out = await download(page, btn);
  assert.equal(out.bytes.subarray(0, 2).toString("hex"), "ffd8");
  return `${out.name}, ${out.bytes.length} bytes`;
});

/* ---------- PDF ---------- */
await test("Merge PDF: two files become one with all pages", "/merge-pdf/", async (page) => {
  await tool(page).locator('input[type="file"]').first().setInputFiles([
    file("a.pdf", await textPdf(["Alpha one", "Alpha two"]), "application/pdf"),
    file("b.pdf", await textPdf(["Beta one"]), "application/pdf"),
  ]);
  await tool(page).getByRole("button", { name: "Merge PDFs" }).click();
  await waitText(page, /Merged/);
  const out = await download(page, tool(page).getByRole("button", { name: /^Download/ }).first());
  assert.equal((await PDFDocument.load(out.bytes)).getPageCount(), 3);
  return "3 pages";
});
await test("PDF to text: selected pages are extracted", "/pdf-to-text/", async (page) => {
  await tool(page).locator('input[type="file"]').first().setInputFiles(file("t.pdf", await textPdf(["Quarterly report", "Second page", "Closing notes"]), "application/pdf"));
  await tool(page).getByLabel("Pages to extract (optional)").fill("1,3");
  await tool(page).getByRole("button", { name: "Extract text" }).click();
  const out = tool(page).getByLabel("Extracted PDF text");
  await out.waitFor({ timeout: 60000 });
  const value = await out.inputValue();
  assert.match(value, /Quarterly report/);
  assert.match(value, /Closing notes/);
  assert.doesNotMatch(value, /Second page/);
  return "pages 1 and 3 only";
});
await test("PDF to text: a PDF without a text layer is reported", "/pdf-to-text/", async (page) => {
  await tool(page).locator('input[type="file"]').first().setInputFiles(file("scan.pdf", await photoPdf(), "application/pdf"));
  await tool(page).getByRole("button", { name: "Extract text" }).click();
  await waitText(page, /had no selectable text/);
  return "scan warning shown";
});
const compressTo = async (page, kb) => {
  const run = tool(page).getByRole("button", { name: new RegExp(`^Compress to ${kb} KB$`) });
  await run.click();
  await waitText(page, /Compressed to|Couldn.t reach/);
  const out = await download(page, tool(page).getByRole("button", { name: /^Download/ }).first());
  return out.bytes;
};
await test("Compress PDF general page: target mode with quick 200 KB", "/compress-pdf/", async (page) => {
  const input = await photoPdf();
  await tool(page).locator('input[type="file"]').first().setInputFiles(file("photos.pdf", input, "application/pdf"));
  await tool(page).getByText("Target size", { exact: true }).click();
  await tool(page).getByRole("button", { name: "200 KB", exact: true }).click();
  const out = await compressTo(page, 200);
  assert.ok(out.length <= 200000, `output ${out.length}`);
  assert.equal((await PDFDocument.load(out)).getPageCount(), 2);
  return `${input.length} -> ${out.length} bytes, 2 pages`;
});
await test("Compress PDF to 200KB preset page", "/compress-pdf-to-200kb/", async (page) => {
  const input = await photoPdf();
  await tool(page).locator('input[type="file"]').first().setInputFiles(file("photos.pdf", input, "application/pdf"));
  await tool(page).getByLabel("Target size (KB)").waitFor();
  assert.equal(await tool(page).getByLabel("Target size (KB)").inputValue(), "200");
  assert.equal(await tool(page).getByText("Smallest size", { exact: true }).count(), 0, "preset page has no mode switch");
  const out = await compressTo(page, 200);
  assert.ok(out.length <= 200000, `output ${out.length}`);
  return `${input.length} -> ${out.length} bytes`;
});
await test("Corrupt PDF shows an error, not a result", "/compress-pdf/", async (page) => {
  await tool(page).locator('input[type="file"]').first().setInputFiles(file("bad.pdf", Buffer.from("%PDF-1.7\nnot really"), "application/pdf"));
  await page.waitForFunction(() => /damaged|couldn.t|can.t|not a|invalid|corrupt/i.test(document.querySelector("#tool")?.innerText ?? ""));
  assert.equal(await tool(page).getByRole("button", { name: /^Download/ }).count(), 0);
  return "rejected with a message";
});

/* ---------- layout and accessibility on a phone ---------- */
const AUDIT = ["/", "/tools/", "/blog/", "/blog/jpg-vs-png-vs-webp/", "/blog/how-to-fix-invalid-json/", "/blog/how-to-merge-pdf-files-on-phone/", "/calculator-tools/", "/pdf-tools/", "/imaging-tools/", "/apy-calculator/", "/body-fat-calculator/", "/qr-code-generator/", "/compress-pdf/", "/pdf-to-text/", "/compress-pdf-to-200kb/", "/3000x3000-image-converter/", "/image-compressor/", "/word-counter/"];
const accessibility = [];
for (const colorScheme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width: 360, height: 780 }, colorScheme });
  for (const route of AUDIT) {
    const page = await context.newPage();
    await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });
    const report = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    accessibility.push({ route, colorScheme, overflow, violations: report.violations.map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")), count: v.nodes.length })) });
    await page.close();
  }
  await context.close();
}

/* Loaded-state check: the new controls must also pass once results are on screen. */
for (const route of ["/apy-calculator/", "/body-fat-calculator/"]) {
  await test(`axe with results shown (${route})`, route, async (page) => {
    await click(page, "Example");
    await page.waitForTimeout(1200);
    const report = await new AxeBuilder({ page }).include("#tool").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    assert.deepEqual(report.violations.map((v) => `${v.id}: ${v.nodes[0].target.join(" ")}`), []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "horizontal overflow");
  }, { width: 360, height: 780 });
}

/* Lab performance snapshot (unthrottled local server: use for regressions, not as field Core Web Vitals). */
const performanceLab = [];
for (const route of ["/", "/image-compressor/", "/merge-pdf/", "/word-counter/", "/qr-code-generator/"]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__lab = { lcp: 0, cls: 0 };
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__lab.lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__lab.cls += e.value))).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => ({ ...window.__lab, requests: performance.getEntriesByType("resource").length, transferKB: Math.round(performance.getEntriesByType("resource").reduce((n, r) => n + r.transferSize, 0) / 1024) }));
  performanceLab.push({ route, lcpMs: Math.round(m.lcp), cls: Number(m.cls.toFixed(4)), requests: m.requests, transferKB: m.transferKB });
  await context.close();
}

if (SHOTS) {
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const [name, width] of [["desktop", 1366], ["mobile", 390]]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    for (const route of ["/", "/apy-calculator/", "/body-fat-calculator/", "/qr-code-generator/"]) {
      const page = await context.newPage();
      await page.goto(BASE + route, { waitUntil: "networkidle" });
      if (route.includes("calculator")) await page.locator("#tool").getByRole("button", { name: "Example", exact: true }).click();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(SHOTS, `${name}${route === "/" ? "-home" : route.replaceAll("/", "-").slice(0, -1)}.png`), fullPage: route !== "/" ? false : true });
      await page.close();
    }
    await context.close();
  }
}
await browser.close();

const failed = results.filter((r) => r.status === "FAIL");
const a11yProblems = accessibility.filter((r) => r.overflow || r.violations.length);
fs.writeFileSync("seo/browser-test-results.json", JSON.stringify({ checkedAt: new Date().toISOString(), browser: "installed Chrome, headless", results, accessibility, performanceLab, consoleProblems }, null, 2) + "\n");
for (const r of results) console.log(r.status, r.name, "-", r.detail);
console.log(`\n${results.length - failed.length}/${results.length} tool checks passed`);
console.log(`${accessibility.length - a11yProblems.length}/${accessibility.length} phone-width pages clean (no overflow, no axe violations)`);
for (const p of a11yProblems) console.log(" ", p.colorScheme, p.route, p.overflow ? "OVERFLOW" : "", JSON.stringify(p.violations));
console.log("performance (lab):", JSON.stringify(performanceLab));
console.log("console problems:", JSON.stringify(consoleProblems.slice(0, 12)));
process.exit(failed.length || a11yProblems.length ? 1 : 0);
