/*
 * Content and registry validation. Run: npm run validate
 * Fails (exit 1) on errors; prints warnings. Enforces the SEO/UX rules from docs/master-implementation-plan.md.
 */
import fs from "node:fs";
import path from "node:path";
import { CATEGORIES } from "../src/content/categories";
import { GUIDES } from "../src/content/guides";
import { TOOLS } from "../src/content/tools";
import migration from "../src/seo/migration.json";

const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

const BANNED = [
  /in today's digital/i,
  /whether you're a/i,
  /unlock the power/i,
  /take your .* to the next level/i,
  /revolutioni[sz]e/i,
  /game[- ]changing/i,
  /seamless(ly)?/i,
  /\bdelve\b/i,
  /\bunlimited\b/i,
  /100% free/i,
  /\bbest\b.*\btool\b/i,
  /\b202[0-9]\b.*(tool|free)/i,
  /cutting[- ]edge/i,
  /\bleverage\b/i,
  /\bempower/i,
  /\brobust\b/i,
  /look no further/i,
  /in the realm of/i,
  /elevate your/i,
];

const redirects = migration.redirects as Record<string, string>;
const gone = new Set(migration.gone as string[]);
const livePaths = new Set<string>(["/", "/tools/", "/blog/", ...CATEGORIES.map((c) => c.path), ...TOOLS.map((t) => t.path), ...GUIDES.map((g) => g.path)]);
["/about-us/", "/contact/", "/faq/", "/privacy-policy/", "/terms-and-conditions/", "/write-for-us/", "/tool-complain/"].forEach((p) => livePaths.add(p));

const seen = { id: new Map<string, string>(), path: new Map<string, string>(), title: new Map<string, string>(), desc: new Map<string, string>(), h1: new Map<string, string>() };
const ids = new Set(TOOLS.map((t) => t.id));
const widgetsDir = path.join(__dirname, "..", "src", "tools", "widgets");
const registrySrc = fs.readFileSync(path.join(__dirname, "..", "src", "tools", "registry.tsx"), "utf8");

function checkLinks(where: string, text: string) {
  const re = /\]\((\/[^)\s]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const href = m[1].split("#")[0].split("?")[0];
    if (!href.endsWith("/")) err(`${where}: internal link without trailing slash: ${href}`);
    if (redirects[href]) err(`${where}: links to a redirected URL ${href} → use ${redirects[href]}`);
    else if (gone.has(href)) err(`${where}: links to a removed (410) URL ${href}`);
    else if (!livePaths.has(href)) (href.startsWith("/blog/") ? warn : err)(`${where}: links to unknown page ${href}`);
  }
}

function checkText(where: string, text: string) {
  for (const b of BANNED) if (b.test(text)) warn(`${where}: banned/cliché phrase ${b}`);
  checkLinks(where, text);
}

for (const t of TOOLS) {
  const w = `tool ${t.id}`;
  for (const [k, map] of [
    ["id", seen.id],
    ["path", seen.path],
    ["title", seen.title],
    ["metaDescription", seen.desc],
    ["h1", seen.h1],
  ] as const) {
    const v = String((t as unknown as Record<string, unknown>)[k]).toLowerCase();
    if (map.has(v)) err(`${w}: duplicate ${k} with ${map.get(v)}`);
    map.set(v, t.id);
  }
  if (!/^\/[a-z0-9-]+(\/[a-z0-9-]+)?\/$/.test(t.path)) err(`${w}: bad path ${t.path}`);
  if (t.path.split("/").filter(Boolean).pop() !== t.id) err(`${w}: id must equal the last path segment`);
  if (redirects[t.path] || gone.has(t.path)) err(`${w}: path is in the redirect/gone map`);
  if (t.title.length > 60 || t.title.length < 25) err(`${w}: title length ${t.title.length} (25–60)`);
  if (t.metaDescription.length < 110 || t.metaDescription.length > 160) err(`${w}: description length ${t.metaDescription.length} (110–160)`);
  if (/[\u{1F300}-\u{1FAFF}]/u.test(t.h1 + t.name)) err(`${w}: emoji in H1/name`);
  if (t.summary.length < 40 || t.summary.length > 240) err(`${w}: summary length ${t.summary.length} (40–240)`);
  if (t.card.length < 25 || t.card.length > 110) warn(`${w}: card length ${t.card.length} (25–110)`);
  if (!CATEGORIES.find((c) => c.id === t.category)) err(`${w}: unknown category ${t.category}`);
  const cat = CATEGORIES.find((c) => c.id === t.category);
  if (cat && !cat.groups.some((g) => g.id === t.subgroup)) err(`${w}: subgroup "${t.subgroup}" is not a group of ${t.category}`);
  if (!registrySrc.includes(`"${t.widget}"`) && !registrySrc.includes(` ${t.widget}:`)) err(`${w}: widget "${t.widget}" is not registered`);
  const wf = path.join(widgetsDir, `${t.widget}.tsx`);
  if (!fs.existsSync(wf)) err(`${w}: widget file missing ${t.widget}.tsx`);
  else if (fs.readFileSync(wf, "utf8").includes("WIDGET_PLACEHOLDER")) err(`${w}: widget ${t.widget} is still a placeholder`);
  if (t.steps.length < 2 && t.archetype !== "calculator") warn(`${w}: fewer than 2 steps`);
  if (t.sections.length < 2) warn(`${w}: fewer than 2 content sections`);
  if (t.faq.length < 2) warn(`${w}: fewer than 2 FAQs`);
  if (t.features.length < 2) warn(`${w}: fewer than 2 features`);
  if (t.aliases.length < 3) warn(`${w}: fewer than 3 search aliases`);
  for (const r of t.related) if (!ids.has(r)) err(`${w}: related id "${r}" does not exist`);
  if (t.related.length < 3) warn(`${w}: fewer than 3 related tools`);
  for (const l of t.links ?? []) {
    if (!l.href.startsWith("/")) continue;
    checkLinks(`${w} links[]`, `[x](${l.href})`);
  }
  if (t.processing === "third-party" && !t.thirdParty) err(`${w}: third-party processing needs thirdParty`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.updated)) err(`${w}: updated must be yyyy-mm-dd`);
  const allText = [t.summary, t.card, ...t.steps, ...t.sections.map((s) => s.heading + "\n" + s.body), ...t.faq.map((f) => f.q + "\n" + f.a), ...(t.useCases ?? []), t.example?.note ?? ""].join("\n");
  checkText(w, allText);
  const words = allText.split(/\s+/).length;
  if (words < 250) warn(`${w}: only ${words} words of content`);
  if (words > 1600) warn(`${w}: ${words} words (check for filler)`);
}

for (const c of CATEGORIES) {
  const n = TOOLS.filter((t) => t.category === c.id).length;
  if (!n) warn(`category ${c.id}: no tools yet`);
  for (const g of c.groups) if (n && !TOOLS.some((t) => t.category === c.id && t.subgroup === g.id)) warn(`category ${c.id}: empty group ${g.id}`);
  checkText(`category ${c.id}`, [c.intro, ...c.sections.map((s) => s.body), ...c.faq.map((f) => f.a)].join("\n"));
}

for (const g of GUIDES) {
  const w = `guide ${g.slug}`;
  if (g.title.length > 65) err(`${w}: title too long`);
  if (g.metaDescription.length < 110 || g.metaDescription.length > 160) err(`${w}: description length ${g.metaDescription.length}`);
  for (const id of g.tools) if (!ids.has(id)) err(`${w}: tool ${id} does not exist`);
  checkText(w, g.body.map((b) => b.heading + "\n" + b.body).join("\n"));
}

// Placeholder widgets that no tool uses are fine; placeholders used by tools are errors (above).
const expected = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "keyword-map.json"), "utf8")) as {
  pages: { url: string; pageType: string; action: string }[];
};
const expectedTools = expected.pages.filter((p) => p.pageType === "tool" && ["keep", "new", "noindex"].includes(p.action)).map((p) => p.url);
const missing = expectedTools.filter((u) => !TOOLS.some((t) => t.path === u));
if (missing.length) (process.argv.includes("--strict") ? err : warn)(`${missing.length} planned tools not in the registry yet: ${missing.slice(0, 40).join(" ")}${missing.length > 40 ? " …" : ""}`);

console.log(`Tools: ${TOOLS.length} · Categories: ${CATEGORIES.length} · Guides: ${GUIDES.length}`);
if (warnings.length) console.log(`\nWarnings (${warnings.length}):\n- ` + warnings.join("\n- "));
if (errors.length) {
  console.log(`\nErrors (${errors.length}):\n- ` + errors.join("\n- "));
  process.exit(1);
}
console.log("\nOK: no errors.");
