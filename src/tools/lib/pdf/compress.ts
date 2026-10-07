/*
 * "Keep text" PDF optimisation. Pure pdf-lib + fflate, so it also runs in node for tests.
 *  1. Drops objects that nothing in the document refers to.
 *  2. Deflates streams that were stored uncompressed (lossless).
 *  3. Optionally re-encodes photos (JPEG, or simple 8-bit Flate images) through an injected
 *     encoder (the browser uses a canvas); images are only replaced when the result is smaller.
 *  4. Saves with compressed object streams.
 * Text, fonts, links and form fields are untouched.
 */
import type { PDFDict as PDFDictT, PDFDocument, PDFObject, PDFRawStream as PDFRawStreamT, PDFRef } from "pdf-lib";
import { type CancelToken, checkCancelled, loadPdfLib, openForEdit } from "./core";

export type ImageSource =
  | { kind: "jpeg"; bytes: Uint8Array; width: number; height: number }
  | { kind: "raw"; pixels: Uint8Array; width: number; height: number; components: 1 | 3 };

/** Returns a smaller JPEG (with its pixel size) or null to keep the original image. */
export type ImageEncoder = (src: ImageSource) => Promise<{ bytes: Uint8Array; width: number; height: number } | null>;

export interface OptimizeReport {
  before: number;
  after: number;
  removedObjects: number;
  deflatedStreams: number;
  imagesFound: number;
  imagesRecompressed: number;
}

export async function optimizePdf(
  bytes: Uint8Array,
  name: string,
  opts: { encoder?: ImageEncoder; token?: CancelToken; onProgress?: (done: number, total: number) => void } = {},
): Promise<{ bytes: Uint8Array; report: OptimizeReport }> {
  const lib = await loadPdfLib();
  const { PDFDict, PDFArray, PDFRef, PDFName, PDFNumber, PDFRawStream, PDFStream, decodePDFRawStream } = lib;
  const doc: PDFDocument = await openForEdit(bytes, name);
  const ctx = doc.context;
  const N = (s: string) => PDFName.of(s);

  /* 1. Reachability from the trailer. */
  const reachable = new Set<string>();
  const masks = new Set<string>();
  const stack: PDFObject[] = [];
  const t = ctx.trailerInfo;
  for (const o of [t.Root, t.Info, t.Encrypt]) if (o) stack.push(o as PDFObject);
  while (stack.length) {
    const o = stack.pop()!;
    if (o instanceof PDFRef) {
      const k = o.toString();
      if (reachable.has(k)) continue;
      reachable.add(k);
      const v = ctx.lookup(o);
      if (v) stack.push(v);
    } else if (o instanceof PDFDict) {
      for (const [key, v] of o.entries()) {
        if ((key === N("SMask") || key === N("Mask")) && v instanceof PDFRef) masks.add(v.toString());
        stack.push(v);
      }
    } else if (o instanceof PDFArray) {
      for (let i = 0; i < o.size(); i++) stack.push(o.get(i));
    } else if (o instanceof PDFStream) {
      stack.push(o.dict);
    }
  }
  let removedObjects = 0;
  for (const [ref] of ctx.enumerateIndirectObjects()) {
    if (!reachable.has(ref.toString())) {
      ctx.delete(ref);
      removedObjects++;
    }
  }

  /* 2 + 3. Streams. */
  const { zlibSync } = await import("fflate");
  let deflatedStreams = 0;
  let imagesFound = 0;
  let imagesRecompressed = 0;
  const objs = ctx.enumerateIndirectObjects().filter(([, o]) => o instanceof PDFRawStream) as [PDFRef, PDFRawStreamT][];
  const images = objs.filter(([, s]) => s.dict.get(N("Subtype")) === N("Image"));
  imagesFound = images.length;

  const num = (d: PDFDictT, k: string) => {
    const v = d.lookup(N(k));
    return v instanceof PDFNumber ? v.asNumber() : undefined;
  };
  const filterOf = (d: PDFDictT): string[] => {
    const f = d.lookup(N("Filter"));
    if (f instanceof PDFName) return [f.decodeText()];
    if (f instanceof PDFArray) return f.asArray().map((x) => (x instanceof PDFName ? x.decodeText() : "?"));
    return [];
  };
  const colorComponents = (d: PDFDictT): 1 | 3 | 0 => {
    const cs = d.lookup(N("ColorSpace"));
    if (cs === N("DeviceRGB")) return 3;
    if (cs === N("DeviceGray")) return 1;
    if (cs instanceof PDFArray && cs.size() === 2 && cs.lookup(0) === N("ICCBased")) {
      const icc = cs.lookup(1);
      const n = icc instanceof PDFStream ? icc.dict.lookup(N("N")) : undefined;
      const nn = n instanceof PDFNumber ? n.asNumber() : 0;
      return nn === 3 ? 3 : nn === 1 ? 1 : 0;
    }
    return 0;
  };

  let done = 0;
  const total = objs.length;
  for (const [ref, s] of objs) {
    checkCancelled(opts.token);
    opts.onProgress?.(done++, total);
    const d = s.dict;
    const filters = filterOf(d);
    const isImage = d.get(N("Subtype")) === N("Image");

    if (isImage && opts.encoder && !masks.has(ref.toString())) {
      const w = num(d, "Width") ?? 0;
      const h = num(d, "Height") ?? 0;
      const bpc = num(d, "BitsPerComponent");
      const comps = colorComponents(d);
      const eligible =
        w * h >= 40_000 &&
        s.contents.length > 20_000 &&
        bpc === 8 &&
        comps > 0 &&
        !d.has(N("Decode")) &&
        !(d.lookup(N("Mask")) instanceof PDFArray) &&
        d.lookup(N("ImageMask")) !== lib.PDFBool.True;
      let src: ImageSource | null = null;
      if (eligible && filters.length === 1 && filters[0] === "DCTDecode") {
        src = { kind: "jpeg", bytes: s.contents, width: w, height: h };
      } else if (eligible && filters.length === 1 && filters[0] === "FlateDecode" && !d.has(N("DecodeParms"))) {
        try {
          const pixels = decodePDFRawStream(s).decode();
          if (pixels.length >= w * h * comps) src = { kind: "raw", pixels, width: w, height: h, components: comps as 1 | 3 };
        } catch {
          src = null;
        }
      }
      if (src) {
        try {
          const r = await opts.encoder(src);
          if (r && r.bytes.length < s.contents.length * 0.9) {
            const nd = d.clone(ctx);
            nd.set(N("Filter"), N("DCTDecode"));
            nd.set(N("Width"), PDFNumber.of(r.width));
            nd.set(N("Height"), PDFNumber.of(r.height));
            nd.set(N("ColorSpace"), N("DeviceRGB"));
            nd.set(N("BitsPerComponent"), PDFNumber.of(8));
            nd.delete(N("DecodeParms"));
            nd.delete(N("Length"));
            ctx.assign(ref, PDFRawStream.of(nd, r.bytes));
            imagesRecompressed++;
          }
        } catch {
          /* keep the original image */
        }
      }
      continue;
    }

    if (!filters.length && s.contents.length > 64 && d.get(N("Type")) !== N("Metadata")) {
      const z = zlibSync(s.contents, { level: 9 });
      if (z.length < s.contents.length) {
        const nd = d.clone(ctx);
        nd.set(N("Filter"), N("FlateDecode"));
        nd.delete(N("Length"));
        ctx.assign(ref, PDFRawStream.of(nd, z));
        deflatedStreams++;
      }
    }
  }

  const out = await doc.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false });
  return {
    bytes: out,
    report: { before: bytes.length, after: out.length, removedObjects, deflatedStreams, imagesFound, imagesRecompressed },
  };
}

