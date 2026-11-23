import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ToolMark } from "@/components/cards";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { Markdown } from "@/components/Markdown";
import { formatPostDate } from "@/components/blog/PostCard";
import { getTool } from "@/content/tools";
import { effectiveDescription, effectiveMetaTitle, headingsOf, postPath, readingMinutes } from "@/lib/blog-types";
import { absImage, blogPostGraph } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";
import { getPublishedPost, listPublishedPosts } from "@/lib/server/blog-store";
import { SITE, absUrl } from "@/lib/site";
import { toolHue } from "@/lib/tool-icon";

// Posts are managed from /admin/ and read from the data volume at request time.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublishedPost(slug);
  if (!p) return { title: "Not found", robots: { index: false } };
  const path = postPath(p.slug);
  const title = effectiveMetaTitle(p);
  const description = effectiveDescription(p);
  const base = buildMetadata({ path, title, description, ogType: "article", publishedTime: p.datePublished, modifiedTime: p.dateModified });
  const share = p.seo.ogImage ?? p.featuredImage;
  const shareImage = share
    ? { url: absImage(share.src), ...(share.width ? { width: share.width, height: share.height } : {}), alt: share.alt || p.title }
    : { url: absUrl(`${path}og-image.png`), width: 1200, height: 630, alt: p.title };
  const ogTitle = p.seo.ogTitle || title;
  const ogDescription = p.seo.ogDescription || description;
  const keywords = [p.seo.focusKeyword, ...p.seo.secondaryKeywords].filter(Boolean);
  return {
    ...base,
    ...(keywords.length ? { keywords } : {}),
    ...(p.authorName ? { authors: [{ name: p.authorName, url: p.authorUrl || undefined }] } : {}),
    category: p.category,
    alternates: { canonical: p.seo.canonicalUrl || absUrl(path) },
    robots: {
      index: !p.seo.noindex,
      follow: !p.seo.nofollow,
      ...(p.seo.noindex ? {} : { "max-image-preview": "large" as const, "max-snippet": -1, "max-video-preview": -1 }),
    },
    openGraph: {
      type: "article",
      url: absUrl(path),
      siteName: SITE.name,
      locale: SITE.locale,
      title: ogTitle,
      description: ogDescription,
      images: [shareImage],
      publishedTime: p.datePublished,
      modifiedTime: p.dateModified,
      section: p.category,
      tags: p.tags,
      ...(p.authorName ? { authors: [p.authorName] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: p.seo.twitterTitle || ogTitle,
      description: p.seo.twitterDescription || ogDescription,
      images: [shareImage.url],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const p = await getPublishedPost(slug);
  if (!p) notFound();
  const crumbs = [{ name: "Home", path: "/" }, { name: "Blog", path: "/blog/" }, { name: p.title }];
  const tools = p.relatedTools.map(getTool).filter((t) => t && t.indexable);
  const others = (await listPublishedPosts()).filter((x) => x.id !== p.id && !x.seo.noindex);
  const more = [...others.filter((x) => x.category === p.category), ...others.filter((x) => x.category !== p.category)].slice(0, 4);
  const toc = headingsOf(p.content).filter((h) => h.level === 2);
  const modified = p.dateModified.slice(0, 10) !== p.datePublished.slice(0, 10);
  const img = p.featuredImage;
  return (
    <>
      <JsonLd graph={blogPostGraph(p, crumbs)} />
      <div className="hero-band">
        <div className="container-page pb-10">
          <Breadcrumbs crumbs={crumbs} />
          <header className="rise max-w-3xl">
            <p className="eyebrow eyebrow-pill">{p.category}</p>
            <h1 className="mt-4 text-[2rem] leading-[1.12] font-extrabold tracking-[-0.03em] text-ink sm:text-[2.625rem]">{p.title}</h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-3">
              <span>
                By{" "}
                {p.authorName ? (
                  p.authorUrl ? (
                    <a href={p.authorUrl} rel="author" className="font-medium text-ink-2 underline hover:text-ink">
                      {p.authorName}
                    </a>
                  ) : (
                    <span className="font-medium text-ink-2">{p.authorName}</span>
                  )
                ) : (
                  <Link href="/about-us/" className="font-medium text-ink-2 underline hover:text-ink">
                    the Premier SEO Services team
                  </Link>
                )}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Published <time dateTime={p.datePublished}>{formatPostDate(p.datePublished)}</time>
              </span>
              {modified && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Updated <time dateTime={p.dateModified}>{formatPostDate(p.dateModified)}</time>
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Icon name="clock" size={14} /> {readingMinutes(p.content)} min read
              </span>
            </p>
          </header>
        </div>
      </div>
      <div className="container-page">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-10">
          <article className="card min-w-0 overflow-hidden">
            {img && (
              <figure className="border-b border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt}
                  width={img.width}
                  height={img.height}
                  fetchPriority="high"
                  decoding="async"
                  className="h-auto max-h-[32rem] w-full object-cover"
                />
                {img.caption && <figcaption className="px-6 py-3 text-center text-sm text-ink-3 sm:px-10">{img.caption}</figcaption>}
              </figure>
            )}
            <div className="p-6 sm:p-10">
              {p.excerpt && (
                <aside aria-label="Summary" className="rounded-2xl border border-accent-line bg-accent-subtle p-5">
                  <p className="flex items-center gap-2 text-sm font-bold text-accent">
                    <Icon name="sparkles" size={16} /> In short
                  </p>
                  <p className="mt-2 text-[0.9375rem] leading-7 text-ink-2">{p.excerpt}</p>
                </aside>
              )}
              {toc.length >= 3 && (
                <nav aria-label="On this page" className="mt-6 rounded-2xl border border-line bg-surface-2 p-5 text-sm">
                  <p className="font-bold text-ink">On this page</p>
                  <ol className="mt-2 grid gap-1 pl-5 [list-style:decimal] marker:text-ink-3">
                    {toc.map((h) => (
                      <li key={h.id}>
                        <a href={`#${h.id}`} className="font-medium text-accent hover:underline">
                          {h.text.replace(/[*`]/g, "")}
                        </a>
                      </li>
                    ))}
                    {p.faqs.length > 0 && (
                      <li>
                        <a href="#faq" className="font-medium text-accent hover:underline">
                          Frequently asked questions
                        </a>
                      </li>
                    )}
                  </ol>
                </nav>
              )}
              <div className="prose-body mt-8 max-w-none">
                <Markdown text={p.content} blogLinks />
                {p.faqs.length > 0 && (
                  <section aria-labelledby="faq">
                    <h2 id="faq">Frequently asked questions</h2>
                    {p.faqs.map((f, i) => (
                      <div key={i}>
                        <h3>{f.q}</h3>
                        <Markdown text={f.a} blogLinks />
                      </div>
                    ))}
                  </section>
                )}
              </div>
              {p.tags.length > 0 && (
                <ul aria-label="Tags" className="mt-10 flex flex-wrap gap-2 border-t border-line pt-6">
                  {p.tags.map((t) => (
                    <li key={t} className="chip">
                      #{t}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
          <aside className="grid content-start gap-5 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
            {tools.length > 0 && (
              <div className="card p-4">
                <h2 className="px-1 pb-2 font-bold text-ink">Tools used in this post</h2>
                <ul className="grid gap-1">
                  {tools.map((t) => (
                    <li
                      key={t!.id}
                      className={`group hue-${toolHue(t!.id)} relative flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-hue-tint has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-focus`}
                    >
                      <ToolMark tool={t!} size={40} className="rounded-xl" />
                      <span className="min-w-0 flex-1">
                        <Link href={t!.path} className="text-sm font-semibold text-ink after:absolute after:inset-0 focus-visible:outline-none">
                          {t!.name}
                        </Link>
                        <span className="mt-0.5 line-clamp-1 block text-xs text-ink-3">{t!.card}</span>
                      </span>
                      <Icon name="chevron-right" size={16} className="shrink-0 text-ink-3" />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {more.length > 0 && (
              <div className="card p-4">
                <h2 className="px-1 pb-2 font-bold text-ink">More from the blog</h2>
                <ul className="grid gap-1">
                  {more.map((m) => (
                    <li key={m.id}>
                      <Link href={postPath(m.slug)} className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-accent hover:bg-accent-subtle">
                        <Icon name="file-text" size={16} className="mt-0.5 shrink-0" />
                        {m.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
