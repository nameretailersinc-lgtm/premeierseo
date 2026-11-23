"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface PostRow {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  category: string;
  datePublished: string;
  dateModified: string;
  noindex: boolean;
  image: string;
  score: number;
}

const fmt = (d: string) => (d ? new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");

export function scoreColor(n: number) {
  return n >= 80 ? "#15803d" : n >= 55 ? "#b45309" : "#b42318";
}

export function PostTable({ rows: initial }: { rows: PostRow[] }) {
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "published">("all");
  const [busy, setBusy] = useState("");
  const shown = useMemo(
    () => rows.filter((r) => (status === "all" || r.status === status) && (r.title + r.slug + r.category).toLowerCase().includes(q.toLowerCase())),
    [rows, q, status],
  );

  async function remove(r: PostRow) {
    if (!confirm(`Delete “${r.title}” permanently? Its URL will return 404.`)) return;
    setBusy(r.id);
    const res = await fetch(`/api/admin/posts/${r.id}`, { method: "DELETE" });
    setBusy("");
    if (res.ok) setRows((x) => x.filter((y) => y.id !== r.id));
    else alert(((await res.json().catch(() => ({}))) as { error?: string }).error || "Delete failed.");
  }

  const live = (r: PostRow) => r.status === "published" && r.datePublished <= new Date().toISOString();

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <input className="input max-w-xs" placeholder="Search posts…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search posts" />
        <select className="select w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status">
          <option value="all">All ({rows.length})</option>
          <option value="published">Published ({rows.filter((r) => r.status === "published").length})</option>
          <option value="draft">Drafts ({rows.filter((r) => r.status === "draft").length})</option>
        </select>
      </div>
      {shown.length === 0 ? (
        <p className="p-8 text-center text-ink-3">
          {rows.length === 0 ? (
            <>
              No posts yet.{" "}
              <Link href="/admin/posts/new/" className="font-semibold text-accent hover:underline">
                Write the first one
              </Link>
              .
            </>
          ) : (
            "No posts match."
          )}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-surface-2 text-xs tracking-wide text-ink-3 uppercase">
              <tr>
                <th className="px-4 py-3">Post</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">SEO</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-line align-middle">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image} alt="" className="size-12 shrink-0 rounded-lg border border-line object-cover" />
                      ) : (
                        <span className="size-12 shrink-0 rounded-lg border border-dashed border-line bg-surface-2" />
                      )}
                      <div className="min-w-0">
                        <Link href={`/admin/posts/${r.id}/`} className="line-clamp-1 font-semibold text-ink hover:text-accent">
                          {r.title || "(untitled)"}
                        </Link>
                        <p className="line-clamp-1 text-xs text-ink-3">
                          /blog/{r.slug}/ · {r.category}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="chip">{r.status === "draft" ? "Draft" : live(r) ? "Published" : "Scheduled"}</span>
                    {r.noindex && <span className="chip ml-1">noindex</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold" style={{ color: scoreColor(r.score) }}>
                      {r.score}
                    </span>
                    <span className="text-ink-3">/100</span>
                  </td>
                  <td className="px-4 py-3 text-ink-3">{fmt(r.dateModified)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/posts/${r.id}/`} className="btn btn-secondary btn-sm">
                        Edit
                      </Link>
                      {live(r) && (
                        <a href={`/blog/${r.slug}/`} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">
                          View
                        </a>
                      )}
                      <button type="button" className="btn btn-ghost btn-sm" disabled={busy === r.id} onClick={() => remove(r)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
