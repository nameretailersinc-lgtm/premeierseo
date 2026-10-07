/*
 * One-click operations for the online text editor. Each runs on the selection, or on the whole
 * text when nothing is selected. Pure functions so they can be tested with node.
 */
import { convertCase } from "./case";

export interface EditorOp {
  id: string;
  label: string;
  group: "case" | "clean" | "lines";
  run: (s: string) => string;
}

const lines = (s: string) => s.replace(/\r\n?/g, "\n").split("\n");
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export const EDITOR_OPS: EditorOp[] = [
  { id: "upper", label: "UPPERCASE", group: "case", run: (s) => convertCase(s, "upper") },
  { id: "lower", label: "lowercase", group: "case", run: (s) => convertCase(s, "lower") },
  { id: "title", label: "Title Case", group: "case", run: (s) => convertCase(s, "title") },
  { id: "sentence", label: "Sentence case", group: "case", run: (s) => convertCase(s, "sentence") },
  { id: "trim", label: "Trim line ends", group: "clean", run: (s) => lines(s).map((l) => l.trim()).join("\n") },
  { id: "spaces", label: "Remove extra spaces", group: "clean", run: (s) => lines(s).map((l) => l.replace(/[ \t ]+/g, " ").trim()).join("\n") },
  { id: "empty", label: "Remove empty lines", group: "clean", run: (s) => lines(s).filter((l) => l.trim() !== "").join("\n") },
  { id: "tabs", label: "Tabs to spaces", group: "clean", run: (s) => s.replace(/\t/g, "    ") },
  { id: "sort", label: "Sort A–Z", group: "lines", run: (s) => [...lines(s)].sort(collator.compare).join("\n") },
  { id: "sort-desc", label: "Sort Z–A", group: "lines", run: (s) => [...lines(s)].sort((a, b) => collator.compare(b, a)).join("\n") },
  {
    id: "dedupe",
    label: "Remove duplicate lines",
    group: "lines",
    run: (s) => {
      const seen = new Set<string>();
      return lines(s)
        .filter((l) => {
          if (seen.has(l)) return false;
          seen.add(l);
          return true;
        })
        .join("\n");
    },
  },
  { id: "reverse", label: "Reverse line order", group: "lines", run: (s) => lines(s).reverse().join("\n") },
];

export const OP_BY_ID = new Map(EDITOR_OPS.map((o) => [o.id, o]));
