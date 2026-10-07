"use client";

/*
 * Approximate link-preview cards. The image is NOT loaded automatically: showing it means the visitor's browser
 * requests it from the image's own server, so the user opts in with a button.
 */
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "../../ui/primitives";
import { hostOf } from "./api";

export interface CardData {
  title: string;
  description: string;
  url: string;
  image: string;
  siteName?: string;
  cardType?: "summary" | "summary_large_image";
}

function ImageBox({ src, ratio, small, show }: { src: string; ratio: string; small?: boolean; show: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  const valid = /^https?:\/\//i.test(src);
  return (
    <div className={`relative grid place-items-center overflow-hidden bg-surface-2 text-ink-3 ${small ? "size-24 shrink-0" : "w-full"}`} style={small ? undefined : { aspectRatio: ratio }}>
      {show && valid && failed !== src ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party image chosen by the user
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" referrerPolicy="no-referrer" onError={() => setFailed(src)} />
      ) : (
        <div className="grid justify-items-center gap-1 p-2 text-center text-xs">
          <Icon name="image" size={small ? 18 : 24} />
          <span>{!src ? "No image" : !valid ? "Not a full URL" : failed === src ? "Image didn't load" : "Image hidden"}</span>
        </div>
      )}
    </div>
  );
}

export function SocialPreviews({ d }: { d: CardData }) {
  const host = hostOf(d.url || "https://example.com").replace(/^www\./, "");
  const title = d.title || "No title";
  const desc = d.description;
  const large = (d.cardType ?? "summary_large_image") === "summary_large_image";
  const [show, setShow] = useState(false);
  const imgOk = /^https?:\/\//i.test(d.image);
  return (
    <div className="grid gap-3">
      {imgOk && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
          <Button variant="secondary" icon="eye" onClick={() => setShow(!show)} aria-pressed={show}>
            {show ? "Hide images" : "Show images"}
          </Button>
          <span>Images are loaded only when you ask: your browser then requests them from {hostOf(d.image)}.</span>
        </div>
      )}
    <div className="grid gap-4 sm:grid-cols-2">
      <figure className="min-w-0">
        <figcaption className="mb-1.5 text-xs font-semibold text-ink-3">Facebook (approximate)</figcaption>
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <ImageBox src={d.image} ratio="1.91 / 1" show={show} />
          <div className="border-t border-line bg-surface-2 px-3 py-2">
            <p className="truncate text-xs text-ink-3 uppercase">{host}</p>
            <p className="line-clamp-2 font-semibold text-ink">{title}</p>
            {desc && <p className="line-clamp-1 text-sm text-ink-3">{desc}</p>}
          </div>
        </div>
      </figure>
      <figure className="min-w-0">
        <figcaption className="mb-1.5 text-xs font-semibold text-ink-3">LinkedIn (approximate)</figcaption>
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <ImageBox src={d.image} ratio="1.91 / 1" show={show} />
          <div className="border-t border-line px-3 py-2">
            <p className="line-clamp-2 font-semibold text-ink">{title}</p>
            <p className="truncate text-xs text-ink-3">{host}</p>
          </div>
        </div>
      </figure>
      <figure className="min-w-0">
        <figcaption className="mb-1.5 text-xs font-semibold text-ink-3">X, {large ? "large image card" : "summary card"} (approximate)</figcaption>
        {large ? (
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="relative">
              <ImageBox src={d.image} ratio="2 / 1" show={show} />
              <span className="absolute bottom-2 left-2 max-w-[85%] truncate rounded bg-ink/70 px-1.5 py-0.5 text-xs text-surface">{title}</span>
            </div>
            <p className="truncate px-3 py-1.5 text-xs text-ink-3">From {host}</p>
          </div>
        ) : (
          <div className="flex overflow-hidden rounded-xl border border-line bg-surface">
            <ImageBox src={d.image} ratio="1 / 1" small show={show} />
            <div className="min-w-0 border-l border-line px-3 py-2">
              <p className="truncate text-xs text-ink-3">{host}</p>
              <p className="truncate font-semibold text-ink">{title}</p>
              {desc && <p className="line-clamp-2 text-sm text-ink-3">{desc}</p>}
            </div>
          </div>
        )}
      </figure>
      <figure className="min-w-0">
        <figcaption className="mb-1.5 text-xs font-semibold text-ink-3">Chat apps such as Slack (approximate)</figcaption>
        <div className="border-l-4 border-line-strong bg-surface py-1 pl-3">
          <p className="text-sm font-semibold text-ink">{d.siteName || host}</p>
          <p className="font-semibold text-accent">{title}</p>
          {desc && <p className="line-clamp-3 text-sm text-ink-2">{desc}</p>}
          <div className="mt-2 max-w-60 overflow-hidden rounded-md">
            <ImageBox src={d.image} ratio="1.91 / 1" show={show} />
          </div>
        </div>
      </figure>
    </div>
    </div>
  );
}
