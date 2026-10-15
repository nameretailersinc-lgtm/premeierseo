import fs from "node:fs";
import { chromium } from "playwright-core";
import { AxeBuilder } from "@axe-core/playwright";

const base = process.argv[2] || "http://localhost:3226";
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const results = [];
try {
  for (const colorScheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme });
    for (const path of ["/blog/google-indexing-troubleshooting/", "/contact/", "/meta-tags-analyzer/"]) {
      const page = await context.newPage();
      await page.goto(base + path, { waitUntil: "networkidle", timeout: 30000 });
      const report = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      results.push({ path, colorScheme, overflow, violations: report.violations.map(({ id, impact, nodes }) => ({ id, impact, count: nodes.length })) });
      await page.close();
    }
    await context.close();
  }
} finally { await browser.close(); }
fs.writeFileSync("docs/organic-browser-results-2026-10-15.json", JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
if (results.some((r) => r.overflow || r.violations.length)) process.exitCode = 1;
