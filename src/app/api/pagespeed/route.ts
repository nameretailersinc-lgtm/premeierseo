import { guard, json, readBody } from "@/lib/server/api";
import { FetchError, normalizeUserUrl } from "@/lib/server/safe-fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST { url, strategy: "mobile" | "desktop" }
 * Proxies Google PageSpeed Insights (Lighthouse lab data + Chrome UX Report field data).
 * The API key stays server-side (PAGESPEED_API_KEY). Returns a compact subset.
 */
export async function POST(req: Request) {
  const blocked = guard(req, 10);
  if (blocked) return blocked;
  const body = await readBody<{ url?: string; strategy?: string }>(req);
  let target: URL;
  try {
    target = normalizeUserUrl(body?.url ?? "");
  } catch (e) {
    return json({ error: { code: "INVALID_URL", message: e instanceof FetchError ? e.message : "Invalid address." } }, 400);
  }
  const strategy = body?.strategy === "desktop" ? "desktop" : "mobile";
  const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  api.searchParams.set("url", target.toString());
  api.searchParams.set("strategy", strategy);
  for (const c of ["performance", "accessibility", "best-practices", "seo"]) api.searchParams.append("category", c);
  if (process.env.PAGESPEED_API_KEY) api.searchParams.set("key", process.env.PAGESPEED_API_KEY);
  try {
    const res = await fetch(api, { signal: AbortSignal.timeout(55_000), cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      const quota = res.status === 429 || /quota/i.test(JSON.stringify(data));
      return json(
        {
          error: {
            code: quota ? "QUOTA" : "PSI_ERROR",
            message: quota
              ? "Google PageSpeed Insights is rate-limiting requests right now. Please try again later."
              : (data?.error?.message as string) || "PageSpeed Insights couldn't test this page.",
          },
        },
        200,
      );
    }
    const lh = data.lighthouseResult ?? {};
    const audits = lh.audits ?? {};
    const pick = (id: string) =>
      audits[id] ? { title: audits[id].title, displayValue: audits[id].displayValue, score: audits[id].score, numericValue: audits[id].numericValue } : null;
    const cats = lh.categories ?? {};
    const field = (le: Record<string, unknown> | undefined) => {
      if (!le?.metrics) return null;
      const m = le.metrics as Record<string, { percentile: number; category: string }>;
      const g = (k: string) => (m[k] ? { p75: m[k].percentile, category: m[k].category } : null);
      return {
        overall: (le.overall_category as string) ?? null,
        lcp: g("LARGEST_CONTENTFUL_PAINT_MS"),
        inp: g("INTERACTION_TO_NEXT_PAINT"),
        cls: g("CUMULATIVE_LAYOUT_SHIFT_SCORE"),
        fcp: g("FIRST_CONTENTFUL_PAINT_MS"),
        ttfb: g("EXPERIMENTAL_TIME_TO_FIRST_BYTE"),
      };
    };
    const opportunities = Object.values(audits as Record<string, { id: string; title: string; displayValue?: string; score: number | null; details?: { type?: string; overallSavingsMs?: number } }>)
      .filter((a) => a.details?.type === "opportunity" && (a.details.overallSavingsMs ?? 0) > 100)
      .sort((a, b) => (b.details!.overallSavingsMs ?? 0) - (a.details!.overallSavingsMs ?? 0))
      .slice(0, 8)
      .map((a) => ({ id: a.id, title: a.title, displayValue: a.displayValue, savingsMs: Math.round(a.details!.overallSavingsMs ?? 0) }));
    return json({
      checkedAt: new Date().toISOString(),
      url: data.id,
      finalUrl: lh.finalDisplayedUrl ?? lh.finalUrl,
      strategy,
      lighthouseVersion: lh.lighthouseVersion,
      scores: Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, Math.round(((v as { score: number }).score ?? 0) * 100)])),
      lab: {
        fcp: pick("first-contentful-paint"),
        lcp: pick("largest-contentful-paint"),
        tbt: pick("total-blocking-time"),
        cls: pick("cumulative-layout-shift"),
        si: pick("speed-index"),
        tti: pick("interactive"),
      },
      field: field(data.loadingExperience),
      originField: field(data.originLoadingExperience),
      pageWeight: pick("total-byte-weight"),
      requests: audits["network-requests"]?.details?.items?.length ?? null,
      viewport: pick("viewport"),
      fontSize: pick("font-size"),
      tapTargets: pick("tap-targets"),
      opportunities,
      screenshot: audits["final-screenshot"]?.details?.data ?? null,
    });
  } catch {
    return json({ error: { code: "PSI_UNAVAILABLE", message: "Couldn't reach Google PageSpeed Insights. Please try again." } }, 200);
  }
}
