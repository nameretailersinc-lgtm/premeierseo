import Link from "next/link";
import { CATEGORIES } from "@/content/categories";
import { TOOLS } from "@/content/tools";
import { SITE } from "@/lib/site";
import { Icon } from "@/components/Icon";
import { Wordmark } from "./Wordmark";
import { ThemeRadios } from "./ThemeToggle";

const POPULAR = [
  ["/word-counter/", "Word counter"],
  ["/reduce-image-size-in-kb/", "Reduce image size in KB"],
  ["/merge-pdf/", "Merge PDF"],
  ["/compress-pdf/", "Compress PDF"],
  ["/json-viewer/", "JSON viewer"],
  ["/redirect-checker/", "Redirect checker"],
  ["/qr-code-generator/", "QR code generator"],
  ["/percentage-calculator/", "Percentage calculator"],
] as const;

const COMPANY = [
  ["/about-us/", "About"],
  ["/contact/", "Contact"],
  ["/tool-complain/", "Report a problem"],
  ["/faq/", "FAQ"],
  ["/blog/", "Guides"],
  ["/privacy-policy/", "Privacy policy"],
  ["/terms-and-conditions/", "Terms and conditions"],
  ["/write-for-us/", "Write for us"],
] as const;

function Col({ title, links }: { title: string; links: readonly (readonly [string, string])[] }) {
  return (
    <nav aria-label={title}>
      <p className="mb-4 text-sm font-semibold text-ink">{title}</p>
      <ul className="grid gap-2.5 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="text-ink-3 transition-colors hover:text-ink">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  const browser = TOOLS.filter((t) => t.processing === "browser").length;
  return (
    <footer className="theme-dark relative mt-24 overflow-hidden bg-canvas text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3b6dff]/60 to-transparent"
      />
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:py-16">
        <div className="max-w-sm sm:col-span-2 lg:col-span-1">
          <Wordmark />
          <p className="mt-4 text-sm leading-6 text-ink-2">
            Free online tools for SEO, text, images, PDFs and code. {browser} of {TOOLS.length} run entirely in your browser, and every
            tool page says exactly where your data goes.
          </p>
          <a
            href={`mailto:${SITE.email}`}
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
          >
            <Icon name="mail" size={16} />
            {SITE.email}
          </a>
          <div className="mt-6">
            <ThemeRadios />
          </div>
        </div>
        <Col title="Tool categories" links={[...CATEGORIES.map((c) => [c.path, c.label] as const), ["/tools/", "All tools A–Z"] as const]} />
        <Col title="Popular tools" links={POPULAR} />
        <Col title="Help and company" links={COMPANY} />
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-5 text-sm text-ink-3">
          <p>
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <p>Free · No sign-up · No paywall</p>
        </div>
      </div>
    </footer>
  );
}
