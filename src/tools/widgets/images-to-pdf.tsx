"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Alert, Button, Checkbox, Field, Panel, Segmented, formatBytes, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { type CancelToken, checkCancelled, errorCode, errorMessage, isCancelled, nextFrame, outputName, plural, toBlob, uid } from "../lib/pdf/core";
import { imagesToPdf, prepareImage, sniffImage, type Orientation, type PageSizeName, type PreparedImage } from "../lib/pdf/images";
import { OutFileRow, Progress, ReorderList, useObjectUrls, type OutFile } from "../lib/pdf/ui";

type Margin = "none" | "small" | "large";
const MARGIN: Record<Margin, number> = { none: 0, small: 18, large: 36 };

interface Item {
  id: string;
  name: string;
  size: number;
  file: File;
  url: string;
}

export default function ImagesToPdf({ toolId }: WidgetProps) {
  const id = useId();
  const { completed, error: trackError, announce } = useTool();
  const [opts, setOpts] = usePersistentOptions(toolId, {
    size: "a4" as PageSizeName,
    orientation: "auto" as Orientation,
    margin: "small" as Margin,
    reduce: false,
  });
  const [items, setItems] = useState<Item[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [name, setName] = useState("images");
  const [progress, setProgress] = useState<{ label: string; value: number; max: number } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<OutFile | null>(null);
  const cancel = useRef<CancelToken>({ cancelled: false });
  const urls = useObjectUrls();

  const changed = (next: Item[]) => {
    setItems(next);
    setResult(null);
  };

  const add = async (files: File[]) => {
    setResult(null);
    const bad: string[] = [];
    const ok: Item[] = [];
    for (const f of files) {
      const kind = sniffImage(new Uint8Array(await f.slice(0, 32).arrayBuffer()));
      if (kind === "heic") bad.push(`${f.name} is a HEIC photo, which browsers can't open. Convert it with HEIC to JPG first.`);
      else if (kind === "tiff") bad.push(`${f.name} is a TIFF image, which browsers can't open. Save it as JPG or PNG first.`);
      else if (kind === "unknown") bad.push(`${f.name} isn't a JPG, PNG, WebP or GIF image.`);
      else ok.push({ id: uid(), name: f.name, size: f.size, file: f, url: urls.make(f) });
    }
    setItems((prev) => [...prev, ...ok]);
    setRejected(bad);
    if (bad.length) trackError("UNSUPPORTED_FORMAT", "input");
    if (ok.length) announce(`${plural(ok.length, "image")} added${bad.length ? `, ${bad.length} rejected` : ""}`);
  };

  const total = items.reduce((n, i) => n + i.size, 0);

  const build = async () => {
    setProblem(null);
    setResult(null);
    cancel.current = { cancelled: false };
    const token = cancel.current;
    try {
      const prepared: PreparedImage[] = [];
      for (let i = 0; i < items.length; i++) {
        checkCancelled(token);
        setProgress({ label: `Reading image ${i + 1} of ${items.length}`, value: i, max: items.length * 2 });
        await nextFrame();
        prepared.push(await prepareImage(items[i].file, items[i].name, { reduce: opts.reduce }));
      }
      const bytes = await imagesToPdf(prepared, { size: opts.size, orientation: opts.orientation, margin: MARGIN[opts.margin] }, token, (d, t) =>
        setProgress({ label: `Adding page ${Math.min(d + 1, t)} of ${t}`, value: items.length + d, max: items.length * 2 }),
      );
      const file = { name: outputName(name, "pdf", "images"), blob: toBlob(bytes), detail: plural(items.length, "page") };
      setResult(file);
      announce(`Created ${file.name}, ${plural(items.length, "page")}, ${formatBytes(bytes.length)}`);
      completed("convert", { images: items.length, size: opts.size });
    } catch (e) {
      if (isCancelled(e)) announce("Cancelled");
      else {
        setProblem(errorMessage(e, "The PDF couldn't be created. One of the images may be damaged."));
        trackError(errorCode(e), "process");
      }
    } finally {
      setProgress(null);
    }
  };

  const setOpt = <K extends keyof typeof opts>(k: K, v: (typeof opts)[K]) => {
    setOpts((o) => ({ ...o, [k]: v }));
    setResult(null);
  };

  return (
    <div className="grid gap-4">
      <FileDrop
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.heic,.heif"
        multiple
        pasteImages
        onFiles={add}
        hint="JPG, PNG, WebP or GIF · up to 100 MB each · paste with Ctrl+V"
        label="Choose images"
        compact={items.length > 0}
      />
      {rejected.length > 0 && (
        <Alert tone="danger" role="alert" title={rejected.length === 1 ? "One file wasn't added" : `${rejected.length} files weren't added`}>
          <ul className="grid gap-1">
            {rejected.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          {rejected.some((r) => r.includes("HEIC")) && (
            <p className="mt-1">
              <Link href="/heic-to-jpg-converter/">Open HEIC to JPG</Link>
            </p>
          )}
        </Alert>
      )}

      <Panel
        title={items.length ? `Images, in page order (${items.length})` : "Images, in page order"}
        actions={
          items.length > 1 && (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  changed([...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
                  announce("Sorted by file name");
                }}
              >
                Sort by name
              </Button>
              <Button variant="ghost" icon="trash" onClick={() => changed([])}>
                Clear all
              </Button>
            </>
          )
        }
        footer={
          items.length > 0 && (
            <>
              <span>{plural(items.length, "page")}</span>
              <span>{formatBytes(total)} of images</span>
            </>
          )
        }
      >
        <div className="min-h-24 p-3 sm:p-4">
          {items.length ? (
            <ReorderList
              label="Images, in page order"
              items={items}
              onChange={changed}
              renderRow={(it) => (
                <div className="flex min-w-0 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                  <img src={it.url} alt="" className="size-12 shrink-0 rounded-sm border border-line bg-surface-2 object-contain" loading="lazy" decoding="async" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink" title={it.name}>
                      {it.name}
                    </p>
                    <p className="text-sm text-ink-3 tabular-nums">{formatBytes(it.size)}</p>
                  </div>
                </div>
              )}
            />
          ) : (
            <p className="text-sm text-ink-3">No images yet. Each image becomes one page, in the order shown here.</p>
          )}
        </div>
      </Panel>

      <Panel title="Page setup">
        <div className="grid gap-4 p-3 sm:p-4">
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <Segmented<PageSizeName>
              legend="Page size"
              value={opts.size}
              onChange={(v) => setOpt("size", v)}
              options={[
                { value: "a4", label: "A4" },
                { value: "letter", label: "US Letter" },
                { value: "fit", label: "Same as image" },
              ]}
            />
            {opts.size !== "fit" && (
              <Segmented<Orientation>
                legend="Orientation"
                value={opts.orientation}
                onChange={(v) => setOpt("orientation", v)}
                options={[
                  { value: "auto", label: "Match image" },
                  { value: "portrait", label: "Portrait" },
                  { value: "landscape", label: "Landscape" },
                ]}
              />
            )}
            <Segmented<Margin>
              legend="Margin"
              value={opts.margin}
              onChange={(v) => setOpt("margin", v)}
              options={[
                { value: "none", label: "None" },
                { value: "small", label: "Small" },
                { value: "large", label: "Large" },
              ]}
            />
          </div>
          <Checkbox
            checked={opts.reduce}
            onChange={(v) => setOpt("reduce", v)}
            label="Make the PDF smaller"
            help="Scales large photos to at most 2000 px and saves them as JPEG at 80% quality. Leave off to embed images unchanged."
          />
          <p className="text-sm text-ink-3">
            Images are scaled to fit inside the margins without cropping or stretching.{" "}
            {opts.size === "fit" ? "With Same as image, each page takes the shape of its image." : "Match image turns the page to landscape for wide images."}
          </p>
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,18rem)_auto] sm:items-end">
        <Field label="Output file name" htmlFor={`${id}-name`} help=".pdf is added automatically">
          <input id={`${id}-name`} className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <div className="sm:pb-7">
          <Button variant="primary" size="md" icon="file" disabled={!items.length || !!progress} onClick={build}>
            Convert to PDF
          </Button>
        </div>
      </div>

      {progress && <Progress {...progress} onCancel={() => (cancel.current.cancelled = true)} />}
      {problem && (
        <Alert tone="danger" role="alert">
          {problem}
        </Alert>
      )}
      {result && (
        <div className="grid gap-2">
          <Alert tone="success" role="status" title="PDF ready">
            {plural(items.length, "image")} in the order shown, one per page. The download stays available until you change the list or settings.
          </Alert>
          <ul>
            <OutFileRow file={result} primary />
          </ul>
        </div>
      )}
    </div>
  );
}
