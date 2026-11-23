import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { headingId } from "@/lib/blog-types";

/** Only these link schemes are rendered as links; anything else (javascript:, data:) becomes plain text. */
function safeHref(href: string): string | null {
  const h = href.trim();
  if (h.startsWith("/") || h.startsWith("#")) return h;
  if (/^(https?:|mailto:)/i.test(h)) return h;
  return null;
}

function safeSrc(src: string): string | null {
  const s = src.trim();
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  return /^https?:\/\//i.test(s) ? s : null;
}

/** ![alt](src "caption") → parts. */
const IMG_RE = /^!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)$/;

/*
 * Minimal server-side markdown for registry content (zero client JS):
 * paragraphs, "- " and "1. " lists, | tables |, ``` code blocks ```, > quotes,
 * inline **bold**, *em*, `code` and [text](href). Internal links render through next/link;
 * external links get rel="noopener" and open in the same tab.
 */

/**
 * Static registry content can't know which admin posts exist, so links to /blog/<slug>/ from it render as
 * plain text (never a 404 link). Post bodies pass blogLinks to allow them.
 */
function inline(text: string, keyPrefix: string, blogLinks = false): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={key}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("![")) {
      const im = IMG_RE.exec(tok);
      const src = im && safeSrc(im[2]);
      // eslint-disable-next-line @next/next/no-img-element
      if (im && src) out.push(<img key={key} src={src} alt={im[1]} title={im[3] || undefined} loading="lazy" decoding="async" className="inline-block max-h-[1.5em] align-middle" />);
    } else if (tok.startsWith("[")) {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!;
      const [, label] = lm;
      const href = safeHref(lm[2]);
      if (!href || (!blogLinks && href.startsWith("/blog/") && href !== "/blog/")) {
        out.push(label);
      } else if (href.startsWith("/")) {
        out.push(
          <Link key={key} href={href}>
            {label}
          </Link>,
        );
      } else {
        out.push(
          <a key={key} href={href} rel="noopener">
            {label}
          </a>,
        );
      }
    } else out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, className, blogLinks = false }: { text: string; className?: string; blogLinks?: boolean }) {
  const inl = (t: string, k: string) => inline(t, k, blogLinks);
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let b = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const key = `b${b++}`;
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key} tabIndex={0}>
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const hm = /^(#{2,4})\s+(.+?)\s*#*$/.exec(line);
    if (hm) {
      const level = hm[1].length;
      const id = headingId(hm[2]);
      const content = inl(hm[2], key);
      blocks.push(
        level === 2 ? (
          <h2 key={key} id={id}>{content}</h2>
        ) : level === 3 ? (
          <h3 key={key} id={id}>{content}</h3>
        ) : (
          <h4 key={key} id={id}>{content}</h4>
        ),
      );
      i++;
      continue;
    }
    const im = IMG_RE.exec(line.trim());
    if (im) {
      const src = safeSrc(im[2]);
      if (src)
        blocks.push(
          <figure key={key} className="my-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={im[1]} loading="lazy" decoding="async" className="h-auto w-full rounded-xl border border-line" />
            {im[3] && <figcaption className="mt-2 text-center text-sm text-ink-3">{im[3]}</figcaption>}
          </figure>,
        );
      i++;
      continue;
    }
    if (/^\s*[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*] /, ""));
      blocks.push(
        <ul key={key}>
          {items.map((it, j) => (
            <li key={j}>{inl(it, `${key}-${j}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\s*\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\. /, ""));
      blocks.push(
        <ol key={key}>
          {items.map((it, j) => (
            <li key={j}>{inl(it, `${key}-${j}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i]
          .trim()
          .replace(/^\||\|$/g, "")
          .split(/(?<!\\)\|/) // "\|" inside a cell is a literal pipe
          .map((c) => c.trim().replace(/\\\|/g, "|"));
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <table key={key}>
          <thead>
            <tr>
              {head.map((c, j) => (
                <th key={j} scope="col">
                  {inl(c, `${key}-h${j}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, j) => (
                  <td key={j}>{inl(c, `${key}-${ri}-${j}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }
    if (line.startsWith("> ")) {
      const q: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) q.push(lines[i++].slice(2));
      blocks.push(<blockquote key={key}>{inl(q.join(" "), key)}</blockquote>);
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*([-*]|\d+\.) /.test(lines[i]) &&
      !lines[i].trim().startsWith("|") &&
      !lines[i].startsWith("```") &&
      !/^#{2,4}\s/.test(lines[i]) &&
      !IMG_RE.test(lines[i].trim()) &&
      !lines[i].startsWith("> ")
    )
      para.push(lines[i++]);
    blocks.push(<p key={key}>{inl(para.join(" "), key)}</p>);
  }
  if (className) return <div className={className}>{blocks}</div>;
  return <Fragment>{blocks}</Fragment>;
}

/** Inline-only rendering (for FAQ answers inside other elements, card text, etc.). */
export function InlineMd({ text }: { text: string }) {
  return <>{inline(text, "i")}</>;
}
