/*
 * Image worker: CPU-heavy steps that would otherwise freeze the page.
 *   png   → UPNG.encode (lossless filtering or palette quantization, keeps alpha)
 *   trace → imagetracerjs raster-to-vector tracing, returns SVG markup
 * Libraries are bundled (never loaded from a CDN). Messages: { id, op, ... } → { id, ok, result | error }.
 */

interface PngReq {
  id: number;
  op: "png";
  data: ArrayBuffer;
  w: number;
  h: number;
  colors: number;
}
interface TraceReq {
  id: number;
  op: "trace";
  data: ArrayBuffer;
  w: number;
  h: number;
  options: Record<string, unknown>;
}
type Req = PngReq | TraceReq;

interface WorkerScope {
  onmessage: ((e: MessageEvent<Req>) => void) | null;
  postMessage: (msg: unknown, transfer?: Transferable[]) => void;
}

const scope = self as unknown as WorkerScope;

function pick<T>(m: unknown): T {
  const mod = m as { default?: T };
  return (mod.default ?? m) as T;
}

scope.onmessage = async (e: MessageEvent<Req>) => {
  const msg = e.data;
  try {
    if (msg.op === "png") {
      const UPNG = pick<typeof import("upng-js").default>(await import("upng-js"));
      const out = UPNG.encode([msg.data], msg.w, msg.h, msg.colors);
      scope.postMessage({ id: msg.id, ok: true, result: out }, [out]);
    } else if (msg.op === "trace") {
      const Tracer = pick<typeof import("imagetracerjs").default>(await import("imagetracerjs"));
      const img = { width: msg.w, height: msg.h, data: new Uint8ClampedArray(msg.data) } as unknown as ImageData;
      const svg = Tracer.imagedataToSVG(img, msg.options);
      scope.postMessage({ id: msg.id, ok: true, result: svg });
    }
  } catch (err) {
    scope.postMessage({ id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
