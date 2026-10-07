/*
 * Apache .htaccess helpers.
 *  - generateHtaccess(): mod_rewrite rules for common redirects (HTTPS, www, trailing slash,
 *    page, folder and domain moves, 410 Gone), written to avoid redirect chains.
 *  - simulate(): a rule simulator for the common subset of mod_rewrite and mod_alias as they
 *    behave in a per-directory (.htaccess) context. JavaScript regular expressions stand in for
 *    PCRE; the file system is not available, so -f / -d tests use the answer the user gives.
 */

/* ======================= Generator ======================= */

export type RedirectKind = "page" | "folder" | "domain" | "gone";

export interface RedirectRow {
  kind: RedirectKind;
  from: string;
  to: string;
  status: "301" | "302" | "307" | "308";
}

export interface GenOpts {
  domain: string;
  https: boolean;
  www: "keep" | "www" | "non-www";
  slash: "keep" | "add" | "remove";
  indexHtml: boolean;
  rows: RedirectRow[];
}

const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "/old page/" or "https://site/old" → path without the leading slash (as RewriteRule sees it in .htaccess). */
function pathOf(input: string): { path: string; query: string } {
  let s = input.trim();
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      s = u.pathname + u.search;
    }
  } catch {
    /* keep as typed */
  }
  const q = s.indexOf("?");
  const query = q >= 0 ? s.slice(q + 1) : "";
  let path = q >= 0 ? s.slice(0, q) : s;
  path = path.replace(/^\/+/, "");
  try {
    path = decodeURI(path);
  } catch {
    /* keep */
  }
  return { path, query };
}

function target(to: string): string {
  const t = to.trim();
  if (!t) return "/";
  if (/^https?:\/\//i.test(t)) return t.replace(/ /g, "%20");
  return ("/" + t.replace(/^\/+/, "")).replace(/ /g, "%20");
}

/** Pattern for a path: spaces become \s, literal characters escaped. */
function pathPattern(path: string): string {
  return reEsc(path).replace(/ /g, "\\s");
}

export function generateHtaccess(o: GenOpts): { code: string; warnings: string[] } {
  const warnings: string[] = [];
  const domain = o.domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./i, "")
    .toLowerCase();
  const lines: string[] = ["RewriteEngine On", ""];
  const needsDomain = o.https || o.www !== "keep";
  if (needsDomain && !domain) warnings.push("Enter your domain to generate the HTTPS and www rules.");
  const canonicalHost = o.www === "www" ? `www.${domain}` : o.www === "non-www" ? domain : null;
  const scheme = o.https ? "https" : "http";
  /**
   * When the site-wide rules are on, every other redirect points straight at the final
   * scheme and host, so a request such as http://www.site/old-page needs one redirect, not two.
   */
  const origin = needsDomain && domain ? `${scheme}://${canonicalHost ?? "%{HTTP_HOST}"}` : "";
  const abs = (path: string) => (/^https?:\/\//i.test(path) ? path : origin + path);

  const live = o.rows.filter((r) => r.from.trim() && (r.kind === "gone" || r.to.trim()));
  if (live.length) lines.push(origin ? "# Individual redirects (first, and straight to the final address, so there is only one hop)" : "# Individual redirects");
  for (const r of live) {
    const st = r.status;
    if (r.kind === "domain") {
      const from = r.from
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/.*$/, "")
        .replace(/^www\./i, "");
      const to = target(r.to).replace(/\/+$/, "");
      if (!/^https?:\/\//i.test(to)) warnings.push(`Domain redirect to “${r.to}”: the destination must be a full address such as https://new-domain.com.`);
      if (domain && from.toLowerCase() === domain) warnings.push(`“${r.from}” is the domain these rules are for; redirecting it to another domain sends the whole site away.`);
      lines.push(`RewriteCond %{HTTP_HOST} ^(www\\.)?${reEsc(from.toLowerCase())}$ [NC]`);
      lines.push(`RewriteRule ^(.*)$ ${to}/$1 [R=${st},L,NE]`);
      continue;
    }
    const { path, query } = pathOf(r.from);
    if (r.kind === "folder") {
      const p = path.replace(/\/+$/, "");
      const to = abs(target(r.to).replace(/\/+$/, ""));
      lines.push(`RewriteRule ^${pathPattern(p)}/(.*)$ ${to}/$1 [R=${st},L,NE]`);
      lines.push(`RewriteRule ^${pathPattern(p)}$ ${to}/ [R=${st},L,NE]`);
      continue;
    }
    if (query) lines.push(`RewriteCond %{QUERY_STRING} ^${reEsc(query)}$`);
    const pat = path === "" ? "^$" : `^${pathPattern(path.replace(/\/+$/, ""))}${path.endsWith("/") || o.slash !== "keep" ? "/?" : ""}$`;
    if (r.kind === "gone") {
      lines.push(`RewriteRule ${pat} - [G,L]`);
      continue;
    }
    const to = abs(target(r.to));
    const flags = [`R=${st}`, "L", "NE"];
    if (query && !to.includes("?")) flags.push("QSD");
    lines.push(`RewriteRule ${pat} ${to} [${flags.join(",")}]`);
    if (pathOf(r.to).path === path && !/^https?:/i.test(r.to)) warnings.push(`“${r.from}” redirects to itself, which would loop.`);
  }
  if (live.length) lines.push("");

  if (o.indexHtml) {
    lines.push("# Remove index.html / index.php from URLs (only for direct requests, so internal rewrites don't loop)");
    lines.push("RewriteCond %{THE_REQUEST} \\s/+(.*/)?index\\.(html?|php)[\\s?] [NC]");
    lines.push(`RewriteRule ^(.*/)?index\\.(html?|php)$ ${origin}/$1 [R=301,L,NE]`);
    lines.push("");
  }

  if (o.slash !== "keep") {
    lines.push(o.slash === "add" ? "# Add a trailing slash to URLs that aren't files" : "# Remove the trailing slash from URLs that aren't folders");
    lines.push("RewriteCond %{REQUEST_FILENAME} !-f");
    if (o.slash === "add") {
      lines.push("RewriteCond %{REQUEST_URI} !(\\.[a-zA-Z0-9]{1,5}|/)$");
      lines.push(`RewriteRule ^(.*)$ ${origin}/$1/ [R=301,L,NE]`);
    } else {
      lines.push("RewriteCond %{REQUEST_FILENAME} !-d");
      lines.push(`RewriteRule ^(.+)/$ ${origin}/$1 [R=301,L,NE]`);
    }
    lines.push("");
  }

  if (needsDomain && domain) {
    lines.push(`# Everything else: send to the canonical address in one redirect (${scheme}://${canonicalHost ?? domain})`);
    const conds: string[] = [];
    if (o.https) conds.push("RewriteCond %{HTTPS} off");
    if (o.www === "www") conds.push(`RewriteCond %{HTTP_HOST} !^www\\. [NC]`);
    if (o.www === "non-www") conds.push(`RewriteCond %{HTTP_HOST} ^www\\. [NC]`);
    conds.forEach((c, i) => lines.push(i < conds.length - 1 ? (c.endsWith("]") ? c.replace(/\]$/, ",OR]") : c + " [OR]") : c));
    lines.push(`RewriteRule ^ ${origin}%{REQUEST_URI} [R=301,L,NE]`);
    lines.push("");
  }

  if (lines.length <= 2) return { code: "", warnings };
  return { code: lines.join("\n").trim() + "\n", warnings };
}

/* ======================= Simulator ======================= */

export interface SimRequest {
  url: string;
  method?: string;
  userAgent?: string;
  referer?: string;
  /** What -f / -d tests should return (we can't see the server's files). */
  isFile: boolean;
  isDir: boolean;
}

export interface TraceRow {
  line: number;
  text: string;
  status: "match" | "no-match" | "skipped" | "ignored" | "info" | "error";
  detail: string;
}

export interface SimResult {
  trace: TraceRow[];
  outcome: { kind: "redirect" | "rewrite" | "forbidden" | "gone" | "none" | "loop" | "error"; status?: number; url?: string; message: string };
  unsupported: string[];
}

interface Cond {
  line: number;
  text: string;
  test: string;
  pattern: string;
  flags: Set<string>;
}

const SUPPORTED = new Set(["rewriteengine", "rewritebase", "rewritecond", "rewriterule", "redirect", "redirectmatch", "redirectpermanent", "redirecttemp", "rewriteoptions"]);

/** Split an Apache directive line into arguments (quotes group words). */
function args(line: string): string[] {
  const out: string[] = [];
  const re = /"((?:\\.|[^"\\])*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push(m[1] !== undefined ? m[1] : m[2]);
  return out;
}

function parseFlags(s: string | undefined): Map<string, string> {
  const m = new Map<string, string>();
  if (!s) return m;
  const body = s.replace(/^\[|\]$/g, "");
  for (const f of body.split(",")) {
    const [k, ...v] = f.trim().split("=");
    if (!k) continue;
    const key = k.toUpperCase();
    const norm: Record<string, string> = { REDIRECT: "R", LAST: "L", NOCASE: "NC", QSAPPEND: "QSA", QSDISCARD: "QSD", NOESCAPE: "NE", FORBIDDEN: "F", GONE: "G", SKIP: "S", CHAIN: "C" };
    m.set(norm[key] ?? key, v.join("="));
  }
  return m;
}

/** PCRE → JavaScript regular expression (common subset). */
export function toJsRegex(pattern: string, nocase: boolean): RegExp {
  const p = pattern.replace(/\(\?P<(\w+)>/g, "(?<$1>").replace(/\(\?P=(\w+)\)/g, "\\k<$1>");
  if (/\(\?>|\+\+|\*\+|\?\+|\(\?[imsx-]+\)/.test(p)) throw new Error("uses PCRE syntax that JavaScript doesn't support (atomic groups, possessive quantifiers or inline flags)");
  return new RegExp(p, nocase ? "i" : "");
}

export function simulate(rules: string, req: SimRequest): SimResult {
  const trace: TraceRow[] = [];
  const unsupported = new Set<string>();
  let u: URL;
  try {
    u = new URL(/^[a-z]+:\/\//i.test(req.url.trim()) ? req.url.trim() : "https://" + req.url.trim().replace(/^\/+/, ""));
  } catch {
    return { trace, outcome: { kind: "error", message: "Enter a full URL to test, such as https://example.com/old-page." }, unsupported: [] };
  }
  const lines = rules.replace(/\r\n?/g, "\n").split("\n");
  // Join continuation lines ending with a backslash.
  const directives: { line: number; text: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    let t = lines[i];
    const start = i;
    while (/\\$/.test(t) && i + 1 < lines.length) t = t.slice(0, -1) + " " + lines[++i].trim();
    directives.push({ line: start + 1, text: t.trim() });
  }

  const safeDecode = (x: string) => {
    try {
      return decodeURIComponent(x);
    } catch {
      return x;
    }
  };
  const originalPath = safeDecode(u.pathname);
  let path = originalPath; // what the server sees (decoded)
  let query = u.search.replace(/^\?/, "");
  const host = u.host;
  const https = u.protocol === "https:";

  const vars = (name: string): string => {
    const n = name.toUpperCase();
    switch (n) {
      case "HTTP_HOST":
        return host;
      case "SERVER_NAME":
        return u.hostname;
      case "HTTPS":
        return https ? "on" : "off";
      case "REQUEST_SCHEME":
        return https ? "https" : "http";
      case "SERVER_PORT":
        return u.port || (https ? "443" : "80");
      case "REQUEST_URI":
        return path;
      case "QUERY_STRING":
        return query;
      case "REQUEST_METHOD":
        return (req.method || "GET").toUpperCase();
      case "HTTP_USER_AGENT":
        return req.userAgent ?? "";
      case "HTTP_REFERER":
        return req.referer ?? "";
      case "THE_REQUEST":
        return `${(req.method || "GET").toUpperCase()} ${u.pathname}${u.search} HTTP/1.1`;
      case "REQUEST_FILENAME":
      case "SCRIPT_FILENAME":
        return "/var/www/html" + path;
      case "DOCUMENT_ROOT":
        return "/var/www/html";
      default:
        if (n.startsWith("HTTP:")) {
          const h = n.slice(5).toLowerCase();
          if (h === "x-forwarded-proto") return https ? "https" : "http";
          if (h === "host") return host;
          return "";
        }
        if (n.startsWith("ENV:")) return "";
        return "";
    }
  };

  const expand = (s: string, rm: RegExpExecArray | null, cm: RegExpExecArray | null) =>
    s
      .replace(/%\{([^}]+)\}/g, (_, v: string) => vars(v))
      .replace(/\$(\d)/g, (_, d: string) => (rm?.[Number(d)] ?? ""))
      .replace(/%(\d)/g, (_, d: string) => (cm?.[Number(d)] ?? ""));

  let base = "/";
  let engine = false;
  const MAX_PASSES = 10;
  let redirect: SimResult["outcome"] | null = null;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let conds: Cond[] = [];
    let changed = false;
    let stop = false;
    let skip = 0;
    if (pass > 0) trace.push({ line: 0, text: "", status: "info", detail: `Pass ${pass + 1}: the URL was rewritten internally, so Apache runs the .htaccess rules again for ${path}${query ? "?" + query : ""}.` });

    for (const d of directives) {
      if (!d.text || d.text.startsWith("#")) continue;
      if (/^<\/?(IfModule|IfDefine|IfVersion)/i.test(d.text)) continue; // containers: assume the module is present
      if (/^<\/?\w/.test(d.text)) {
        if (pass === 0) {
          unsupported.add(d.text.replace(/[<>]/g, "").split(/\s/)[0]);
          trace.push({ line: d.line, text: d.text, status: "ignored", detail: "Section containers other than <IfModule> aren't simulated; the lines inside are evaluated as if the section applied." });
        }
        continue;
      }
      const a = args(d.text);
      const name = a[0].toLowerCase();
      if (!SUPPORTED.has(name)) {
        if (pass === 0) {
          unsupported.add(a[0]);
          trace.push({ line: d.line, text: d.text, status: "ignored", detail: "Not simulated: doesn't change redirects or rewrites in this tool." });
        }
        continue;
      }
      if (stop) continue;
      if (name === "rewriteengine") {
        engine = (a[1] ?? "").toLowerCase() === "on";
        if (pass === 0) trace.push({ line: d.line, text: d.text, status: "info", detail: engine ? "mod_rewrite is on." : "mod_rewrite is off: RewriteRule lines below are ignored." });
        continue;
      }
      if (name === "rewritebase") {
        base = a[1] ?? "/";
        if (pass === 0) trace.push({ line: d.line, text: d.text, status: "info", detail: `Relative substitutions are prefixed with ${base}.` });
        continue;
      }
      if (name === "rewriteoptions") continue;
      if (name === "rewritecond") {
        conds.push({ line: d.line, text: d.text, test: a[1] ?? "", pattern: a[2] ?? "", flags: new Set([...parseFlags(a[3]).keys()]) });
        continue;
      }
      if (name === "rewriterule") {
        const pending = conds;
        conds = [];
        if (!engine) {
          if (pass === 0) trace.push({ line: d.line, text: d.text, status: "skipped", detail: "RewriteEngine is not On." });
          continue;
        }
        if (skip > 0) {
          skip--;
          trace.push({ line: d.line, text: d.text, status: "skipped", detail: "Skipped by an earlier [S] flag." });
          continue;
        }
        const flags = parseFlags(a[3]);
        let negate = false;
        let pattern = a[1] ?? "";
        if (pattern.startsWith("!")) {
          negate = true;
          pattern = pattern.slice(1);
        }
        let re: RegExp;
        try {
          re = toJsRegex(pattern, flags.has("NC"));
        } catch (e) {
          trace.push({ line: d.line, text: d.text, status: "error", detail: `The pattern ${e instanceof Error ? e.message : "is invalid"}.` });
          continue;
        }
        // In .htaccess the pattern is matched against the path relative to this directory (no leading slash).
        const rel = path.replace(/^\/+/, "");
        const rm = re.exec(rel);
        const ruleMatched = negate ? !rm : !!rm;
        if (!ruleMatched) {
          for (const c of pending) trace.push({ line: c.line, text: c.text, status: "skipped", detail: "Not evaluated: Apache checks the RewriteRule pattern first, and it didn't match." });
          trace.push({ line: d.line, text: d.text, status: "no-match", detail: `Pattern ${negate ? "!" : ""}${pattern} doesn't match “${rel}”.` });
          continue;
        }
        // Evaluate conditions (AND, with [OR] chaining).
        let ok = true;
        let lastCm: RegExpExecArray | null = null;
        let orGroup = false;
        for (let k = 0; k < pending.length; k++) {
          const c = pending[k];
          const testStr = expand(c.test, rm, lastCm);
          let pat = c.pattern;
          let neg = false;
          if (pat.startsWith("!")) {
            neg = true;
            pat = pat.slice(1);
          }
          let res: boolean;
          let cm: RegExpExecArray | null = null;
          // We can't see the server's files: the first pass uses the visitor's answer; after an internal
          // rewrite we assume a path with a file extension (index.php) exists and anything else doesn't.
          const isFile = pass === 0 ? req.isFile : /\.[a-z0-9]{1,5}$/i.test(path);
          const isDir = pass === 0 ? req.isDir : false;
          const fsTest = ["-f", "-F", "-d", "-s", "-l", "-L", "-h", "-U"].includes(pat);
          if (pat === "-f" || pat === "-F") res = isFile;
          else if (pat === "-d") res = isDir;
          else if (pat === "-s") res = isFile;
          else if (pat === "-l" || pat === "-L" || pat === "-h") res = false;
          else if (pat === "-U") res = isFile || isDir;
          else if (pat.startsWith("=")) res = c.flags.has("NC") ? testStr.toLowerCase() === pat.slice(1).toLowerCase() : testStr === pat.slice(1);
          else if (/^-(eq|ne|lt|le|gt|ge)$/.test(pat)) res = false;
          else {
            try {
              cm = toJsRegex(pat, c.flags.has("NC")).exec(testStr);
              res = !!cm;
            } catch (e) {
              trace.push({ line: c.line, text: c.text, status: "error", detail: `The condition pattern ${e instanceof Error ? e.message : "is invalid"}.` });
              res = false;
            }
          }
          if (neg) res = !res;
          if (res && cm && !neg) lastCm = cm;
          const isOr = c.flags.has("OR");
          const detail = fsTest
            ? `${c.pattern} is ${res ? "true" : "false"} for ${testStr} (${pass === 0 ? "from your answer below the URL" : "assumed: a path with a file extension exists"})${isOr ? " (OR)" : ""}.`
            : `Test string “${testStr}” ${res ? "matches" : "doesn't match"} ${c.pattern}${isOr ? " (OR)" : ""}.`;
          trace.push({ line: c.line, text: c.text, status: res ? "match" : "no-match", detail });
          if (isOr) {
            orGroup = orGroup || res;
            continue;
          }
          const groupResult = orGroup || res;
          orGroup = false;
          if (!groupResult) {
            ok = false;
            // Remaining conditions aren't evaluated by Apache.
            for (let r = k + 1; r < pending.length; r++) trace.push({ line: pending[r].line, text: pending[r].text, status: "skipped", detail: "Not evaluated: an earlier condition failed." });
            break;
          }
        }
        if (ok && orGroup === false && pending.length && pending[pending.length - 1].flags.has("OR")) ok = false;
        if (!ok) {
          trace.push({ line: d.line, text: d.text, status: "no-match", detail: "The pattern matches, but the RewriteCond conditions above aren't met." });
          if (flags.has("C")) skip = 1;
          continue;
        }
        const subst = a[2] ?? "-";
        const st = flags.has("R") ? Number(flags.get("R") || 302) : 0;
        if (flags.has("F")) {
          trace.push({ line: d.line, text: d.text, status: "match", detail: "Matched: [F] returns 403 Forbidden." });
          redirect = { kind: "forbidden", status: 403, message: "403 Forbidden ([F] flag)." };
          stop = true;
          break;
        }
        if (flags.has("G")) {
          trace.push({ line: d.line, text: d.text, status: "match", detail: "Matched: [G] returns 410 Gone." });
          redirect = { kind: "gone", status: 410, message: "410 Gone ([G] flag)." };
          stop = true;
          break;
        }
        if (flags.has("S")) skip = Number(flags.get("S")) || 1;
        if (subst === "-") {
          trace.push({ line: d.line, text: d.text, status: "match", detail: "Matched; “-” means the URL is not changed." });
          if (flags.has("L") || flags.has("END")) stop = true;
          continue;
        }
        let out = expand(subst, rm, lastCm);
        let newQuery = query;
        const qi = out.indexOf("?");
        if (qi >= 0) {
          // A query in the substitution replaces the original one, unless [QSA] appends it.
          const q = out.slice(qi + 1);
          out = out.slice(0, qi);
          newQuery = flags.has("QSA") && query ? (q ? q + "&" + query : query) : q;
        } else if (flags.has("QSD")) newQuery = "";
        const absolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(out);
        if (!absolute && !out.startsWith("/")) out = base.replace(/\/?$/, "/") + out;
        if (st || absolute) {
          const status = st || 302;
          const loc = absolute ? out : `${u.protocol}//${host}${out}`;
          const full = loc + (newQuery ? "?" + newQuery : "");
          trace.push({ line: d.line, text: d.text, status: "match", detail: `Matched “${rel}”${rm && rm.length > 1 ? ` ($1 = “${rm[1] ?? ""}”)` : ""}. Redirects with ${status} to ${full}.` });
          if (!flags.has("L") && !flags.has("END")) trace.push({ line: d.line, text: "", status: "info", detail: "Without [L], Apache keeps processing the following rules before sending the redirect; add [L] to stop here." });
          redirect = { kind: "redirect", status, url: full, message: `${status} redirect to ${full}` };
          if (flags.has("L") || flags.has("END")) {
            stop = true;
            break;
          }
          // Continue with the rewritten path (Apache keeps going without L).
          if (!absolute) path = out;
          query = newQuery;
          continue;
        }
        trace.push({ line: d.line, text: d.text, status: "match", detail: `Matched “${rel}”. Internal rewrite to ${out}${newQuery ? "?" + newQuery : ""} (the visitor's address bar doesn't change).` });
        if (out !== path || newQuery !== query) changed = true;
        path = out;
        query = newQuery;
        if (flags.has("END")) {
          stop = true;
          changed = false;
          break;
        }
        if (flags.has("L")) {
          stop = true;
          break;
        }
        continue;
      }
    }
    if (redirect || !changed) break;
    if (pass === MAX_PASSES - 1) redirect = { kind: "loop", message: "The rules keep rewriting the URL. Apache would stop with a 500 error after too many internal redirects." };
  }

  // mod_alias runs after mod_rewrite in the same .htaccess.
  if (!redirect) {
    for (const d of directives) {
      const a = args(d.text);
      const name = (a[0] ?? "").toLowerCase();
      if (!["redirect", "redirectmatch", "redirectpermanent", "redirecttemp"].includes(name)) continue;
      let status = 302;
      let rest = a.slice(1);
      if (name === "redirectpermanent") status = 301;
      if (name === "redirect" || name === "redirectmatch") {
        const s = (rest[0] ?? "").toLowerCase();
        if (/^\d{3}$/.test(s)) {
          status = Number(s);
          rest = rest.slice(1);
        } else if (["permanent", "temp", "seeother", "gone"].includes(s)) {
          status = { permanent: 301, temp: 302, seeother: 303, gone: 410 }[s as "permanent"];
          rest = rest.slice(1);
        }
      }
      const [from, to] = rest;
      if (!from) continue;
      if (name === "redirectmatch") {
        let re: RegExp;
        try {
          re = toJsRegex(from, false);
        } catch (e) {
          trace.push({ line: d.line, text: d.text, status: "error", detail: `The pattern ${e instanceof Error ? e.message : "is invalid"}.` });
          continue;
        }
        const m = re.exec(path);
        if (!m) {
          trace.push({ line: d.line, text: d.text, status: "no-match", detail: `${from} doesn't match ${path}.` });
          continue;
        }
        if (status === 410) {
          redirect = { kind: "gone", status: 410, message: "410 Gone (RedirectMatch gone)." };
        } else {
          const dest = (to ?? "").replace(/\$(\d)/g, (_, k: string) => m[Number(k)] ?? "");
          const full = (/^[a-z]+:\/\//i.test(dest) ? dest : `${u.protocol}//${host}${dest}`) + (query && !dest.includes("?") ? "?" + query : "");
          redirect = { kind: "redirect", status, url: full, message: `${status} redirect to ${full}` };
        }
        trace.push({ line: d.line, text: d.text, status: "match", detail: `Matched ${path}. ${redirect.message}` });
        break;
      }
      // Redirect: prefix match on whole path segments.
      const f = from.replace(/\/+$/, "") || "/";
      if (path === f || path.startsWith(f.endsWith("/") ? f : f + "/") || f === "/") {
        if (status === 410) redirect = { kind: "gone", status: 410, message: "410 Gone (Redirect gone)." };
        else {
          const remainder = f === "/" ? path.slice(1) : path.slice(f.length);
          const dest = (to ?? "").replace(/\/+$/, "") + remainder;
          const full = (/^[a-z]+:\/\//i.test(dest) ? dest : `${u.protocol}//${host}${dest}`) + (query ? "?" + query : "");
          redirect = { kind: "redirect", status, url: full, message: `${status} redirect to ${full}` };
        }
        trace.push({ line: d.line, text: d.text, status: "match", detail: `${path} starts with ${f}, so the rest of the path is kept. ${redirect.message}` });
        break;
      }
      trace.push({ line: d.line, text: d.text, status: "no-match", detail: `${path} doesn't start with ${f}.` });
    }
  }

  const outcome =
    redirect ??
    (path !== originalPath || query !== u.search.replace(/^\?/, "")
      ? { kind: "rewrite" as const, url: path + (query ? "?" + query : ""), message: `Served internally from ${path}${query ? "?" + query : ""}; the browser keeps showing ${u.pathname}${u.search}.` }
      : { kind: "none" as const, message: `No rule changed the request. The server serves ${u.pathname}${u.search} as it is.` });
  return { trace, outcome, unsupported: [...unsupported] };
}
