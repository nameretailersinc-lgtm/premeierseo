// Copies self-hosted browser assets from node_modules into public/vendor (no third-party CDNs).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const root = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const files = [
  ["node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "public/vendor/pdfjs/pdf.worker.min.mjs"],
  ["node_modules/dictionary-en/index.aff", "public/vendor/dictionaries/en-US.aff"],
  ["node_modules/dictionary-en/index.dic", "public/vendor/dictionaries/en-US.dic"],
];
for (const [from, to] of files) {
  mkdirSync(dirname(join(root, to)), { recursive: true });
  copyFileSync(join(root, from), join(root, to));
  console.log("vendor:", to);
}
