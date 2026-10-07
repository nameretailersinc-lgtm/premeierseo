import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";

/** Brand logo (public/logo.jpg, white background) on a white chip so it stays legible in dark mode. */
export function Wordmark({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Link
      href="/"
      aria-label={`${SITE.name} home`}
      className={`inline-flex shrink-0 items-center rounded-lg bg-white px-2 py-1 ring-1 ring-black/5 transition-shadow hover:shadow-md ${className}`}
    >
      <Image
        src="/logo.jpg"
        alt={SITE.name}
        width={600}
        height={167}
        priority={priority}
        // One small 600px file, sharp at every pixel density; skip the optimizer so browsers and
        // Lighthouse see its true resolution instead of a density-scaled srcset candidate.
        unoptimized
        className="h-9 w-auto sm:h-10"
      />
    </Link>
  );
}
