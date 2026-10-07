/* URL list cleaning for the bulk URL opener: one URL per line (or separated by spaces/commas). */

export interface UrlList {
  urls: string[];
  invalid: string[];
  duplicates: number;
}

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const BARE_DOMAIN = /^[\w-]+(\.[\w-]+)+(:\d+)?([/?#].*)?$/;

export function parseUrlList(text: string): UrlList {
  const seen = new Set<string>();
  const urls: string[] = [];
  const invalid: string[] = [];
  let duplicates = 0;
  const tokens: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line
      .split(/[\s,]+/)
      .map((t) => t.trim().replace(/^[<("']+|[>)"']+$/g, ""))
      .filter(Boolean);
    // A line with no URL-looking token at all is reported once, as written.
    if (parts.length > 1 && !parts.some((t) => HAS_SCHEME.test(t) || BARE_DOMAIN.test(t))) invalid.push(line.trim());
    else tokens.push(...parts);
  }
  for (const t of tokens) {
    let candidate = t;
    if (!HAS_SCHEME.test(candidate)) {
      if (BARE_DOMAIN.test(candidate)) candidate = `https://${candidate}`;
      else {
        invalid.push(t);
        continue;
      }
    }
    let u: URL;
    try {
      u = new URL(candidate);
    } catch {
      invalid.push(t);
      continue;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      invalid.push(t);
      continue;
    }
    if (seen.has(u.href)) {
      duplicates++;
      continue;
    }
    seen.add(u.href);
    urls.push(u.href);
  }
  return { urls, invalid, duplicates };
}
