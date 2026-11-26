import type { PDFDocumentProxy } from "pdfjs-dist";
import { checkCancelled, nextFrame, type CancelToken } from "./core";

/** Extract the existing text layer. This intentionally does not claim OCR or layout fidelity. */
export async function extractPdfText(doc: PDFDocumentProxy, pages: number[], token?: CancelToken, progress?: (done: number, total: number) => void) {
  const output: { page: number; text: string }[] = [];
  for (const index of pages) {
    checkCancelled(token);
    const page = await doc.getPage(index + 1);
    try {
      const content = await page.getTextContent();
      const text = content.items.map((item) => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "")
        .join("").replace(/[ \t]+\n/g, "\n").trim();
      output.push({ page: index + 1, text });
    } finally { page.cleanup(); }
    progress?.(output.length, pages.length);
    await nextFrame();
  }
  checkCancelled(token);
  return output;
}
