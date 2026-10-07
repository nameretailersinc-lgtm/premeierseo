import { CATEGORY_BY_ID } from "@/content/categories";
import type { IconName, ToolDef } from "./types";

/** Task-specific icon for a tool, chosen from its id; falls back to the category glyph. */
const RULES: [RegExp, IconName][] = [
  [/merge|join|combin/, "merge"],
  [/split|crop|extract/, "scissors"],
  [/rotate/, "rotate-cw"],
  [/sign|edit-pdf|signature|notepad|editor|rewriter|proofread|essay|spell|punctuation/, "pen"],
  [/compress|reduce|optimi[sz]|minif|size-checker/, "minimize"],
  [/resize|photo-resizer/, "crop"],
  [/to-pdf|pdf-to|word-to|-to-|converter|convert|decoder|encoder/, "arrow-left-right"],
  [/password|encryption|lock/, "lock"],
  [/hash|uuid/, "hash"],
  [/qr|barcode/, "qr"],
  [/url|link|redirect|canonical|slug|opener|backlink/, "link"],
  [/json|html|css|javascript|regex|code|schema|htaccess|robots|sitemap|hreflang/, "code"],
  [/color|colour|rgb|hex/, "palette"],
  [/reading-time/, "clock"],
  [/(^|-)age-|hours|timestamp/, "calendar"],
  [/percent|discount|gst|emi|bmi|adsense|calculator/, "percent"],
  [/sort|list|number-each|lines|duplicate|empty|column/, "list"],
  [/random|scrambl|shuffle|permutation|picker|lorem|fake|name-generator/, "shuffle"],
  [/video|gif/, "film"],
  [/ip-|browser|uptime|down|status|speed|mobile|server/, "wifi"],
  [/count|density|reading|heading|meta|serp|open-graph|twitter|keyword/, "scan-text"],
  [/repeat|tally/, "repeat"],
];

export function toolIcon(t: ToolDef): IconName {
  for (const [re, icon] of RULES) if (re.test(t.id)) return icon;
  return CATEGORY_BY_ID[t.category].icon;
}

/** Card colours cycle through these, so a grid reads as varied but never random. */
export const HUES = ["blue", "purple", "green", "orange", "pink", "teal", "red", "indigo"] as const;
export type Hue = (typeof HUES)[number];

/** Stable per-tool hue, derived from its id so a tool keeps its colour on every page. */
export function toolHue(id: string): Hue {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}
