import type { ToolDef } from "@/lib/types";

/**
 * Privacy statements are generated from how a tool actually handles data (registry
 * `processing`), never typed per page. Wording follows docs/seo-aeo-geo-audit.md §5.2.
 */
export function privacyStatement(t: ToolDef): { short: string; long: string } {
  const noun =
    t.archetype === "file" ? (t.category === "pdf-tools" ? "PDF files" : "files") : t.archetype === "url" ? "URL" : "text";
  if (t.processing === "browser") {
    return {
      short: "Runs in your browser",
      long: `This tool runs entirely in your browser. Your ${noun === "URL" ? "input" : noun} ${
        noun === "files" || noun === "PDF files" ? "are" : "is"
      } not uploaded to our servers.`,
    };
  }
  if (t.processing === "server") {
    return {
      short: t.pasteMode ? "URL checks use our server" : "Checked from our server",
      long:
        "To check a URL, our server requests the address you enter and returns the result to you. We don't store the pages we fetch or keep a list of the addresses you check. " +
        (t.pasteMode ? "If you paste HTML or text instead, it is processed in your browser and not sent to us. " : "") +
        "Like any website, our hosting provider keeps short-lived technical request logs for security. See the [privacy policy](/privacy-policy/).",
    };
  }
  const tp = t.thirdParty;
  return {
    short: tp ? `Uses ${tp.name}` : "Uses a third-party service",
    long: tp
      ? `This tool sends the address you enter to ${tp.name} to ${tp.purpose}. Their [privacy policy](${tp.url}) applies to that request.${t.alsoServer ? " Some checks also request the page from our server, which doesn't store what it fetches." : ""} We don't store the results.`
      : "This tool sends your input to a third-party service to produce the result.",
  };
}
