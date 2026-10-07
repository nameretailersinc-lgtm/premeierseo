/*
 * robots.txt parsing and matching per RFC 9309 (Robots Exclusion Protocol) and Google's documented behavior:
 * - groups start with one or more user-agent lines; rules apply to the group above them
 * - the crawler obeys the group(s) whose user-agent matches its product token (case-insensitive); all matching
 *   groups are combined; if none matches, the "*" group; if there is no "*" group, everything is allowed
 * - the most specific (longest) matching rule wins; on a tie, Allow wins (least restrictive)
 * - "*" matches any sequence of characters, "$" anchors the end; paths are case-sensitive
 * - /robots.txt itself is always allowed
 * Plus robots.txt generation for the generator tool.
 */

export interface RobotsRule {
  type: "allow" | "disallow";
  path: string;
  line: number;
}

export interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
  line: number;
}

export interface RobotsLint {
  line: number;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface ParsedRobots {
  groups: RobotsGroup[];
  sitemaps: string[];
  lint: RobotsLint[];
  bytes: number;
}

export const GOOGLE_MAX_BYTES = 500 * 1024;

const KNOWN_IGNORED: Record<string, string> = {
  "crawl-delay": "Crawl-delay is ignored by Google (Bing and Yandex honor it).",
  host: "Host is a Yandex-only directive; other crawlers ignore it.",
  "clean-param": "Clean-param is a Yandex-only directive.",
  noindex: "Noindex in robots.txt has been unsupported by Google since September 2019. Use a robots meta tag or X-Robots-Tag header.",
  nofollow: "Nofollow isn't a robots.txt directive.",
  "request-rate": "Request-rate isn't supported by Google.",
  "visit-time": "Visit-time isn't supported by Google.",
};

export function parseRobots(text: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  const lint: RobotsLint[] = [];
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > GOOGLE_MAX_BYTES) lint.push({ line: 0, severity: "warning", message: `The file is ${Math.round(bytes / 1024)} KiB. Google reads only the first 500 KiB; rules after that are ignored.` });
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  text.split(/\r\n|\r|\n/).forEach((rawLine, idx) => {
    const line = idx + 1;
    const noComment = rawLine.replace(/#.*$/, "").trim();
    if (!noComment) return;
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(noComment);
    if (!m) {
      lint.push({ line, severity: "error", message: `Not a valid line (expected “field: value”): ${noComment.slice(0, 80)}` });
      return;
    }
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!value) lint.push({ line, severity: "error", message: "Empty user-agent." });
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [], line };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      return;
    }
    lastWasAgent = false;
    if (key === "allow" || key === "disallow") {
      if (!current) {
        lint.push({ line, severity: "error", message: `${m[1]} appears before any user-agent line, so it applies to no crawler.` });
        return;
      }
      if (value && !value.startsWith("/") && !value.startsWith("*"))
        lint.push({ line, severity: "warning", message: `Paths should start with / (found “${value}”). Google treats it as if it did.` });
      current.rules.push({ type: key, path: value && !value.startsWith("/") && !value.startsWith("*") ? `/${value}` : value, line });
      return;
    }
    if (key === "sitemap") {
      if (!/^https?:\/\//i.test(value)) lint.push({ line, severity: "error", message: "Sitemap must be a full URL, including https://." });
      sitemaps.push(value);
      return;
    }
    if (KNOWN_IGNORED[key]) {
      lint.push({ line, severity: key === "noindex" ? "warning" : "info", message: KNOWN_IGNORED[key] });
      return;
    }
    const near = ["user-agent", "allow", "disallow", "sitemap"].find((k) => levenshtein(k, key) <= 2);
    lint.push({ line, severity: "warning", message: near ? `Unknown field “${m[1]}”. Did you mean ${near}?` : `Unknown field “${m[1]}”; crawlers ignore it.` });
  });
  for (const g of groups) if (!g.rules.length) lint.push({ line: g.line, severity: "info", message: `The group for ${g.agents.join(", ")} has no rules, so those crawlers may crawl everything (unless the next lines were meant to belong to it).` });
  return { groups, sitemaps, lint, bytes };
}

function levenshtein(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Percent-encode characters outside the URL-safe set and normalize %xx to upper case, so patterns and paths compare equally. */
function normalizePath(p: string): string {
  let out = "";
  for (const ch of p) {
    if (/[A-Za-z0-9\-._~!$&'()*+,;=:@/?%]/.test(ch)) out += ch;
    else out += [...new TextEncoder().encode(ch)].map((b) => "%" + b.toString(16).toUpperCase().padStart(2, "0")).join("");
  }
  return out.replace(/%[0-9a-f]{2}/gi, (x) => x.toUpperCase());
}

function patternToRegex(pattern: string): RegExp {
  const p = normalizePath(pattern);
  const anchored = p.endsWith("$");
  const body = (anchored ? p.slice(0, -1) : p)
    .split("*")
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp("^" + body + (anchored ? "$" : ""));
}

/** Tokens a crawler obeys, most specific first (Google's crawlers fall back from e.g. googlebot-image to googlebot). */
export function crawlerTokens(agent: string): string[] {
  const t = agent.trim().toLowerCase();
  const out = [t];
  if (t.startsWith("googlebot-") && t !== "googlebot") out.push("googlebot");
  return out;
}

export interface MatchResult {
  allowed: boolean;
  rule: RobotsRule | null;
  group: RobotsGroup | null;
  agentUsed: string | null;
  reason: string;
}

export function pathFromUrl(input: string): string {
  const s = input.trim();
  if (!s) return "/";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://example.com${s.startsWith("/") ? "" : "/"}${s}`);
    return u.pathname + u.search;
  } catch {
    return s.startsWith("/") ? s : `/${s}`;
  }
}

export function matchRobots(parsed: ParsedRobots, agent: string, urlOrPath: string): MatchResult {
  const path = normalizePath(pathFromUrl(urlOrPath));
  if (path === "/robots.txt") return { allowed: true, rule: null, group: null, agentUsed: null, reason: "/robots.txt is always allowed." };
  let groups: RobotsGroup[] = [];
  let agentUsed: string | null = null;
  for (const tok of crawlerTokens(agent)) {
    groups = parsed.groups.filter((g) => g.agents.includes(tok));
    if (groups.length) {
      agentUsed = tok;
      break;
    }
  }
  if (!groups.length) {
    groups = parsed.groups.filter((g) => g.agents.includes("*"));
    if (groups.length) agentUsed = "*";
  }
  if (!groups.length) return { allowed: true, rule: null, group: null, agentUsed: null, reason: "No group applies to this crawler and there is no “User-agent: *” group, so everything is allowed." };
  let best: RobotsRule | null = null;
  let bestLen = -1;
  let bestGroup: RobotsGroup | null = null;
  for (const g of groups)
    for (const r of g.rules) {
      if (!r.path) continue; // empty Disallow/Allow matches nothing
      if (!patternToRegex(r.path).test(path)) continue;
      const len = normalizePath(r.path).length;
      if (len > bestLen || (len === bestLen && r.type === "allow" && best?.type === "disallow")) {
        best = r;
        bestLen = len;
        bestGroup = g;
      }
    }
  const groupName = agentUsed === "*" ? "the “User-agent: *” group" : `the group for “${agentUsed}”`;
  if (!best) return { allowed: true, rule: null, group: groups[0], agentUsed, reason: `No rule in ${groupName} matches this path, so it is allowed.` };
  return {
    allowed: best.type === "allow",
    rule: best,
    group: bestGroup,
    agentUsed,
    reason: `${best.type === "allow" ? "Allowed" : "Blocked"} by “${best.type === "allow" ? "Allow" : "Disallow"}: ${best.path}” (line ${best.line}) in ${groupName}${groups.length > 1 ? " (groups for the same crawler are combined)" : ""}. The longest matching rule wins${best.type === "allow" ? "; on a tie, Allow wins" : ""}.`,
  };
}

/* ---------- Generator ---------- */

export const AI_CRAWLERS: { token: string; owner: string; note: string }[] = [
  { token: "GPTBot", owner: "OpenAI", note: "Collects content for training OpenAI's models." },
  { token: "OAI-SearchBot", owner: "OpenAI", note: "Indexes pages for ChatGPT search results. Blocking it removes you from those answers." },
  { token: "ChatGPT-User", owner: "OpenAI", note: "Fetches a page when a ChatGPT user asks for it." },
  { token: "ClaudeBot", owner: "Anthropic", note: "Collects content for training Anthropic's models." },
  { token: "Claude-SearchBot", owner: "Anthropic", note: "Indexes pages for Claude's search results." },
  { token: "Claude-User", owner: "Anthropic", note: "Fetches a page when a Claude user asks for it." },
  { token: "Google-Extended", owner: "Google", note: "Not a crawler: a control token for whether Googlebot-crawled content may be used for Gemini training and grounding. Doesn't affect Google Search." },
  { token: "Applebot-Extended", owner: "Apple", note: "Control token for using Applebot-crawled content to train Apple's models. Doesn't affect Siri or Spotlight." },
  { token: "PerplexityBot", owner: "Perplexity", note: "Indexes pages for Perplexity's answers." },
  { token: "CCBot", owner: "Common Crawl", note: "Builds the open Common Crawl dataset that many AI models are trained on." },
  { token: "Meta-ExternalAgent", owner: "Meta", note: "Collects content for training Meta's AI models." },
  { token: "Bytespider", owner: "ByteDance", note: "ByteDance's crawler, used for its AI products." },
  { token: "Amazonbot", owner: "Amazon", note: "Amazon's crawler, used for Alexa answers among other things." },
];

export interface RobotsGenRule {
  agent: string;
  type: "allow" | "disallow";
  path: string;
}

export interface RobotsGenInput {
  defaultPolicy: "allow" | "block";
  rules: RobotsGenRule[];
  blockAi: string[];
  sitemaps: string;
  crawlDelay: string;
  wordpress: boolean;
}

export function buildRobots(i: RobotsGenInput): string {
  const lines: string[] = [];
  const byAgent = new Map<string, RobotsGenRule[]>();
  for (const r of i.rules) {
    const a = r.agent.trim() || "*";
    const p = r.path.trim();
    if (!p) continue;
    const list = byAgent.get(a) ?? [];
    list.push({ ...r, agent: a, path: p.startsWith("/") || p.startsWith("*") ? p : `/${p}` });
    byAgent.set(a, list);
  }
  const star = byAgent.get("*") ?? [];
  byAgent.delete("*");
  lines.push("User-agent: *");
  if (i.defaultPolicy === "block") lines.push("Disallow: /");
  else {
    if (i.wordpress) lines.push("Disallow: /wp-admin/", "Allow: /wp-admin/admin-ajax.php");
    for (const r of star) lines.push(`${r.type === "allow" ? "Allow" : "Disallow"}: ${r.path}`);
    if (!i.wordpress && !star.length) lines.push("Allow: /");
  }
  if (i.crawlDelay.trim() && /^\d+(\.\d+)?$/.test(i.crawlDelay.trim())) lines.push(`Crawl-delay: ${i.crawlDelay.trim()}`);
  for (const [agent, rules] of byAgent) {
    lines.push("", `User-agent: ${agent}`);
    for (const r of rules) lines.push(`${r.type === "allow" ? "Allow" : "Disallow"}: ${r.path}`);
  }
  const ai = i.blockAi.filter((t) => !byAgent.has(t));
  if (ai.length) {
    lines.push("", "# AI crawlers");
    for (const t of ai) lines.push(`User-agent: ${t}`);
    lines.push("Disallow: /");
  }
  const maps = i.sitemaps
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (maps.length) lines.push("", ...maps.map((m) => `Sitemap: ${m}`));
  return lines.join("\n") + "\n";
}
