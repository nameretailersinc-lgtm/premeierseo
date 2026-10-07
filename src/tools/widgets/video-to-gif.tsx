"use client";

/*
 * Video → animated GIF in the browser. The browser's own video decoder reads MP4/WebM/MOV; frames are
 * captured by seeking, color-reduced and encoded with gifenc (loaded on first use). No upload, no watermark.
 */

import { useEffect, useId, useRef, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Alert, Button, Panel, Segmented, downloadBlob, formatBytes, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { baseName } from "../lib/image/sniff";
import { BlobImage, NumberField, Progress, RangeNumber } from "../lib/image/ui";

const MAX_SECONDS = 30;
const MAX_FRAMES = 600;
const MAX_WIDTH = 1000;

type Gifenc = typeof import("gifenc");

function pickGifenc(m: unknown): Gifenc {
  const mod = m as Gifenc & { default?: Gifenc };
  return (typeof mod.GIFEncoder === "function" ? mod : (mod.default ?? mod)) as Gifenc;
}

function seek(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      clearTimeout(timer);
      v.removeEventListener("seeked", done);
      v.removeEventListener("error", fail);
      resolve();
    };
    const fail = () => {
      clearTimeout(timer);
      v.removeEventListener("seeked", done);
      v.removeEventListener("error", fail);
      reject(new Error("decode"));
    };
    const timer = setTimeout(done, 4000);
    v.addEventListener("seeked", done);
    v.addEventListener("error", fail);
    v.currentTime = t;
  });
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
}

export default function VideoToGif({ toolId }: WidgetProps) {
  const id = useId();
  const { used, completed, announce, error: trackError } = useTool();
  const [o, setO] = usePersistentOptions(toolId, {
    fps: 10,
    width: 480,
    loop: "forever" as "forever" | "once" | "count",
    loopCount: 3,
    colors: 256,
    palette: "frame" as "frame" | "shared",
  });
  const set = <K extends keyof typeof o>(k: K, v: (typeof o)[K]) => setO((p) => ({ ...p, [k]: v }));
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ duration: number; w: number; h: number } | null>(null);
  const [start, setStart] = useState(0);
  const [length, setLength] = useState(3);
  const [progress, setProgress] = useState<{ label: string; value: number; max: number } | null>(null);
  const [gif, setGif] = useState<{ blob: Blob; w: number; h: number; frames: number; seconds: number } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cancel = useRef(false);

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL lifecycle follows the file
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const onFiles = (files: File[]) => {
    setProblem(null);
    setGif(null);
    setMeta(null);
    setStart(0);
    setFile(files[0]);
  };

  const onMeta = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!v.videoWidth || !Number.isFinite(v.duration)) {
      setProblem("This video has no picture track the browser can read.");
      return;
    }
    setMeta({ duration: v.duration, w: v.videoWidth, h: v.videoHeight });
    setLength(Math.min(3, Math.round(v.duration * 10) / 10));
    if (o.width > v.videoWidth) set("width", v.videoWidth);
    announce(`Video loaded, ${Math.round(v.duration)} seconds, ${v.videoWidth} by ${v.videoHeight} pixels.`);
  };

  const onVideoError = () => {
    setMeta(null);
    setProblem(
      "This browser can't play this video, so it can't be converted here. iPhone videos (.mov, HEVC) often play only in Safari; try Safari, or set the iPhone camera to “Most Compatible” to record H.264. MP4 (H.264) and WebM play in every current browser.",
    );
    trackError("VIDEO_DECODE", "input");
  };

  const maxLen = meta ? Math.max(0.1, Math.min(MAX_SECONDS, meta.duration - start)) : MAX_SECONDS;
  const len = Math.min(length, maxLen);
  const outW = meta ? Math.max(16, Math.min(o.width, MAX_WIDTH, meta.w)) : o.width;
  const outH = meta ? Math.max(1, Math.round((meta.h * outW) / meta.w)) : 0;
  const frames = Math.max(1, Math.min(MAX_FRAMES, Math.round(len * o.fps)));
  const colorFactor = o.colors >= 256 ? 1 : o.colors >= 128 ? 0.85 : o.colors >= 64 ? 0.7 : 0.55;
  const est = meta ? [frames * outW * outH * 0.25 * colorFactor, frames * outW * outH * 0.75 * colorFactor] : null;
  const tooMany = meta ? Math.round(len * o.fps) > MAX_FRAMES : false;

  const make = async () => {
    const v = videoRef.current;
    if (!v || !meta || !file) return;
    cancel.current = false;
    setProblem(null);
    setGif(null);
    used("convert");
    try {
      setProgress({ label: "Preparing…", value: 0, max: frames });
      const g = pickGifenc(await import("gifenc"));
      v.pause();
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("canvas");
      ctx.imageSmoothingQuality = "high";
      const enc = g.GIFEncoder();
      const delay = Math.round(1000 / o.fps);
      const repeat = o.loop === "forever" ? 0 : o.loop === "once" ? -1 : Math.max(1, o.loopCount);
      const grab = async (t: number) => {
        await seek(v, Math.min(meta.duration - 0.001, t));
        ctx.drawImage(v, 0, 0, outW, outH);
        return ctx.getImageData(0, 0, outW, outH).data;
      };

      let shared: number[][] | null = null;
      if (o.palette === "shared") {
        // Build one palette from up to 8 frames spread over the clip.
        const samples = Math.min(8, frames);
        const parts: Uint8ClampedArray[] = [];
        for (let i = 0; i < samples; i++) {
          if (cancel.current) throw new Error("cancelled");
          setProgress({ label: `Sampling colors (${i + 1} of ${samples})…`, value: 0, max: frames });
          parts.push(new Uint8ClampedArray(await grab(start + (len * i) / samples)));
        }
        const all = new Uint8ClampedArray(parts.reduce((n, p) => n + p.length, 0));
        let off = 0;
        for (const p of parts) {
          all.set(p, off);
          off += p.length;
        }
        shared = g.quantize(all, o.colors);
      }

      for (let i = 0; i < frames; i++) {
        if (cancel.current) throw new Error("cancelled");
        setProgress({ label: `Encoding frame ${i + 1} of ${frames}…`, value: i, max: frames });
        const data = await grab(start + i / o.fps);
        const palette = shared ?? g.quantize(data, o.colors);
        const index = g.applyPalette(data, palette);
        enc.writeFrame(index, outW, outH, { palette: shared && i > 0 ? undefined : palette, delay, repeat });
        await new Promise((r) => setTimeout(r, 0));
      }
      enc.finish();
      const blob = new Blob([enc.bytes() as BlobPart], { type: "image/gif" });
      setGif({ blob, w: outW, h: outH, frames, seconds: len });
      announce(`GIF ready: ${frames} frames, ${formatBytes(blob.size)}`);
      completed("convert", { frames, fps: o.fps });
    } catch (e) {
      if (e instanceof Error && e.message === "cancelled") announce("Cancelled");
      else {
        setProblem("The GIF couldn't be made. The video may not allow seeking to every frame in this browser; try a shorter clip or a different browser.");
        trackError("GIF_FAILED", "process");
      }
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="grid gap-4">
      <FileDrop
        accept="video/*,.mp4,.mov,.webm,.m4v,.mkv"
        onFiles={onFiles}
        maxBytes={1024 * 1024 * 1024}
        hint={`MP4, WebM or MOV · up to 1 GB · GIFs up to ${MAX_SECONDS} seconds`}
        label={file ? "Choose another video" : "Choose video"}
        compact={!!file}
      />
      {problem && (
        <Alert tone="danger" role="alert">
          {problem}
        </Alert>
      )}

      <Panel title="Clip">
        <div className="grid gap-4 p-3 sm:p-4">
          <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-md border border-line bg-surface-2">
            {url ? (
              <video ref={videoRef} src={url} controls muted playsInline preload="auto" onLoadedMetadata={onMeta} onError={onVideoError} className="max-h-80 max-w-full" aria-label="Video preview" />
            ) : (
              <p className="p-4 text-sm text-ink-3">Choose a video to pick the part you want as a GIF.</p>
            )}
          </div>
          {meta && (
            <>
              <p className="text-sm text-ink-2 tabular-nums">
                Video: {fmtTime(meta.duration)} · {meta.w} × {meta.h} px · {file && formatBytes(file.size)}
              </p>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,10rem)_auto] sm:items-end">
                <NumberField label="Start (seconds)" value={Math.round(start * 10) / 10} onChange={(v) => setStart(Math.max(0, Math.min(meta.duration - 0.1, v ?? 0)))} min={0} max={Math.floor(meta.duration * 10) / 10} />
                <NumberField label={`Length (max ${Math.round(maxLen * 10) / 10} s)`} value={Math.round(len * 10) / 10} onChange={(v) => setLength(Math.max(0.1, v ?? 0.1))} min={0.1} max={MAX_SECONDS} />
                <div className="pb-0.5">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const t = videoRef.current?.currentTime ?? 0;
                      setStart(Math.round(t * 10) / 10);
                    }}
                  >
                    Start at current position
                  </Button>
                </div>
              </div>
              <p className="text-sm text-ink-3 tabular-nums">
                GIF covers {fmtTime(start)} to {fmtTime(start + len)}. Play the video and pause where the GIF should begin, then press &ldquo;Start at current position&rdquo;.
              </p>
            </>
          )}
        </div>
      </Panel>

      <Panel title="GIF settings">
        <div className="grid gap-4 p-3 sm:grid-cols-2 sm:p-4">
          <RangeNumber label="Frames per second" value={o.fps} onChange={(v) => set("fps", v)} min={2} max={30} help="10–15 looks smooth for most clips. Each extra frame adds to the file size." />
          <RangeNumber label="Width" value={o.width} onChange={(v) => set("width", v)} min={80} max={MAX_WIDTH} unit=" px" help="Height follows the video's proportions." />
          <div>
            <label htmlFor={`${id}-col`} className="field-label">
              Colors per frame
            </label>
            <select id={`${id}-col`} className="select w-full" value={o.colors} onChange={(e) => set("colors", Number(e.target.value))}>
              <option value={256}>256 (best)</option>
              <option value={128}>128</option>
              <option value={64}>64</option>
              <option value={32}>32 (smallest)</option>
            </select>
          </div>
          <Segmented
            legend="Palette"
            value={o.palette}
            onChange={(v) => set("palette", v)}
            options={[
              { value: "frame", label: "Per frame (better color)" },
              { value: "shared", label: "Shared (less flicker)" },
            ]}
          />
          <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[auto_minmax(0,8rem)] sm:items-end">
            <Segmented
              legend="Loop"
              value={o.loop}
              onChange={(v) => set("loop", v)}
              options={[
                { value: "forever", label: "Forever" },
                { value: "once", label: "Play once" },
                { value: "count", label: "Repeat N times" },
              ]}
            />
            {o.loop === "count" && <NumberField label="Repeats" value={o.loopCount} onChange={(v) => set("loopCount", v ?? 1)} min={1} max={100} />}
          </div>
        </div>
      </Panel>

      <div className="grid gap-2">
        {meta && (
          <p className="text-sm text-ink-2 tabular-nums">
            {frames} frames at {outW} × {outH} px. Estimated size: about {formatBytes(est![0])}–{formatBytes(est![1])} (busy, fast-moving scenes land at the top of the range).
          </p>
        )}
        {tooMany && <p className="text-sm text-warning">Limited to {MAX_FRAMES} frames: lower the frame rate or shorten the clip.</p>}
        <div>
          <Button variant="primary" size="md" icon="play" disabled={!meta || !!progress} onClick={make}>
            Create GIF
          </Button>
        </div>
      </div>

      {progress && <Progress {...progress} onCancel={() => (cancel.current = true)} />}

      <Panel
        title="GIF"
        actions={
          gif && (
            <Button
              variant="primary"
              icon="download"
              onClick={() => {
                downloadBlob(gif.blob, `${baseName(file?.name ?? "clip")}.gif`);
                completed("download");
              }}
            >
              Download GIF
            </Button>
          )
        }
        footer={
          gif && (
            <>
              <span>{formatBytes(gif.blob.size)}</span>
              <span>
                {gif.w} × {gif.h} px
              </span>
              <span>
                {gif.frames} frames · {gif.seconds.toFixed(1)} s
              </span>
            </>
          )
        }
      >
        <div className="flex min-h-48 items-center justify-center p-3 sm:p-4">
          {gif ? <BlobImage blob={gif.blob} alt="Animated GIF result" className="max-h-96 max-w-full" /> : <p className="text-sm text-ink-3">Your GIF appears here. It has no watermark.</p>}
        </div>
      </Panel>
      <p className="text-sm text-ink-3">The video is read by your browser and never uploaded. Sound is not included: GIFs have no audio.</p>
    </div>
  );
}
