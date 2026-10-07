/*
 * Delimited text (CSV, TSV, pipe, custom) parsing and column extraction.
 * Quoting follows RFC 4180: a field wrapped in double quotes may contain the delimiter,
 * line breaks and doubled quotes ("") for a literal quote.
 */

export const DELIMITERS: Record<string, string> = {
  comma: ",",
  tab: "\t",
  semicolon: ";",
  pipe: "|",
  space: " ",
};

/** Parse delimited text into rows. `delim` may be several characters; "whitespace" splits on runs of spaces/tabs (no quoting). */
export function parseDelimited(text: string, delim: string): string[][] {
  const src = text.replace(/\r\n?/g, "\n");
  if (delim === "whitespace") return src.split("\n").map((l) => (l.trim() ? l.trim().split(/[ \t]+/) : [""]));
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let quoted = false;
  let atStart = true;
  while (i < src.length) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (atStart && c === '"') {
      quoted = true;
      atStart = false;
      i++;
      continue;
    }
    if (src.startsWith(delim, i)) {
      row.push(field);
      field = "";
      atStart = true;
      i += delim.length;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      atStart = true;
      i++;
      continue;
    }
    field += c;
    atStart = false;
    i++;
  }
  row.push(field);
  rows.push(row);
  return rows;
}

/** Quote a field for output when it contains the delimiter, a quote or a line break. */
export function quoteField(v: string, delim: string): string {
  if (v.includes('"') || v.includes("\n") || (delim && v.includes(delim))) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/**
 * Parse a column list: "2", "1,3", "2-4", "3,1" (reorders), and header names when a header row exists.
 * Returns zero-based indices or an error message.
 */
export function parseColumnSpec(spec: string, header: string[] | null, width: number): { cols: number[] } | { error: string } {
  const parts = spec.split(",").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return { error: "Enter the columns to extract, for example 2 or 1,3 or 2-4." };
  const cols: number[] = [];
  for (const p of parts) {
    const range = /^(\d+)\s*-\s*(\d+)?$/.exec(p);
    if (/^\d+$/.test(p)) {
      const n = Number(p);
      if (n < 1) return { error: "Column numbers start at 1." };
      cols.push(n - 1);
    } else if (range) {
      const a = Number(range[1]);
      const b = range[2] ? Number(range[2]) : width;
      if (a < 1 || b < 1) return { error: "Column numbers start at 1." };
      const step = a <= b ? 1 : -1;
      for (let k = a; step > 0 ? k <= b : k >= b; k += step) cols.push(k - 1);
    } else if (header) {
      const idx = header.findIndex((h) => h.trim().toLowerCase() === p.toLowerCase());
      if (idx < 0) return { error: `No column called “${p}” in the header row.` };
      cols.push(idx);
    } else {
      return { error: `“${p}” is not a column number. Tick “First row is a header” to use column names.` };
    }
  }
  return { cols };
}
