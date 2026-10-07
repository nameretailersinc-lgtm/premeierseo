/* Minimal type declarations for image libraries that ship without types. Loaded lazily by the widgets. */

declare module "upng-js" {
  interface UPNGImage {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    frames: unknown[];
    tabs: Record<string, unknown>;
  }
  const UPNG: {
    /** cnum = 0 → lossless; otherwise the number of colors to quantize to (palette PNG when ≤ 256). */
    encode(bufs: ArrayBuffer[], w: number, h: number, cnum: number, dels?: number[], forbidPlte?: boolean): ArrayBuffer;
    decode(buf: ArrayBuffer): UPNGImage;
    toRGBA8(img: UPNGImage): ArrayBuffer[];
  };
  export default UPNG;
}

declare module "imagetracerjs" {
  interface TracerColor {
    r: number;
    g: number;
    b: number;
    a: number;
  }
  interface TraceData {
    layers: unknown[][];
    palette: TracerColor[];
    width: number;
    height: number;
  }
  interface ImageTracerApi {
    imagedataToTracedata(imgd: ImageData, options?: Record<string, unknown>): TraceData;
    getsvgstring(tracedata: TraceData, options?: Record<string, unknown>): string;
    imagedataToSVG(imgd: ImageData, options?: Record<string, unknown>): string;
  }
  const ImageTracer: ImageTracerApi;
  export default ImageTracer;
}

declare module "gifenc" {
  type Palette = number[][];
  interface GifStream {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: { palette?: Palette; delay?: number; repeat?: number; transparent?: boolean; transparentIndex?: number; dispose?: number; first?: boolean },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
  }
  export function GIFEncoder(opts?: { auto?: boolean; initialCapacity?: number }): GifStream;
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: "rgb565" | "rgb444" | "rgba4444"; oneBitAlpha?: boolean | number; clearAlpha?: boolean },
  ): Palette;
  export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Palette, format?: "rgb565" | "rgb444" | "rgba4444"): Uint8Array;
}
