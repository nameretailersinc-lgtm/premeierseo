import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { PostCard } from "@/components/blog/PostCard";
import { listPublishedPosts } from "@/lib/server/blog-store";
import { collectionGraph } from "@/lib/schema";

export const BLOG_TITLE = "Blog: SEO, Images, PDFs and Web Tips | Premier SEO Services";
export const BLOG_DESCRIPTION =
  "Practical articles from the Premier SEO Services team on SEO, content, images, PDFs and web development, with links to the free tools that help.";
export const PER_PAGE = 15;

export function blogPagePath(n: number) {
  return n <= 1 ? "/blog/" : `/blog/page/${n}/`;
}

/** Posts marked noindex are left off the listing so crawlers are not pointed at them. */
export async function blogPage(n: number) {
  const all = (await listPublishedPosts()).filter((p) => !p.seo.noindex);
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  return { posts: all.slice((n - 1) * PER_PAGE, n * PER_PAGE), pages, total: all.length };
}

export async function BlogIndexView({ page }: { page: number }) {
  const { posts, pages, total } = await blogPage(page);
  if (page > pages) notFound();
  const path = blogPagePath(page);
  const crumbs = page > 1 ? [{ name: "Home", path: "/" }, { name: "Blog", path: "/blog/" }, { name: `Page ${page}` }] : [{ name: "Home", path: "/" }, { name: "Blog" }];
  const categories = [...new Set(posts.map((p) => p.category))];
  return (
    <>
      <JsonLd graph={collectionGraph(path, BLOG_TITLE, BLOG_DESCRIPTION, crumbs)} />
      <div className="hero-band">
        <div className="container-page pb-10">
          <Breadcrumbs crumbs={crumbs} />
          <header className="rise flex max-w-3xl items-start gap-4 sm:gap-5">
            <span className="icon-tile hue-orange mt-1 hidden size-14 rounded-2xl sm:inline-grid">
              <Icon name="book-open" size={26} />
            </span>
            <div>
              <h1 className="text-[2rem] leading-[1.1] font-extrabold tracking-[-0.03em] text-ink sm:text-[2.75rem]">
                Blog{page > 1 ? ` – page ${page}` : ""}
              </h1>
              <p className="mt-4 text-base leading-7 text-ink-2 sm:text-lg">
                Practical articles on SEO, content, images, PDFs and the web, written to go with our free tools.
              </p>
              {total > 0 && (
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-3 shadow-sm">
                  <Icon name="book-open" size={13} />
                  {total} {total === 1 ? "article" : "articles"}
                  {categories.length > 1 ? ` · ${categories.join(" · ")}` : ""}
                </p>
              )}
            </div>
          </header>
        </div>
      </div>
      <div className="container-page">
        {total === 0 ? (
          <p className="card p-6 text-ink-2">New articles are on the way. Meanwhile, browse our <Link href="/tools/" className="font-semibold text-accent hover:underline">free tools</Link>.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p, i) => (
              <PostCard key={p.id} post={p} headingLevel={2} priority={i < 3} />
            ))}
          </ul>
        )}
        {pages > 1 && (
          <nav aria-label="Blog pages" className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {page > 1 && (
              <Link href={blogPagePath(page - 1)} rel="prev" className="btn btn-secondary btn-sm">
                ← Newer
              </Link>
            )}
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={blogPagePath(n)} aria-current={n === page ? "page" : undefined} className={`btn btn-sm ${n === page ? "btn-primary" : "btn-ghost"}`}>
                {n}
              </Link>
            ))}
            {page < pages && (
              <Link href={blogPagePath(page + 1)} rel="next" className="btn btn-secondary btn-sm">
                Older →
              </Link>
            )}
          </nav>
        )}
        <section className="hue-purple card mt-12 flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <span className="icon-tile hidden size-12 rounded-2xl sm:inline-grid">
              <Icon name="pen" size={22} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-ink sm:text-xl">Know this subject better than we do?</h2>
              <p className="mt-1.5 text-sm leading-6 text-ink-3">We publish articles from practitioners who can teach something specific. No fee in either direction.</p>
            </div>
          </div>
          <Link href="/write-for-us/" className="btn btn-primary shrink-0">
            Write for us <Icon name="arrow-right" size={16} />
          </Link>
        </section>
      </div>
    </>
  );
}
