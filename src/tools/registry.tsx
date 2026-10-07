"use client";

/*
 * Widget registry. Each widget is its own client chunk, loaded through next/dynamic from
 * this client module (code splitting from a Server Component is not supported in Next 16).
 * Widgets still render on the server, so labels and default controls are in the HTML.
 *
 * To add a widget: create src/tools/widgets/<name>.tsx with a default export
 * `function Widget({ toolId, config }: WidgetProps)` and register it below.
 */
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { ToolProvider } from "./ui/ToolContext";
import type { WidgetProps } from "./types";

function Loading() {
  return <div className="panel min-h-64 animate-pulse bg-surface-2" aria-hidden="true" />;
}


const WIDGETS: Record<string, ComponentType<WidgetProps>> = {
  // text
  "text-ops": dynamic(() => import("./widgets/text-ops"), { loading: Loading }),
  "word-counter": dynamic(() => import("./widgets/word-counter"), { loading: Loading }),
  "character-counter": dynamic(() => import("./widgets/character-counter"), { loading: Loading }),
  "keyword-density": dynamic(() => import("./widgets/keyword-density"), { loading: Loading }),
  "reading-time": dynamic(() => import("./widgets/reading-time"), { loading: Loading }),
  "fancy-text": dynamic(() => import("./widgets/fancy-text"), { loading: Loading }),
  "case-converter": dynamic(() => import("./widgets/case-converter"), { loading: Loading }),
  notepad: dynamic(() => import("./widgets/notepad"), { loading: Loading }),
  "text-editor": dynamic(() => import("./widgets/text-editor"), { loading: Loading }),
  "tally-counter": dynamic(() => import("./widgets/tally-counter"), { loading: Loading }),
  "writing-check": dynamic(() => import("./widgets/writing-check"), { loading: Loading }),
  "list-compare": dynamic(() => import("./widgets/list-compare"), { loading: Loading }),
  "list-combine": dynamic(() => import("./widgets/list-combine"), { loading: Loading }),
  "random-picker": dynamic(() => import("./widgets/random-picker"), { loading: Loading }),
  // binary / numbers
  "number-base": dynamic(() => import("./widgets/number-base"), { loading: Loading }),
  "text-binary": dynamic(() => import("./widgets/text-binary"), { loading: Loading }),
  // developer
  "code-ops": dynamic(() => import("./widgets/code-ops"), { loading: Loading }),
  "json-viewer": dynamic(() => import("./widgets/json-viewer"), { loading: Loading }),
  "regex-tester": dynamic(() => import("./widgets/regex-tester"), { loading: Loading }),
  "unix-time": dynamic(() => import("./widgets/unix-time"), { loading: Loading }),
  color: dynamic(() => import("./widgets/color"), { loading: Loading }),
  "html-viewer": dynamic(() => import("./widgets/html-viewer"), { loading: Loading }),
  hash: dynamic(() => import("./widgets/hash"), { loading: Loading }),
  uuid: dynamic(() => import("./widgets/uuid"), { loading: Loading }),
  "encryption-key": dynamic(() => import("./widgets/encryption-key"), { loading: Loading }),
  // seo generators & analysers
  "meta-tags": dynamic(() => import("./widgets/meta-tags"), { loading: Loading }),
  "social-tags": dynamic(() => import("./widgets/social-tags"), { loading: Loading }),
  "serp-preview": dynamic(() => import("./widgets/serp-preview"), { loading: Loading }),
  "seo-generators": dynamic(() => import("./widgets/seo-generators"), { loading: Loading }),
  "schema-markup": dynamic(() => import("./widgets/schema-markup"), { loading: Loading }),
  "keyword-ideas": dynamic(() => import("./widgets/keyword-ideas"), { loading: Loading }),
  "robots-tester": dynamic(() => import("./widgets/robots-tester"), { loading: Loading }),
  "htaccess-tester": dynamic(() => import("./widgets/htaccess-tester"), { loading: Loading }),
  "review-link": dynamic(() => import("./widgets/review-link"), { loading: Loading }),
  // url checks (server-backed)
  "url-check": dynamic(() => import("./widgets/url-check"), { loading: Loading }),
  pagespeed: dynamic(() => import("./widgets/pagespeed"), { loading: Loading }),
  "ip-lookup": dynamic(() => import("./widgets/ip-lookup"), { loading: Loading }),
  "browser-info": dynamic(() => import("./widgets/browser-info"), { loading: Loading }),
  "viewport-preview": dynamic(() => import("./widgets/viewport-preview"), { loading: Loading }),
  "url-opener": dynamic(() => import("./widgets/url-opener"), { loading: Loading }),
  "facebook-id": dynamic(() => import("./widgets/facebook-id"), { loading: Loading }),
  // images
  "image-target-size": dynamic(() => import("./widgets/image-target-size"), { loading: Loading }),
  "image-compress": dynamic(() => import("./widgets/image-compress"), { loading: Loading }),
  "image-convert": dynamic(() => import("./widgets/image-convert"), { loading: Loading }),
  "image-resize": dynamic(() => import("./widgets/image-resize"), { loading: Loading }),
  "image-crop": dynamic(() => import("./widgets/image-crop"), { loading: Loading }),
  favicon: dynamic(() => import("./widgets/favicon"), { loading: Loading }),
  "image-to-svg": dynamic(() => import("./widgets/image-to-svg"), { loading: Loading }),
  "video-to-gif": dynamic(() => import("./widgets/video-to-gif"), { loading: Loading }),
  // pdf
  "pdf-merge": dynamic(() => import("./widgets/pdf-merge"), { loading: Loading }),
  "pdf-split": dynamic(() => import("./widgets/pdf-split"), { loading: Loading }),
  "pdf-rotate": dynamic(() => import("./widgets/pdf-rotate"), { loading: Loading }),
  "pdf-compress": dynamic(() => import("./widgets/pdf-compress"), { loading: Loading }),
  "pdf-to-images": dynamic(() => import("./widgets/pdf-to-images"), { loading: Loading }),
  "images-to-pdf": dynamic(() => import("./widgets/images-to-pdf"), { loading: Loading }),
  "word-to-pdf": dynamic(() => import("./widgets/word-to-pdf"), { loading: Loading }),
  "pdf-annotate": dynamic(() => import("./widgets/pdf-annotate"), { loading: Loading }),
  // calculators
  calculator: dynamic(() => import("./widgets/calculator"), { loading: Loading }),
  "age-calculator": dynamic(() => import("./widgets/age-calculator"), { loading: Loading }),
  "hours-calculator": dynamic(() => import("./widgets/hours-calculator"), { loading: Loading }),
  // generators
  password: dynamic(() => import("./widgets/password"), { loading: Loading }),
  "random-generators": dynamic(() => import("./widgets/random-generators"), { loading: Loading }),
  "qr-code": dynamic(() => import("./widgets/qr-code"), { loading: Loading }),
  barcode: dynamic(() => import("./widgets/barcode"), { loading: Loading }),
  "test-data": dynamic(() => import("./widgets/test-data"), { loading: Loading }),
};

export function ToolWidget({ widget, toolId, config }: { widget: string } & WidgetProps) {
  const W = WIDGETS[widget];
  if (!W) {
    return (
      <p role="alert" className="panel p-4 text-danger">
        This tool failed to load. Please reload the page or report the problem.
      </p>
    );
  }
  return (
    <ToolProvider toolId={toolId}>
      <W toolId={toolId} config={config} />
    </ToolProvider>
  );
}
