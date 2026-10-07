/*
 * Tool search matcher (docs/user-experience-audit.md §4). Pure functions; runs in the
 * browser over a ~180-entry index in well under 5 ms per keystroke. No library.
 */

export interface SearchEntry {
  id: string;
  path: string;
  name: string;
  short: string;
  category: string;
  categoryLabel: string;
  aliases: string[];
  keywords: string[];
  from?: string[];
  to?: string[];
  targetKB?: number;
  media?: string;
  priority: number;
}

export interface CategoryEntry {
  id: string;
  path: string;
  label: string;
  aliases: string[];
  count: number;
}

export interface SearchIndex {
  tools: SearchEntry[];
  categories: CategoryEntry[];
}

export type Hit =
  | { kind: "tool"; entry: SearchEntry; tier: string; score: number }
  | { kind: "category"; entry: CategoryEntry; tier: "cat"; score: number }
  | { kind: "notice"; text: string };

const SYNONYMS: Record<string, string[]> = {
  compress: ["reduce", "shrink", "smaller", "optimize", "optimise", "optimizer"],
  merge: ["combine", "join"],
  split: ["separate", "extract"],
  image: ["photo", "picture", "pic", "img", "images", "photos"],
  count: ["counter", "counting"],
  check: ["checker", "test", "tester", "validate", "validator", "analyzer", "analyser"],
  generate: ["generator", "create", "maker", "make"],
  remove: ["delete", "strip", "clean"],
  case: ["uppercase", "lowercase", "capitalize", "capitalise"],
  down: ["uptime", "status", "offline"],
  ip: ["address", "location"],
  base64: ["b64"],
  url: ["link", "links"],
  schema: ["jsonld", "structured"],
  emi: ["loan", "mortgage", "installment"],
  gst: ["vat", "tax"],
  epoch: ["unix", "timestamp"],
  beautify: ["format", "formatter", "prettify", "pretty"],
  heic: ["heif", "iphone"],
  convert: ["converter", "conversion"],
  resize: ["resizer"],
  word: ["words"],
  character: ["characters", "letter", "letters", "char"],
  password: ["passcode"],
  duplicate: ["duplicates", "dupes"],
  qr: ["qrcode"],
};
const SYN_INDEX = new Map<string, string>();
for (const [k, list] of Object.entries(SYNONYMS)) for (const s of list) SYN_INDEX.set(s, k);

const STOP = new Set(["free", "online", "tool", "tools", "best", "app", "website", "instantly", "my", "a", "an", "the", "for", "of", "in"]);
const FORMATS = new Set(["jpg", "png", "webp", "svg", "gif", "heic", "avif", "ico", "pdf", "word", "docx", "text", "binary", "hex", "decimal", "octal", "ascii", "json", "csv", "html", "mp4", "video", "image", "rgb", "unicode", "zip", "kb", "mb"]);

export function normalize(q: string): string {
  let s = q
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/→|->|2(?=[a-z])/g, " to ")
    .replace(/jpeg/g, "jpg")
    .replace(/(\d+)\s*(kbs?|kilobytes?|k)\b/g, "$1 kb")
    .replace(/(\d+)\s*(mbs?|megabytes?)\b/g, "$1 mb")
    .replace(/[^a-z0-9.%#]+/g, " ")
    .replace(/(?<![a-z])\.(?![a-z])/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  s = s.replace(/\b(\w+) (\w+)\b/g, (m, a, b) => (FORMATS.has(a) && FORMATS.has(b) && a !== b && !/\d/.test(a) ? `${a} to ${b}` : m));
  return s;
}

function tokens(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean);
}

function canon(t: string): string {
  return SYN_INDEX.get(t) ?? t;
}

/** Damerau–Levenshtein distance with early exit. */
function dl(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

function tokenMatch(q: string, t: string): number {
  if (q === t) return 1;
  const cq = canon(q);
  if (cq === canon(t)) return 0.85;
  if (q.length >= 2 && t.startsWith(q)) return 0.8;
  if (q.length >= 4) {
    const max = q.length >= 7 ? 2 : 1;
    if (dl(q, t, max) <= max) return 0.7;
    if (t.length > q.length && dl(q, t.slice(0, q.length), 1) <= 1 && q.length >= 5) return 0.6;
  }
  return 0;
}

interface Prepared {
  e: SearchEntry;
  name: string;
  nameT: string[];
  aliases: string[];
  aliasT: string[][];
  kwT: string[];
  catT: string[];
  shortT: string[];
}

let cache: { src: SearchEntry[]; prep: Prepared[] } | null = null;
function prepare(list: SearchEntry[]): Prepared[] {
  if (cache?.src === list) return cache.prep;
  const prep = list.map((e) => ({
    e,
    name: normalize(e.name),
    nameT: tokens(e.name),
    aliases: e.aliases.map(normalize),
    aliasT: e.aliases.map(tokens),
    kwT: e.keywords.flatMap(tokens),
    catT: tokens(e.categoryLabel),
    shortT: tokens(e.short).filter((t) => !STOP.has(t)),
  }));
  cache = { src: list, prep };
  return prep;
}

function bestIn(q: string, list: string[]): number {
  let b = 0;
  for (const t of list) {
    const s = tokenMatch(q, t);
    if (s > b) b = s;
    if (b === 1) break;
  }
  return b;
}

export function search(index: SearchIndex, query: string, recent: string[] = [], limit = 8): Hit[] {
  const nq = normalize(query);
  if (!nq) return [];
  const qt = nq.split(" ").filter(Boolean);
  const content = qt.filter((t) => !STOP.has(t));
  const qTokens = content.length ? content : qt;
  const hits: Hit[] = [];

  // Category rows
  for (const c of index.categories) {
    const labels = [normalize(c.label), ...c.aliases.map(normalize)];
    if (labels.some((l) => l === nq || (nq.length >= 3 && l.startsWith(nq)))) {
      hits.push({ kind: "category", entry: c, tier: "cat", score: 1000 });
    }
  }

  // number + unit rule
  const nkb = /(\d+(?:\.\d+)?) (kb|mb)/.exec(nq);
  const targetKB = nkb ? Number(nkb[1]) * (nkb[2] === "mb" ? 1000 : 1) : null;
  const wantsPdf = qTokens.includes("pdf");
  // format pair rule
  const pair = /\b([a-z0-9]+) to ([a-z0-9]+)\b/.exec(nq);

  const scored: { e: SearchEntry; tier: string; score: number }[] = [];
  for (const p of prepare(index.tools)) {
    let tier = "";
    let score = 0;
    if (p.name === nq || p.aliases.includes(nq)) {
      tier = "A";
      score = 100;
    } else if (p.name.startsWith(nq) || p.aliases.some((a) => a.startsWith(nq))) {
      tier = "B";
      score = 80;
    } else {
      let sum = 0;
      let matched = 0;
      for (const q of qTokens) {
        if (/^\d+(\.\d+)?$/.test(q) || q === "to") {
          continue;
        }
        const name = bestIn(q, p.nameT) * 10;
        const alias = Math.max(0, ...p.aliasT.map((a) => bestIn(q, a))) * 8;
        const kw = bestIn(q, p.kwT) * 4;
        const cat = bestIn(q, p.catT) * 3;
        const sh = bestIn(q, p.shortT) * 1;
        const s = Math.max(name, alias, kw, cat, sh);
        if (s > 0) matched++;
        sum += s;
      }
      const considered = qTokens.filter((q) => !/^\d+(\.\d+)?$/.test(q) && q !== "to").length || 1;
      if (matched === considered && sum > 0) {
        tier = sum / considered >= 3.5 ? "C" : "E";
        score = sum / considered;
      } else if (considered >= 3 && matched >= considered / 2) {
        tier = "D";
        score = sum / considered;
      }
      // Order bonus: query tokens in the same order as the name
      if (tier && qTokens.length > 1) {
        const pos = qTokens.map((q) => p.nameT.findIndex((t) => tokenMatch(q, t) > 0)).filter((i) => i >= 0);
        if (pos.length > 1 && pos.every((v, i) => i === 0 || v > pos[i - 1])) score *= 1.2;
      }
    }
    if (targetKB !== null && p.e.targetKB !== undefined) {
      const mediaOk = wantsPdf ? p.e.media === "pdf" : p.e.media !== "pdf";
      if (p.e.targetKB === targetKB && mediaOk) {
        tier = tier && tier < "C" ? tier : "B";
        score += 60;
      }
    }
    if (pair && (p.e.from || p.e.to)) {
      const [, x, y] = pair;
      const fromOk = p.e.from?.includes(x);
      const toOk = p.e.to?.includes(y);
      if (fromOk && toOk) {
        tier = tier && tier < "B" ? tier : "B";
        score += 50;
      } else if (p.e.from?.includes(y) && p.e.to?.includes(x)) score -= 30;
    }
    if (!tier) continue;
    if (recent.includes(p.e.id)) score *= 1.1;
    score += (4 - p.e.priority) * 0.5;
    scored.push({ e: p.e, tier, score });
  }

  scored.sort((a, b) => (a.tier === b.tier ? b.score - a.score : a.tier < b.tier ? -1 : 1) || a.e.name.length - b.e.name.length);

  if (pair) {
    const [, x, y] = pair;
    const exact = scored.some((s) => s.e.from?.includes(x) && s.e.to?.includes(y));
    if (!exact && FORMATS.has(x) && FORMATS.has(y) && scored.length) {
      hits.push({ kind: "notice", text: `No ${x.toUpperCase()} to ${y.toUpperCase()} tool yet. Related tools:` });
    }
  }
  for (const s of scored.slice(0, limit)) hits.push({ kind: "tool", entry: s.e, tier: s.tier, score: s.score });
  return hits;
}

/** Highlight query tokens inside a name (returns segments). */
export function highlight(name: string, query: string): { text: string; mark: boolean }[] {
  const qt = tokens(query).filter((t) => t.length > 1 && !STOP.has(t));
  if (!qt.length) return [{ text: name, mark: false }];
  const re = new RegExp(`(${qt.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return name
    .split(re)
    .filter(Boolean)
    .map((part) => ({ text: part, mark: qt.some((t) => part.toLowerCase() === t) }));
}
