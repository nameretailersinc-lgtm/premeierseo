/*
 * Privacy-first event layer (docs/user-experience-audit.md §9).
 * - No-op unless an analytics backend is configured (NEXT_PUBLIC_GA_ID loads gtag lazily).
 * - Respects Global Privacy Control and Do Not Track.
 * - Never send user content: no text, file names, URLs typed into checkers or raw queries.
 */

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    __pssQueue?: [string, Params][];
  }
}

function optedOut(): boolean {
  if (typeof navigator === "undefined") return true;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}

export function track(event: string, params: Params = {}): void {
  if (typeof window === "undefined" || optedOut()) return;
  const clean: Params = {};
  for (const [k, v] of Object.entries(params)) if (v !== undefined) clean[k] = v;
  if (window.gtag) window.gtag("event", event, clean);
  else (window.__pssQueue ||= []).push([event, clean]);
}

export function bucket(n: number, edges: number[], labels: string[]): string {
  for (let i = 0; i < edges.length; i++) if (n < edges[i]) return labels[i];
  return labels[labels.length - 1];
}

/* ---------- Recently used tools (local only, ids only) ---------- */
const RECENT_KEY = "pss:recent:v1";
const NINETY_DAYS = 90 * 24 * 3600 * 1000;

export function getRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as { id: string; t: number }[];
    const now = Date.now();
    return raw.filter((r) => now - r.t < NINETY_DAYS).map((r) => r.id);
  } catch {
    return [];
  }
}

export function pushRecent(id: string): void {
  try {
    const raw = (JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as { id: string; t: number }[]).filter(
      (r) => r.id !== id,
    );
    raw.unshift({ id, t: Date.now() });
    localStorage.setItem(RECENT_KEY, JSON.stringify(raw.slice(0, 8)));
  } catch {
    /* storage unavailable: not remembered */
  }
}

export function clearRecent(): void {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* ignore */
  }
}
