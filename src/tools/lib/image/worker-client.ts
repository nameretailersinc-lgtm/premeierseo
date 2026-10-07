/*
 * Runs PNG encoding and tracing in a Web Worker so the page stays responsive.
 * Falls back to the main thread when workers are unavailable or the worker fails to start.
 */

type Pending = { resolve: (v: unknown) => void; reject: (e: unknown) => void };

function pick<T>(m: unknown): T {
  const mod = m as { default?: T };
  return (mod.default ?? m) as T;
}

export class ImageWorker {
  private w: Worker | null = null;
  private broken = false;
  /** Transfer buffers only once the worker has answered (a failed start would otherwise lose the data). */
  private alive = false;
  private seq = 0;
  private pending = new Map<number, Pending>();

  private get(): Worker | null {
    if (this.broken || typeof Worker === "undefined") return null;
    if (this.w) return this.w;
    try {
      this.w = new Worker(new URL("./image.worker.ts", import.meta.url), { type: "module" });
      this.w.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
        this.alive = true;
        const p = this.pending.get(e.data.id);
        if (!p) return;
        this.pending.delete(e.data.id);
        if (e.data.ok) p.resolve(e.data.result);
        else p.reject(new Error(e.data.error ?? "worker error"));
      };
      this.w.onerror = () => {
        // The worker script failed to load or crashed: fail over to the main thread.
        this.broken = true;
        this.w?.terminate();
        this.w = null;
        const all = [...this.pending.values()];
        this.pending.clear();
        all.forEach((p) => p.reject(new WorkerUnavailable()));
      };
      return this.w;
    } catch {
      this.broken = true;
      return null;
    }
  }

  private call<T>(msg: Record<string, unknown>, transfer: Transferable[]): Promise<T> {
    const w = this.get();
    if (!w) return Promise.reject(new WorkerUnavailable());
    const id = ++this.seq;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      w.postMessage({ ...msg, id }, this.alive ? transfer : []);
    });
  }

  /** Stop any running job (its promise rejects with WorkerCancelled). The next call starts a fresh worker. */
  cancel() {
    if (!this.w) return;
    this.w.terminate();
    this.w = null;
    this.alive = false;
    const all = [...this.pending.values()];
    this.pending.clear();
    all.forEach((p) => p.reject(new WorkerCancelled()));
  }

  /** UPNG encode. `data` is RGBA; it is transferred (unusable afterwards) when the worker is used. */
  async png(data: ArrayBuffer, w: number, h: number, colors: number): Promise<ArrayBuffer> {
    try {
      return await this.call<ArrayBuffer>({ op: "png", data, w, h, colors }, [data]);
    } catch (e) {
      if (!(e instanceof WorkerUnavailable)) throw e;
      const UPNG = pick<typeof import("upng-js").default>(await import("upng-js"));
      return UPNG.encode([data], w, h, colors);
    }
  }

  /** imagetracerjs → SVG string. */
  async trace(data: ArrayBuffer, w: number, h: number, options: Record<string, unknown>): Promise<string> {
    try {
      return await this.call<string>({ op: "trace", data, w, h, options }, [data]);
    } catch (e) {
      if (!(e instanceof WorkerUnavailable)) throw e;
      const Tracer = pick<typeof import("imagetracerjs").default>(await import("imagetracerjs"));
      const img = { width: w, height: h, data: new Uint8ClampedArray(data) } as unknown as ImageData;
      return Tracer.imagedataToSVG(img, options);
    }
  }

  dispose() {
    this.cancel();
    this.broken = true;
  }
}

export class WorkerUnavailable extends Error {
  constructor() {
    super("worker unavailable");
  }
}

export class WorkerCancelled extends Error {
  constructor() {
    super("cancelled");
  }
}

let shared: ImageWorker | null = null;
/** Shared worker for PNG encoding (one per page). */
export function sharedWorker(): ImageWorker {
  if (!shared) shared = new ImageWorker();
  return shared;
}
