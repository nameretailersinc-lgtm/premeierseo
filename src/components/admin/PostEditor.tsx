"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { AdminHeader } from "./AdminHeader";
import { scoreColor } from "./PostTable";
import {
  LIMITS,
  SCHEMA_TYPES,
  effectiveDescription,
  effectiveMetaTitle,
  emptySeo,
  headingsOf,
  readingMinutes,
  seoChecks,
  seoScore,
  slugifyPost,
  wordCount,
  type BlogImage,
  type BlogPost,
  type BlogSeo,
  type PostStatus,
  type SchemaType,
} from "@/lib/blog-types";

interface Props {
  initial?: BlogPost;
  tools: { id: string; name: string; path: string }[];
  categories: string[];
  tags: string[];
  taken: { id: string; slug: string }[];
  internalLinks: { label: string; href: string }[];
}

const ORIGIN = "https://premierseoservices.com";

function blankPost(): BlogPost {
  const now = new Date().toISOString();
  return {
    id: "",
    slug: "",
    status: "draft",
    title: "",
    excerpt: "",
    content: "",
    category: "SEO",
    tags: [],
    authorName: "",
    authorUrl: "",
    featuredImage: null,
    seo: emptySeo(),
    faqs: [],
    relatedTools: [],
    datePublished: "",
    dateModified: now,
    createdAt: now,
  };
}

/* ---------- image upload (downscales big photos in the browser first: faster pages, fits proxy limits) ---------- */

async function shrink(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const max = 1920;
    if (bmp.width <= max && file.size <= 900 * 1024) return file;
    const scale = Math.min(1, max / bmp.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

async function uploadImage(file: File, nameHint: string): Promise<BlogImage> {
  const body = new FormData();
  const blob = await shrink(file);
  body.append("file", blob, file.name);
  body.append("name", nameHint || file.name.replace(/\.[^.]+$/, ""));
  const res = await fetch("/api/admin/upload", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as { src?: string; width?: number; height?: number; error?: string };
  if (!res.ok || !data.src) throw new Error(data.error || (res.status === 413 ? "Image too large for the server." : "Upload failed."));
  return { src: data.src, alt: "", width: data.width, height: data.height };
}

/* ---------- small UI pieces ---------- */

function Counter({ n, range }: { n: number; range: readonly [number, number] }) {
  const [lo, hi] = range;
  const color = n === 0 ? "var(--ink-3)" : n < lo || n > hi ? "#b45309" : "#15803d";
  return (
    <span className="text-xs font-semibold tabular-nums" style={{ color }}>
      {n} / {lo}–{hi}
    </span>
  );
}

function Bar({ n, range }: { n: number; range: readonly [number, number] }) {
  const pct = Math.min(100, (n / range[1]) * 100);
  const color = n < range[0] ? "#b45309" : n > range[1] ? "#b42318" : "#15803d";
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function FieldRow({ label, htmlFor, help, right, children }: { label: string; htmlFor?: string; help?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="field-label">
          {label}
        </label>
        {right}
      </div>
      {children}
      {help && <p className="field-help">{help}</p>}
    </div>
  );
}

function ImageField({
  id,
  label,
  value,
  onChange,
  nameHint,
  withCaption = true,
  help,
}: {
  id: string;
  label: string;
  value: BlogImage | null;
  onChange: (v: BlogImage | null) => void;
  nameHint: string;
  withCaption?: boolean;
  help?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function pick(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    setErr("");
    try {
      const img = await uploadImage(f, nameHint);
      onChange({ ...img, alt: value?.alt || "", caption: value?.caption });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="grid gap-4">
      <div>
        <p className="field-label">{label}</p>
        <div
          className="grid min-h-44 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-surface-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files[0]);
          }}
        >
          {value?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.src} alt={value.alt} className="max-h-80 w-full object-contain" />
          ) : (
            <p className="p-6 text-center text-sm text-ink-3">Drop an image here or choose a file. JPG, PNG, WebP or GIF, up to 5 MB. 1200×630 or larger works best.</p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Uploading…" : value?.src ? "Replace image" : "Upload image"}
          </button>
          {value?.src && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>
              Remove
            </button>
          )}
          {value?.width && (
            <span className="text-xs text-ink-3">
              {value.width}×{value.height}px
            </span>
          )}
        </div>
        {err && <p className="mt-2 text-sm font-medium text-[#b42318]">{err}</p>}
        {help && <p className="field-help">{help}</p>}
      </div>
      {value?.src && (
        <>
          <FieldRow label="Alt text (required for SEO and accessibility)" htmlFor={`${id}-alt`} help="Describe what the image shows. Include the focus keyword only if it fits naturally." right={<span className="text-xs text-ink-3">{value.alt.length}/125</span>}>
            <input id={`${id}-alt`} className="input" value={value.alt} maxLength={200} onChange={(e) => onChange({ ...value, alt: e.target.value })} />
          </FieldRow>
          {withCaption && (
            <FieldRow label="Caption (optional)" htmlFor={`${id}-cap`}>
              <input id={`${id}-cap`} className="input" value={value.caption ?? ""} onChange={(e) => onChange({ ...value, caption: e.target.value })} />
            </FieldRow>
          )}
        </>
      )}
    </div>
  );
}

const toLocalInput = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};

type Tab = "content" | "image" | "seo" | "social" | "faq";

type ToolbarId = "h2" | "h3" | "b" | "i" | "link" | "ul" | "ol" | "quote" | "code" | "table";
const TOOLBAR: { id: ToolbarId; label: string; title: string }[] = [
  { id: "h2", label: "H2", title: "Section heading (##)" },
  { id: "h3", label: "H3", title: "Sub-heading (###)" },
  { id: "b", label: "B", title: "Bold" },
  { id: "i", label: "I", title: "Italic" },
  { id: "link", label: "Link", title: "External link" },
  { id: "ul", label: "• List", title: "Bulleted list" },
  { id: "ol", label: "1. List", title: "Numbered list" },
  { id: "quote", label: "Quote", title: "Quote" },
  { id: "code", label: "Code", title: "Code block" },
  { id: "table", label: "Table", title: "Table" },
];

/* ---------- editor ---------- */

export function PostEditor({ initial, tools, categories, tags: knownTags, taken, internalLinks }: Props) {
  const [post, setPost] = useState<BlogPost>(() => initial ?? blankPost());
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [kwText, setKwText] = useState((initial?.seo.secondaryKeywords ?? []).join(", "));
  const [tab, setTab] = useState<Tab>("content");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [toolFilter, setToolFilter] = useState("");
  const [imgPanel, setImgPanel] = useState(false);
  const [linkPanel, setLinkPanel] = useState(false);
  const [inlineImg, setInlineImg] = useState<BlogImage | null>(null);
  const [linkFilter, setLinkFilter] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);

  const set = useCallback((patch: Partial<BlogPost>) => {
    setPost((p) => ({ ...p, ...patch }));
    setDirty(true);
  }, []);
  const setSeo = useCallback((patch: Partial<BlogSeo>) => {
    setPost((p) => ({ ...p, seo: { ...p.seo, ...patch } }));
    setDirty(true);
  }, []);

  const checks = useMemo(() => seoChecks(post), [post]);
  const score = seoScore(checks);
  const metaTitle = effectiveMetaTitle(post);
  const metaDesc = effectiveDescription(post);
  const slugClash = taken.some((t) => t.slug === post.slug && t.id !== post.id);
  const isLive = post.status === "published" && !!post.datePublished && post.datePublished <= new Date().toISOString();

  /* save */
  const save = useCallback(
    async (status?: PostStatus) => {
      setSaving(true);
      setNotice(null);
      const body: BlogPost = { ...post, status: status ?? post.status };
      try {
        const res = await fetch(post.id ? `/api/admin/posts/${post.id}` : "/api/admin/posts", {
          method: post.id ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as { post?: BlogPost; error?: string };
        if (res.status === 401) throw new Error("Your session expired. Open /admin/login/ in a new tab, sign in, then save again.");
        if (!res.ok || !data.post) throw new Error(data.error || "Save failed.");
        const wasNew = !post.id;
        setPost(data.post);
        setSlugTouched(true);
        setDirty(false);
        setNotice({ kind: "ok", text: data.post.status === "published" ? "Published. Changes are live." : "Draft saved." });
        if (wasNew) window.history.replaceState(null, "", `/admin/posts/${data.post.id}/`);
      } catch (e) {
        setNotice({ kind: "err", text: (e as Error).message });
      } finally {
        setSaving(false);
      }
    },
    [post],
  );

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving) save();
      }
    };
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("beforeunload", leave);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("beforeunload", leave);
    };
  }, [dirty, save, saving]);

  /* markdown helpers */
  function insert(before: string, after = "", placeholder = "", block = false) {
    const el = ta.current;
    const v = post.content;
    const s = el?.selectionStart ?? v.length;
    const e = el?.selectionEnd ?? v.length;
    const sel = v.slice(s, e) || placeholder;
    let pre = before;
    if (block && s > 0 && v[s - 1] !== "\n") pre = `\n\n${before}`;
    const next = v.slice(0, s) + pre + sel + after + v.slice(e);
    set({ content: next });
    requestAnimationFrame(() => {
      el?.focus();
      const start = s + pre.length;
      el?.setSelectionRange(start, start + sel.length);
    });
  }
  const linePrefix = (prefix: string, placeholder: string) => {
    const el = ta.current;
    const v = post.content;
    const s = el?.selectionStart ?? v.length;
    const e = el?.selectionEnd ?? v.length;
    const sel = v.slice(s, e);
    if (sel.includes("\n")) {
      const lines = sel.split("\n").map((l, i) => (l.trim() ? (prefix === "1. " ? `${i + 1}. ` : prefix) + l : l));
      set({ content: v.slice(0, s) + lines.join("\n") + v.slice(e) });
    } else insert(prefix, "", placeholder, true);
  };

  function runTool(id: ToolbarId) {
    switch (id) {
      case "h2": return insert("## ", "\n\n", "Section heading", true);
      case "h3": return insert("### ", "\n\n", "Sub-heading", true);
      case "b": return insert("**", "**", "bold text");
      case "i": return insert("*", "*", "italic text");
      case "link": return insert("[", "](https://)", "link text");
      case "ul": return linePrefix("- ", "List item");
      case "ol": return linePrefix("1. ", "First step");
      case "quote": return linePrefix("> ", "Quoted text");
      case "code": return insert("```\n", "\n```\n\n", "code", true);
      case "table": return insert("| Column A | Column B |\n|---|---|\n| ", " | Value |\n\n", "Value", true);
    }
  }

  const toolMatches = tools.filter((t) => !post.relatedTools.includes(t.id) && t.name.toLowerCase().includes(toolFilter.toLowerCase())).slice(0, 8);
  const linkMatches = internalLinks.filter((l) => l.label.toLowerCase().includes(linkFilter.toLowerCase())).slice(0, 8);
  const words = wordCount(post.content);
  const heads = headingsOf(post.content);

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${tab === id ? "bg-accent text-on-accent" : "text-ink-2 hover:bg-surface-2"}`}
    >
      {label}
    </button>
  );

  return (
    <>
      <AdminHeader title={post.id ? "Edit post" : "New post"}>
        <Link href="/admin/" className="btn btn-ghost btn-sm">
          ← All posts
        </Link>
      </AdminHeader>

      {notice && (
        <p role="status" className={`mb-4 rounded-xl border p-3 text-sm font-medium ${notice.kind === "ok" ? "border-[#15803d55] bg-[#15803d12] text-[#15803d]" : "border-[#b4231855] bg-[#b4231812] text-[#b42318]"}`}>
          {notice.text}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ---------------- main column ---------------- */}
        <div className="grid min-w-0 gap-6">
          <div className="card grid gap-5 p-5 sm:p-6">
            <FieldRow label="Title (H1)" htmlFor="title" right={<Counter n={post.title.length} range={LIMITS.title} />}>
              <input
                id="title"
                className="input text-lg font-semibold"
                value={post.title}
                placeholder="How to …"
                onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugifyPost(e.target.value) }) })}
              />
            </FieldRow>
            <FieldRow
              label="URL slug"
              htmlFor="slug"
              help={
                slugClash ? (
                  <span className="text-[#b42318]">Another post already uses this slug.</span>
                ) : (
                  <>
                    {ORIGIN}/blog/<strong>{post.slug || "your-slug"}</strong>/
                    {initial?.status === "published" && initial.slug !== post.slug && (
                      <span className="text-[#b45309]"> · Changing the slug of a published post breaks its existing URL.</span>
                    )}
                  </>
                )
              }
              right={<span className="text-xs text-ink-3">{post.slug.length}/{LIMITS.slug}</span>}
            >
              <div className="flex gap-2">
                <input
                  id="slug"
                  className="input mono"
                  value={post.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-") });
                  }}
                  onBlur={() => set({ slug: slugifyPost(post.slug) })}
                />
                <button type="button" className="btn btn-secondary btn-sm shrink-0" onClick={() => set({ slug: slugifyPost(post.seo.focusKeyword || post.title) })}>
                  Generate
                </button>
              </div>
            </FieldRow>
          </div>

          <div className="card overflow-hidden">
            <div role="tablist" aria-label="Editor sections" className="flex flex-wrap gap-1 border-b border-line p-2">
              {tabBtn("content", "Content")}
              {tabBtn("image", `Featured image${post.featuredImage ? " ✓" : ""}`)}
              {tabBtn("seo", "SEO")}
              {tabBtn("social", "Social sharing")}
              {tabBtn("faq", `FAQ${post.faqs.length ? ` (${post.faqs.length})` : ""}`)}
            </div>

            {/* ---- CONTENT ---- */}
            {tab === "content" && (
              <div className="grid gap-5 p-5 sm:p-6">
                <FieldRow label="Excerpt / summary" htmlFor="excerpt" help="Shown on blog cards and as the “In short” box at the top of the post. Also used as the meta description if you leave that empty." right={<span className="text-xs text-ink-3">{post.excerpt.length}/{LIMITS.excerpt}</span>}>
                  <textarea id="excerpt" className="textarea" style={{ ["--ta-min" as string]: "5rem", ["--ta-min-lg" as string]: "5rem" }} value={post.excerpt} onChange={(e) => set({ excerpt: e.target.value })} />
                </FieldRow>

                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="field-label mb-0">Body</p>
                    <div className="flex gap-1 rounded-lg bg-surface-2 p-1 text-sm">
                      {(["write", "preview"] as const).map((m) => (
                        <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-md px-3 py-1 font-semibold capitalize ${mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-3"}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  {mode === "write" ? (
                    <>
                      <div className="flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-line bg-surface-2 p-1.5">
                        {TOOLBAR.map((b) => (
                          <button key={b.id} type="button" title={b.title} onClick={() => runTool(b.id)} className="rounded-md px-2.5 py-1 text-xs font-bold text-ink-2 hover:bg-surface hover:text-ink">
                            {b.label}
                          </button>
                        ))}
                        <button type="button" title="Link to a page on this site" onClick={() => (setLinkPanel((x) => !x), setImgPanel(false))} className="rounded-md px-2.5 py-1 text-xs font-bold text-accent hover:bg-surface">
                          Internal link
                        </button>
                        <button type="button" title="Upload and insert an image" onClick={() => (setImgPanel((x) => !x), setLinkPanel(false))} className="rounded-md px-2.5 py-1 text-xs font-bold text-accent hover:bg-surface">
                          + Image
                        </button>
                      </div>
                      {linkPanel && (
                        <div className="grid gap-2 border border-b-0 border-line bg-surface p-3">
                          <input className="input" placeholder="Search posts and tools…" value={linkFilter} onChange={(e) => setLinkFilter(e.target.value)} autoFocus />
                          <ul className="grid max-h-56 gap-0.5 overflow-auto">
                            {linkMatches.map((l) => (
                              <li key={l.href}>
                                <button
                                  type="button"
                                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent-subtle"
                                  onClick={() => {
                                    insert("[", `](${l.href})`, l.label);
                                    setLinkPanel(false);
                                  }}
                                >
                                  <span className="font-semibold text-ink">{l.label}</span> <span className="text-xs text-ink-3">{l.href}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {imgPanel && (
                        <div className="border border-b-0 border-line bg-surface p-3">
                          <ImageField id="inline-img" label="Image to insert" value={inlineImg} onChange={setInlineImg} nameHint={post.slug || post.title} />
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={!inlineImg?.src || !inlineImg.alt.trim()}
                              onClick={() => {
                                const cap = inlineImg!.caption ? ` "${inlineImg!.caption.replace(/"/g, "'")}"` : "";
                                insert(`![${inlineImg!.alt.replace(/[[\]]/g, "")}](${inlineImg!.src}${cap})`, "\n\n", "", true);
                                setInlineImg(null);
                                setImgPanel(false);
                              }}
                            >
                              Insert into post
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setImgPanel(false), setInlineImg(null))}>
                              Cancel
                            </button>
                          </div>
                          {inlineImg?.src && !inlineImg.alt.trim() && <p className="field-help">Add alt text to insert the image.</p>}
                        </div>
                      )}
                      <textarea
                        ref={ta}
                        id="content"
                        aria-label="Post body (Markdown)"
                        className="textarea mono rounded-t-none"
                        style={{ ["--ta-min" as string]: "28rem", ["--ta-min-lg" as string]: "36rem" }}
                        value={post.content}
                        onChange={(e) => set({ content: e.target.value })}
                        placeholder={"Intro paragraph that answers the question quickly…\n\n## First section\n\nText, **bold**, [links](/tools/), lists:\n\n- point one\n- point two\n\n### A sub-section\n\n![Alt text](/media/uploads/… \"Optional caption\")"}
                      />
                    </>
                  ) : (
                    <div className="prose-body min-h-[28rem] max-w-none rounded-xl border border-line p-5 sm:p-8">
                      {post.content.trim() ? <Markdown text={post.content} blogLinks /> : <p className="text-ink-3">Nothing to preview yet.</p>}
                    </div>
                  )}
                  <p className="field-help">
                    {words} words · {readingMinutes(post.content)} min read · {heads.filter((h) => h.level === 2).length} H2 · {heads.filter((h) => h.level === 3).length} H3 · Markdown: <code>##</code> heading, <code>**bold**</code>, <code>[text](url)</code>, <code>- list</code>,{" "}
                    <code>![alt](src)</code>. Use ## for sections (the title is already the H1). Ctrl/⌘+S saves.
                  </p>
                </div>
              </div>
            )}

            {/* ---- FEATURED IMAGE ---- */}
            {tab === "image" && (
              <div className="p-5 sm:p-6">
                <ImageField
                  id="featured"
                  label="Featured image"
                  value={post.featuredImage}
                  onChange={(v) => set({ featuredImage: v })}
                  nameHint={post.seo.focusKeyword || post.slug || post.title}
                  help="Shown at the top of the post and on blog cards, and used for social sharing unless you set a separate social image. The file is renamed from your focus keyword or slug for SEO."
                />
              </div>
            )}

            {/* ---- SEO ---- */}
            {tab === "seo" && (
              <div className="grid gap-5 p-5 sm:p-6">
                <div className="rounded-xl border border-line bg-surface p-4">
                  <p className="mb-2 text-xs font-bold tracking-wide text-ink-3 uppercase">Google preview</p>
                  <div className="max-w-[600px] font-[arial,sans-serif]">
                    <p className="truncate text-[14px] text-[#4d5156]">premierseoservices.com › blog › {post.slug || "your-slug"}</p>
                    <p className="truncate text-[20px] leading-[1.3] text-[#1a0dab] dark:text-[#8ab4f8]">{metaTitle || "Your SEO title"}</p>
                    <p className="line-clamp-2 text-[14px] leading-[1.58] text-[#4d5156] dark:text-[#bdc1c6]">
                      {post.datePublished && <span className="text-[#70757a]">{new Date(post.datePublished).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} — </span>}
                      {metaDesc.length > 160 ? `${metaDesc.slice(0, 157)}…` : metaDesc || "Your meta description."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FieldRow label="Focus keyword" htmlFor="kw" help="The main search phrase this post should rank for.">
                    <input id="kw" className="input" value={post.seo.focusKeyword} onChange={(e) => setSeo({ focusKeyword: e.target.value })} />
                  </FieldRow>
                  <FieldRow label="Secondary keywords" htmlFor="kw2" help="Comma-separated related phrases and synonyms.">
                    <input
                      id="kw2"
                      className="input"
                      value={kwText}
                      onChange={(e) => {
                        setKwText(e.target.value);
                        setSeo({ secondaryKeywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) });
                      }}
                    />
                  </FieldRow>
                </div>

                <FieldRow label="SEO title (meta title)" htmlFor="mt" help="Leave empty to use the post title. Front-load the keyword; Google cuts titles at ~600px (about 60 characters)." right={<Counter n={metaTitle.length} range={LIMITS.metaTitle} />}>
                  <input id="mt" className="input" value={post.seo.metaTitle} placeholder={post.title} onChange={(e) => setSeo({ metaTitle: e.target.value })} />
                  <Bar n={metaTitle.length} range={LIMITS.metaTitle} />
                </FieldRow>

                <FieldRow label="Meta description" htmlFor="md" help="Leave empty to use the excerpt. Summarise the page and give a reason to click." right={<Counter n={metaDesc.length} range={LIMITS.metaDescription} />}>
                  <textarea id="md" className="textarea" style={{ ["--ta-min" as string]: "5rem", ["--ta-min-lg" as string]: "5rem" }} value={post.seo.metaDescription} placeholder={post.excerpt} onChange={(e) => setSeo({ metaDescription: e.target.value })} />
                  <Bar n={metaDesc.length} range={LIMITS.metaDescription} />
                </FieldRow>

                <FieldRow label="Canonical URL" htmlFor="canon" help="Leave empty (recommended) so the post is its own canonical. Only set this if the article was first published elsewhere.">
                  <input id="canon" className="input mono" value={post.seo.canonicalUrl} placeholder={`${ORIGIN}/blog/${post.slug || "your-slug"}/`} onChange={(e) => setSeo({ canonicalUrl: e.target.value })} />
                </FieldRow>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FieldRow label="Schema type (JSON-LD)" htmlFor="schema" help="BlogPosting suits most posts. FAQ schema is added automatically from the FAQ tab.">
                    <select id="schema" className="select" value={post.seo.schemaType} onChange={(e) => setSeo({ schemaType: e.target.value as SchemaType })}>
                      {SCHEMA_TYPES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </FieldRow>
                  <div>
                    <p className="field-label">Search engine indexing</p>
                    <label className="flex items-center gap-2 py-1 text-sm text-ink-2">
                      <input type="checkbox" checked={post.seo.noindex} onChange={(e) => setSeo({ noindex: e.target.checked })} /> noindex (hide from search results and sitemap)
                    </label>
                    <label className="flex items-center gap-2 py-1 text-sm text-ink-2">
                      <input type="checkbox" checked={post.seo.nofollow} onChange={(e) => setSeo({ nofollow: e.target.checked })} /> nofollow (don’t pass link equity)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ---- SOCIAL ---- */}
            {tab === "social" && (
              <div className="grid gap-5 p-5 sm:p-6">
                <div className="max-w-[520px] overflow-hidden rounded-xl border border-line bg-surface">
                  {(post.seo.ogImage ?? post.featuredImage)?.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(post.seo.ogImage ?? post.featuredImage)!.src} alt="" className="aspect-[1.91/1] w-full object-cover" />
                  ) : (
                    <div className="grid aspect-[1.91/1] place-items-center bg-surface-2 p-6 text-center text-sm text-ink-3">A branded card with the title is generated automatically.</div>
                  )}
                  <div className="border-t border-line p-3">
                    <p className="text-xs text-ink-3 uppercase">premierseoservices.com</p>
                    <p className="line-clamp-1 font-bold text-ink">{post.seo.ogTitle || metaTitle || "Title"}</p>
                    <p className="line-clamp-2 text-sm text-ink-3">{post.seo.ogDescription || metaDesc}</p>
                  </div>
                </div>
                <FieldRow label="Open Graph title" htmlFor="ogt" help="Facebook, LinkedIn, WhatsApp, Slack. Empty = SEO title." right={<span className="text-xs text-ink-3">{post.seo.ogTitle.length}/{LIMITS.ogTitle}</span>}>
                  <input id="ogt" className="input" value={post.seo.ogTitle} placeholder={metaTitle} onChange={(e) => setSeo({ ogTitle: e.target.value })} />
                </FieldRow>
                <FieldRow label="Open Graph description" htmlFor="ogd" help="Empty = meta description." right={<span className="text-xs text-ink-3">{post.seo.ogDescription.length}/{LIMITS.ogDescription}</span>}>
                  <textarea id="ogd" className="textarea" style={{ ["--ta-min" as string]: "4.5rem", ["--ta-min-lg" as string]: "4.5rem" }} value={post.seo.ogDescription} placeholder={metaDesc} onChange={(e) => setSeo({ ogDescription: e.target.value })} />
                </FieldRow>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FieldRow label="X / Twitter title" htmlFor="twt" help="Empty = Open Graph title.">
                    <input id="twt" className="input" value={post.seo.twitterTitle} onChange={(e) => setSeo({ twitterTitle: e.target.value })} />
                  </FieldRow>
                  <FieldRow label="X / Twitter description" htmlFor="twd" help="Empty = Open Graph description.">
                    <input id="twd" className="input" value={post.seo.twitterDescription} onChange={(e) => setSeo({ twitterDescription: e.target.value })} />
                  </FieldRow>
                </div>
                <ImageField
                  id="ogimg"
                  label="Social share image (optional, 1200×630)"
                  value={post.seo.ogImage}
                  onChange={(v) => setSeo({ ogImage: v })}
                  nameHint={`${post.slug || "post"}-social`}
                  withCaption={false}
                  help="Empty = featured image, or the generated card if there is none."
                />
              </div>
            )}

            {/* ---- FAQ ---- */}
            {tab === "faq" && (
              <div className="grid gap-4 p-5 sm:p-6">
                <p className="text-sm text-ink-3">Questions appear at the end of the post and are marked up as FAQPage structured data. Answer each in 1–3 sentences; links and **bold** work.</p>
                {post.faqs.map((f, i) => (
                  <div key={i} className="grid gap-3 rounded-xl border border-line p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-ink-3">Q{i + 1}</span>
                      <div className="flex gap-1">
                        <button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => { const a = [...post.faqs]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set({ faqs: a }); }} aria-label="Move up">↑</button>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={i === post.faqs.length - 1} onClick={() => { const a = [...post.faqs]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; set({ faqs: a }); }} aria-label="Move down">↓</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ faqs: post.faqs.filter((_, j) => j !== i) })}>Remove</button>
                      </div>
                    </div>
                    <input className="input font-semibold" placeholder="Question" aria-label={`Question ${i + 1}`} value={f.q} onChange={(e) => set({ faqs: post.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })} />
                    <textarea className="textarea" style={{ ["--ta-min" as string]: "5rem", ["--ta-min-lg" as string]: "5rem" }} placeholder="Answer" aria-label={`Answer ${i + 1}`} value={f.a} onChange={(e) => set({ faqs: post.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })} />
                  </div>
                ))}
                <button type="button" className="btn btn-secondary justify-self-start" onClick={() => set({ faqs: [...post.faqs, { q: "", a: "" }] })}>
                  + Add question
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ---------------- sidebar ---------------- */}
        <aside className="grid content-start gap-5 lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
          <div className="card grid gap-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-ink">Publish</h2>
              <span className="chip">{post.status === "draft" ? "Draft" : isLive ? "Published" : "Scheduled"}</span>
            </div>
            <FieldRow label="Publish date" htmlFor="pub" help="A future date schedules the post. Empty = now, on first publish.">
              <input
                id="pub"
                type="datetime-local"
                className="input"
                value={toLocalInput(post.datePublished)}
                onChange={(e) => set({ datePublished: e.target.value ? new Date(e.target.value).toISOString() : "" })}
              />
            </FieldRow>
            {post.id && <p className="text-xs text-ink-3">Last saved {new Date(post.dateModified).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}{dirty ? " · unsaved changes" : ""}</p>}
            <div className="grid gap-2">
              <button type="button" className="btn btn-primary" disabled={saving || slugClash || !post.title.trim()} onClick={() => save("published")}>
                {saving ? "Saving…" : post.status === "published" ? "Update" : "Publish"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn btn-secondary btn-sm" disabled={saving || slugClash || !post.title.trim()} onClick={() => save(post.status === "published" ? "draft" : undefined)}>
                  {post.status === "published" ? "Unpublish" : "Save draft"}
                </button>
                {isLive && !dirty ? (
                  <a href={`/blog/${post.slug}/`} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">
                    View post ↗
                  </a>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setTab("content"), setMode("preview"))}>
                    Preview
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-ink">SEO score</h2>
              <span className="text-2xl font-extrabold tabular-nums" style={{ color: scoreColor(score) }}>
                {score}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: scoreColor(score) }} />
            </div>
            <ul className="mt-4 grid gap-1.5 text-[0.8125rem]">
              {checks.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: c.status === "good" ? "#15803d" : c.status === "warn" ? "#d97706" : "#b42318" }} />
                  <span className={c.status === "good" ? "text-ink-2" : "text-ink"}>
                    <span className="sr-only">{c.status === "good" ? "Pass: " : c.status === "warn" ? "Improve: " : "Problem: "}</span>
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card grid gap-4 p-5">
            <h2 className="font-bold text-ink">Organise</h2>
            <FieldRow label="Category" htmlFor="cat">
              <input id="cat" className="input" list="cat-list" value={post.category} onChange={(e) => set({ category: e.target.value })} />
              <datalist id="cat-list">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </FieldRow>
            <FieldRow label="Tags" htmlFor="tags" help={knownTags.length ? `Used before: ${knownTags.slice(0, 12).join(", ")}` : "Comma-separated."}>
              <input
                id="tags"
                className="input"
                value={tagsText}
                onChange={(e) => {
                  setTagsText(e.target.value);
                  set({ tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) });
                }}
              />
            </FieldRow>
            <FieldRow label="Author name" htmlFor="author" help="Empty = “Premier SEO Services team”. A named author helps E-E-A-T.">
              <input id="author" className="input" value={post.authorName} onChange={(e) => set({ authorName: e.target.value })} />
            </FieldRow>
            <FieldRow label="Author profile URL" htmlFor="authorurl">
              <input id="authorurl" className="input" placeholder="https://www.linkedin.com/in/…" value={post.authorUrl} onChange={(e) => set({ authorUrl: e.target.value })} />
            </FieldRow>
          </div>

          <div className="card grid gap-3 p-5">
            <h2 className="font-bold text-ink">Related tools</h2>
            <p className="-mt-1 text-xs text-ink-3">Shown in the post sidebar as “Tools used in this post”. Up to 8.</p>
            {post.relatedTools.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {post.relatedTools.map((id) => (
                  <li key={id}>
                    <button type="button" className="chip" title="Remove" onClick={() => set({ relatedTools: post.relatedTools.filter((x) => x !== id) })}>
                      {tools.find((t) => t.id === id)?.name ?? id} ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {post.relatedTools.length < 8 && (
              <>
                <input className="input" placeholder="Search tools…" aria-label="Search tools" value={toolFilter} onChange={(e) => setToolFilter(e.target.value)} />
                {toolFilter && (
                  <ul className="grid gap-0.5">
                    {toolMatches.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          className="w-full rounded-md px-2 py-1.5 text-left text-sm font-medium text-ink hover:bg-accent-subtle"
                          onClick={() => {
                            set({ relatedTools: [...post.relatedTools, t.id] });
                            setToolFilter("");
                          }}
                        >
                          + {t.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
