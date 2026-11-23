import Link from "next/link";
import { Icon } from "@/components/Icon";
import { postPath, readingMinutes, type BlogPost } from "@/lib/blog-types";

export function formatPostDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Blog card used on /blog/ and the homepage. */
export function PostCard({ post, headingLevel = 3, priority = false }: { post: BlogPost; headingLevel?: 2 | 3; priority?: boolean }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const img = post.featuredImage;
  return (
    <li className="card-link group flex flex-col overflow-hidden">
      {img ? (
        <div className="aspect-[16/9] overflow-hidden border-b border-line bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.src}
            alt={img.alt}
            width={img.width}
            height={img.height}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        <div className="hue-orange grid aspect-[16/9] place-items-center border-b border-line bg-hue-tint">
          <span className="icon-tile size-14 rounded-2xl">
            <Icon name="book-open" size={26} />
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <span className="eyebrow text-accent">{post.category}</span>
        <H className="mt-2 line-clamp-2 text-[1.0625rem] leading-snug font-bold text-ink">
          <Link href={postPath(post.slug)}>{post.title}</Link>
        </H>
        {post.excerpt && <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-ink-3">{post.excerpt}</p>}
        <p className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4 text-xs text-ink-3">
          <span>
            <time dateTime={post.datePublished}>{formatPostDate(post.datePublished)}</time> · {readingMinutes(post.content)} min read
          </span>
          <span className="arrow-dot">
            <Icon name="arrow-right" size={14} strokeWidth={2.25} />
          </span>
        </p>
      </div>
    </li>
  );
}
