import { NextResponse, type NextRequest } from "next/server";
import migration from "./seo/migration.json";

/*
 * All URL normalisation in ONE 301 hop (docs/url-migration-map.md):
 *   www → apex, http → https (on the production host), uppercase → lowercase,
 *   missing trailing slash → slash, legacy alias → final URL, removed URL → 410.
 * next.config.ts sets skipTrailingSlashRedirect so Next's own slash redirect never chains with these.
 */

const HOST = "premierseoservices.com";
const REDIRECTS = migration.redirects as Record<string, string>;
const GONE = new Set(migration.gone as string[]);
const GONE_PREFIXES = migration.goneprefixes as string[];

const GONE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page removed | Premier SEO Services</title><style>body{font:17px/1.6 system-ui,sans-serif;background:#f8f7f4;color:#1c1b19;margin:0;padding:3rem 1rem}main{max-width:40rem;margin:auto}a{color:#2553b8}</style></head><body><main><h1>This page has been removed</h1><p>The page you requested is no longer part of Premier SEO Services and has been permanently removed.</p><p><a href="/">Go to the homepage</a> · <a href="/tools/">Browse all tools</a></p></main></body></html>`;

function isGone(path: string) {
  if (GONE.has(path)) return true;
  return GONE_PREFIXES.some((p) => path.startsWith(p));
}

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  let changed = false;

  const host = (req.headers.get("host") || url.host).toLowerCase();
  const isProdHost = host === HOST || host === `www.${HOST}`;
  if (isProdHost) {
    if (host !== HOST) {
      url.host = HOST;
      changed = true;
    }
    const proto = req.headers.get("x-forwarded-proto");
    if (proto && proto !== "https") {
      url.protocol = "https:";
      changed = true;
    }
    url.port = "";
  }

  let path = url.pathname;
  if (/[A-Z]/.test(path)) {
    path = path.toLowerCase();
    changed = true;
  }
  const last = path.split("/").pop() || "";
  const isFile = /\.[a-z0-9]{2,5}$/.test(last) || ["opengraph-image", "twitter-image", "apple-icon", "icon"].includes(last);
  if (!isFile && !path.endsWith("/")) {
    path += "/";
    changed = true;
  }

  const target = REDIRECTS[path];
  if (target) {
    path = target;
    changed = true;
  } else if (!isFile || GONE.has(path)) {
    if (isGone(path)) {
      return new NextResponse(GONE_HTML, {
        status: 410,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600", "x-robots-tag": "noindex" },
      });
    }
  }

  if (changed) {
    // Build a plain URL: NextURL re-applies the request's original trailing-slash state when serialised.
    const origin = isProdHost ? `https://${HOST}` : `${url.protocol}//${url.host}`;
    return NextResponse.redirect(new URL(`${path}${url.search}`, origin), 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|vendor/|favicon.ico|robots.txt|sitemap.xml|search-index.json|icons.svg|manifest.webmanifest).*)"],
};
