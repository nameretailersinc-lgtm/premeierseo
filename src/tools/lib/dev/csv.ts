/*
 * JSON ↔ CSV. Flattening uses dot paths (address.city); arrays can be joined, kept as JSON or
 * spread into indexed columns (tags.0, tags.1). CSV is written per RFC 4180 (CRLF, quotes doubled).
 * CSV parsing uses papaparse (delimiter detection, quoted fields), loaded on first use.
 */
import { parseJson, toValue, type JsonError } from "./json";

export type ArrayMode = "join" | "json" | "index";

export interface FlattenOpts {
  arrays: ArrayMode;
  joinWith?: string;
}

type Row = Record<string, string | number | boolean | null>;

export function flatten(value: unknown, o: FlattenOpts, prefix = "", out: Row = {}): Row {
  if (value === null || typeof value !== "object") {
    out[prefix || "value"] = value as string | number | boolean | null;
    return out;
  }
  if (Array.isArray(value)) {
    if (!prefix) {
      out.value = JSON.stringify(value);
      return out;
    }
    if (o.arrays === "json") out[prefix] = JSON.stringify(value);
    else if (o.arrays === "join") {
      const allScalar = value.every((v) => v === null || typeof v !== "object");
      out[prefix] = allScalar ? value.map((v) => (v === null ? "" : String(v))).join(o.joinWith ?? "; ") : JSON.stringify(value);
    } else {
      if (!value.length) out[prefix] = "";
      value.forEach((v, i) => flatten(v, o, `${prefix}.${i}`, out));
    }
    return out;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length && prefix) out[prefix] = "";
  for (const [k, v] of entries) flatten(v, o, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

export interface JsonInput {
  records?: unknown[];
  error?: JsonError & { jsonLines?: boolean };
  /** "array" | "object" | "jsonl" */
  shape?: string;
}

/** Read a JSON array, a single object, or JSON Lines (one value per line). */
export function readRecords(text: string): JsonInput {
  const r = parseJson(text);
  if (r.ok) {
    const v = toValue(r.node);
    if (Array.isArray(v)) return { records: v, shape: "array" };
    if (v && typeof v === "object") {
      // { "data": [ {...}, ... ] } — use the single array of objects if there is exactly one.
      const arrays = Object.entries(v as Record<string, unknown>).filter(([, x]) => Array.isArray(x) && x.length && x.every((y) => y && typeof y === "object"));
      if (arrays.length === 1) return { records: arrays[0][1] as unknown[], shape: `object.${arrays[0][0]}` };
      return { records: [v], shape: "object" };
    }
    return { records: [v], shape: "value" };
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length > 1) {
    const recs: unknown[] = [];
    for (const l of lines) {
      const p = parseJson(l);
      if (!p.ok) return { error: r.error };
      recs.push(toValue(p.node));
    }
    return { records: recs, shape: "jsonl" };
  }
  return { error: r.error };
}

export interface CsvOpts extends FlattenOpts {
  delimiter: string;
  header: boolean;
  /** Prefix cells starting with = + - @ with ' so spreadsheets don't run them as formulas. */
  safeFormulas?: boolean;
  nullAs?: "" | "null";
}

export function columnsOf(rows: Row[]): string[] {
  const cols: string[] = [];
  const seen = new Set<string>();
  for (const r of rows)
    for (const k of Object.keys(r))
      if (!seen.has(k)) {
        seen.add(k);
        cols.push(k);
      }
  return cols;
}

export function csvCell(v: unknown, o: Pick<CsvOpts, "delimiter" | "safeFormulas" | "nullAs">): string {
  let s = v === null || v === undefined ? (v === null ? (o.nullAs ?? "") : "") : String(v);
  if (o.safeFormulas && /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  if (s.includes('"') || s.includes(o.delimiter) || /[\r\n]/.test(s) || /^\s|\s$/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(records: unknown[], o: CsvOpts): { csv: string; columns: string[]; rows: Row[] } {
  const rows = records.map((r) => flatten(r, o));
  const columns = columnsOf(rows);
  const lines: string[] = [];
  if (o.header) lines.push(columns.map((c) => csvCell(c, o)).join(o.delimiter));
  for (const r of rows) lines.push(columns.map((c) => csvCell(c in r ? r[c] : undefined, o)).join(o.delimiter));
  return { csv: lines.join("\r\n"), columns, rows };
}

/* ---------- CSV → JSON ---------- */

export interface CsvToJsonOpts {
  delimiter: string; // "" = auto
  header: boolean;
  types: boolean;
  empty: "string" | "null" | "omit";
  nest: boolean;
  shape: "objects" | "arrays" | "jsonl";
  indent: string;
}

const NUM_RE = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;

export function typed(s: string): string | number | boolean | null {
  if (NUM_RE.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n) && (s.includes(".") || s.includes("e") || s.includes("E") || Number.isSafeInteger(n))) return n;
    return s;
  }
  if (s === "true" || s === "TRUE" || s === "True") return true;
  if (s === "false" || s === "FALSE" || s === "False") return false;
  if (s === "null" || s === "NULL") return null;
  return s;
}

function setPath(obj: Record<string, unknown>, path: string[], v: unknown) {
  let cur: Record<string, unknown> | unknown[] = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    const nextIsIndex = /^\d+$/.test(path[i + 1]);
    const holder = cur as Record<string, unknown>;
    if (holder[k] === undefined || holder[k] === null || typeof holder[k] !== "object") holder[k] = nextIsIndex ? [] : {};
    cur = holder[k] as Record<string, unknown>;
  }
  (cur as Record<string, unknown>)[path[path.length - 1]] = v;
}

export interface CsvParsed {
  rows: string[][];
  delimiter: string;
  errors: string[];
}

export async function parseCsv(text: string, delimiter: string): Promise<CsvParsed> {
  const Papa = (await import("papaparse")).default;
  const r = Papa.parse<string[]>(text.replace(/^﻿/, ""), { delimiter, skipEmptyLines: "greedy" });
  const errors = r.errors
    .filter((e) => e.code !== "UndetectableDelimiter")
    .slice(0, 5)
    .map((e) => `Row ${(e.row ?? 0) + 1}: ${e.message}`);
  return { rows: r.data, delimiter: r.meta.delimiter, errors };
}

export function uniqueHeaders(head: string[]): string[] {
  const seen = new Map<string, number>();
  return head.map((h, i) => {
    let k = h.trim() || `column_${i + 1}`;
    const n = seen.get(k) ?? 0;
    seen.set(k, n + 1);
    if (n) k = `${k}_${n + 1}`;
    return k;
  });
}

export function rowsToJson(rows: string[][], o: CsvToJsonOpts): { json: string; count: number; columns: string[]; textColumns: string[] } {
  let columns: string[] = [];
  let body = rows;
  if (o.header && rows.length) {
    columns = uniqueHeaders(rows[0]);
    body = rows.slice(1);
  } else {
    const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
    columns = Array.from({ length: width }, (_, i) => `column_${i + 1}`);
  }
  // A column where any value has a leading zero (ZIP codes, phone numbers, IDs) stays text in every
  // row, so one column never mixes "01234" and 10001.
  const keepText = new Set<number>();
  if (o.types)
    for (const r of body)
      r.forEach((cell, i) => {
        if (/^[-+]?0\d/.test(cell.trim())) keepText.add(i);
      });
  const conv = (s: string, col: number): unknown => {
    if (s === "") return o.empty === "null" ? null : "";
    if (!o.types) return s;
    const v = typed(s);
    return typeof v === "number" && keepText.has(col) ? s : v;
  };
  let items: unknown[];
  if (o.shape === "arrays") {
    items = (o.header ? [columns, ...body.map((r) => r.map(conv))] : body.map((r) => r.map(conv))) as unknown[];
  } else {
    items = body.map((r) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((c, i) => {
        const raw = r[i] ?? "";
        if (raw === "" && o.empty === "omit") return;
        const v = conv(raw, i);
        if (o.nest && c.includes(".")) setPath(obj, c.split("."), v);
        else obj[c] = v;
      });
      return obj;
    });
  }
  const json = o.shape === "jsonl" ? items.map((x) => JSON.stringify(x)).join("\n") : JSON.stringify(items, null, o.indent || undefined);
  return { json, count: body.length, columns, textColumns: [...keepText].sort((a, b) => a - b).map((i) => columns[i]).filter(Boolean) };
}
