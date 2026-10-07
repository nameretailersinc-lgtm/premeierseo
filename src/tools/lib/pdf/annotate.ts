/*
 * Adds text, dates, check marks, crosses, whiteout boxes and signature images to a PDF, and
 * fills existing form fields. Everything is drawn into the page content (flattened), so it looks
 * the same in every viewer. Positions are in points on the page as displayed (top-left origin,
 * page rotation applied); toUser() converts them to PDF user space.
 */
import type { PDFFont, PDFImage, PDFPage } from "pdf-lib";
import { loadPdfLib, openForEdit } from "./core";

export type FontName = "helvetica" | "times" | "courier";
export type ItemKind = "text" | "check" | "cross" | "whiteout" | "image";

export interface EditImage {
  id: string;
  bytes: Uint8Array;
  format: "png" | "jpeg";
  width: number;
  height: number;
}

export interface EditItem {
  id: string;
  /** 0-based page index. */
  page: number;
  kind: ItemKind;
  /** Top-left corner in displayed-page points. */
  x: number;
  y: number;
  /** Box size in points (check, cross, whiteout, image). Text boxes size themselves. */
  w: number;
  h: number;
  text?: string;
  size?: number;
  font?: FontName;
  color?: [number, number, number];
  image?: EditImage;
  /** "date" and "name" are text items with a label in the item list. */
  label?: string;
}

export interface PageGeom {
  /** Displayed size in points (rotation applied). */
  w: number;
  h: number;
  rot: 0 | 90 | 180 | 270;
  box: { x: number; y: number; width: number; height: number };
}

/** Line height (in font sizes) used both on screen and in the PDF. */
export const TEXT_LINE = 1.2;
/** Baseline position of the first line, in font sizes from the top of the text box (CSS line-height 1.2). */
export const BASELINE: Record<FontName, number> = { helvetica: 0.9465, times: 0.9375, courier: 0.8665 };
export const CSS_FONT: Record<FontName, string> = {
  helvetica: "Helvetica, Arial, sans-serif",
  times: "'Times New Roman', Times, serif",
  courier: "'Courier New', Courier, monospace",
};

export function pageGeom(page: PDFPage): PageGeom {
  const box = page.getCropBox();
  const rot = ((((page.getRotation().angle % 360) + 360) % 360) as 0 | 90 | 180 | 270) || 0;
  const side = rot === 90 || rot === 270;
  return { w: side ? box.height : box.width, h: side ? box.width : box.height, rot: ([0, 90, 180, 270].includes(rot) ? rot : 0) as PageGeom["rot"], box };
}

/** Displayed-page point (top-left origin) → PDF user-space point. */
export function toUser(g: PageGeom, dx: number, dy: number): { x: number; y: number } {
  const { x: x0, y: y0, width, height } = g.box;
  const x1 = x0 + width;
  const y1 = y0 + height;
  switch (g.rot) {
    case 90:
      return { x: x0 + dy, y: y0 + dx };
    case 180:
      return { x: x1 - dx, y: y0 + dy };
    case 270:
      return { x: x1 - dy, y: y1 - dx };
    default:
      return { x: x0 + dx, y: y1 - dy };
  }
}

/* ---------- Form fields ---------- */

export interface FormField {
  name: string;
  kind: "text" | "checkbox" | "dropdown" | "radio" | "list";
  value: string | boolean;
  options?: string[];
  multiline?: boolean;
  readOnly: boolean;
}

export async function readFormFields(bytes: Uint8Array, name: string): Promise<{ fields: FormField[]; xfa: boolean }> {
  const lib = await loadPdfLib();
  const doc = await openForEdit(bytes, name);
  let form;
  try {
    form = doc.getForm();
  } catch {
    return { fields: [], xfa: false };
  }
  const fields: FormField[] = [];
  for (const f of form.getFields()) {
    const base = { name: f.getName(), readOnly: f.isReadOnly() };
    try {
      if (f instanceof lib.PDFTextField) fields.push({ ...base, kind: "text", value: f.getText() ?? "", multiline: f.isMultiline() });
      else if (f instanceof lib.PDFCheckBox) fields.push({ ...base, kind: "checkbox", value: f.isChecked() });
      else if (f instanceof lib.PDFDropdown) fields.push({ ...base, kind: "dropdown", value: f.getSelected()[0] ?? "", options: f.getOptions() });
      else if (f instanceof lib.PDFOptionList) fields.push({ ...base, kind: "list", value: f.getSelected()[0] ?? "", options: f.getOptions() });
      else if (f instanceof lib.PDFRadioGroup) fields.push({ ...base, kind: "radio", value: f.getSelected() ?? "", options: f.getOptions() });
    } catch {
      /* skip fields pdf-lib can't read */
    }
  }
  let xfa = false;
  try {
    xfa = form.hasXFA();
  } catch {
    xfa = false;
  }
  return { fields, xfa };
}

/* ---------- Characters ---------- */

let charsetP: Promise<Record<FontName, Set<number>>> | null = null;
/** Code points each built-in font can draw (Windows-1252 / WinAnsi). */
export function fontCharsets() {
  charsetP ??= (async () => {
    const { PDFDocument, StandardFonts } = await loadPdfLib();
    const d = await PDFDocument.create();
    const get = async (f: string) => new Set((await d.embedFont(f)).getCharacterSet());
    return {
      helvetica: await get(StandardFonts.Helvetica),
      times: await get(StandardFonts.TimesRoman),
      courier: await get(StandardFonts.Courier),
    };
  })();
  return charsetP;
}

export function unsupportedChars(text: string, set: Set<number>): string[] {
  const bad = new Set<string>();
  for (const ch of text) if (ch !== "\n" && !set.has(ch.codePointAt(0)!)) bad.add(ch);
  return [...bad];
}

/* ---------- Apply ---------- */

export async function applyEdits(
  bytes: Uint8Array,
  name: string,
  items: EditItem[],
  opts: { formValues?: Record<string, string | boolean>; flattenForm?: boolean } = {},
): Promise<{ bytes: Uint8Array; formErrors: string[] }> {
  const lib = await loadPdfLib();
  const { StandardFonts, rgb, degrees } = lib;
  const doc = await openForEdit(bytes, name);
  const pages = doc.getPages();
  const fonts = new Map<string, PDFFont>();
  const font = async (f: FontName) => {
    if (!fonts.has(f)) {
      const std = f === "times" ? StandardFonts.TimesRoman : f === "courier" ? StandardFonts.Courier : StandardFonts.Helvetica;
      fonts.set(f, await doc.embedFont(std));
    }
    return fonts.get(f)!;
  };
  const imgs = new Map<string, PDFImage>();

  const formErrors: string[] = [];
  const values = opts.formValues ?? {};
  if (Object.keys(values).length || opts.flattenForm) {
    try {
      const form = doc.getForm();
      for (const [fname, v] of Object.entries(values)) {
        try {
          const f = form.getField(fname);
          if (f instanceof lib.PDFTextField) f.setText(String(v));
          else if (f instanceof lib.PDFCheckBox) {
            if (v) f.check();
            else f.uncheck();
          } else if (f instanceof lib.PDFDropdown || f instanceof lib.PDFOptionList) {
            if (v) f.select(String(v));
            else f.clear();
          } else if (f instanceof lib.PDFRadioGroup) {
            if (v) f.select(String(v));
            else f.clear();
          }
        } catch {
          formErrors.push(fname);
        }
      }
      try {
        if (form.hasXFA()) form.deleteXFA();
      } catch {
        /* ignore */
      }
      if (Object.keys(values).length) {
        try {
          form.updateFieldAppearances(await font("helvetica"));
        } catch {
          formErrors.push("(appearances)");
        }
      }
      if (opts.flattenForm) form.flatten();
    } catch {
      formErrors.push("(form)");
    }
  }

  for (const it of items) {
    const page = pages[it.page];
    if (!page) continue;
    const g = pageGeom(page);
    const rotate = degrees(g.rot);
    const color = rgb(...(it.color ?? [0, 0, 0]));
    if (it.kind === "text") {
      const fname = it.font ?? "helvetica";
      const f = await font(fname);
      const size = it.size ?? 12;
      const lines = (it.text ?? "").split("\n");
      lines.forEach((line, k) => {
        if (!line) return;
        const p = toUser(g, it.x, it.y + size * (BASELINE[fname] + TEXT_LINE * k));
        page.drawText(line, { x: p.x, y: p.y, size, font: f, color, rotate });
      });
    } else if (it.kind === "image" && it.image) {
      let im = imgs.get(it.image.id);
      if (!im) {
        im = it.image.format === "png" ? await doc.embedPng(it.image.bytes) : await doc.embedJpg(it.image.bytes);
        imgs.set(it.image.id, im);
      }
      const p = toUser(g, it.x, it.y + it.h);
      page.drawImage(im, { x: p.x, y: p.y, width: it.w, height: it.h, rotate });
    } else if (it.kind === "whiteout") {
      const a = toUser(g, it.x, it.y);
      const b = toUser(g, it.x + it.w, it.y + it.h);
      page.drawRectangle({
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.abs(a.x - b.x),
        height: Math.abs(a.y - b.y),
        color: rgb(...(it.color ?? [1, 1, 1])),
      });
    } else {
      const pts: [number, number][][] =
        it.kind === "check"
          ? [
              [
                [0.12, 0.55],
                [0.4, 0.82],
              ],
              [
                [0.4, 0.82],
                [0.9, 0.18],
              ],
            ]
          : [
              [
                [0.18, 0.18],
                [0.82, 0.82],
              ],
              [
                [0.82, 0.18],
                [0.18, 0.82],
              ],
            ];
      const thickness = Math.max(1, Math.min(it.w, it.h) * 0.12);
      for (const [s, e] of pts) {
        const a = toUser(g, it.x + s[0] * it.w, it.y + s[1] * it.h);
        const b = toUser(g, it.x + e[0] * it.w, it.y + e[1] * it.h);
        page.drawLine({ start: a, end: b, thickness, color, lineCap: lib.LineCapStyle.Round });
      }
    }
  }
  const out = await doc.save({ useObjectStreams: true, updateFieldAppearances: false });
  return { bytes: out, formErrors };
}
