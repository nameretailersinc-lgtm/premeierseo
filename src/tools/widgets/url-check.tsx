"use client";

/*
 * Server-backed URL checks. config.mode selects the tool:
 *  redirects | status | headings | seo-audit | backlinks | uptime | down | page-size
 * Each mode lives in src/tools/lib/seo/modes/* and is loaded on demand.
 */
import dynamic from "next/dynamic";
import type { WidgetProps } from "../types";

function Loading() {
  return <div className="panel min-h-40 animate-pulse bg-surface-2" aria-hidden="true" />;
}

const RedirectChecker = dynamic(() => import("../lib/seo/modes/http-tools").then((m) => m.RedirectChecker), { loading: Loading });
const StatusChecker = dynamic(() => import("../lib/seo/modes/http-tools").then((m) => m.StatusChecker), { loading: Loading });
const HeadingExtractor = dynamic(() => import("../lib/seo/modes/page-tools").then((m) => m.HeadingExtractor), { loading: Loading });
const SeoAudit = dynamic(() => import("../lib/seo/modes/page-tools").then((m) => m.SeoAudit), { loading: Loading });
const BacklinkVerifier = dynamic(() => import("../lib/seo/modes/page-tools").then((m) => m.BacklinkVerifier), { loading: Loading });
const PageSize = dynamic(() => import("../lib/seo/modes/page-tools").then((m) => m.PageSize), { loading: Loading });
const AvailabilityCheck = dynamic(() => import("../lib/seo/modes/availability").then((m) => m.AvailabilityCheck), { loading: Loading });

export default function UrlCheck({ toolId, config }: WidgetProps) {
  switch (config?.mode) {
    case "redirects":
      return <RedirectChecker toolId={toolId} />;
    case "status":
      return <StatusChecker toolId={toolId} />;
    case "headings":
      return <HeadingExtractor />;
    case "seo-audit":
      return <SeoAudit />;
    case "backlinks":
      return <BacklinkVerifier />;
    case "page-size":
      return <PageSize />;
    case "uptime":
      return <AvailabilityCheck variant="uptime" />;
    case "down":
      return <AvailabilityCheck variant="down" />;
    default:
      return <StatusChecker toolId={toolId} />;
  }
}
