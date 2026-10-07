import { Icon } from "./Icon";
import { Markdown } from "./Markdown";
import type { Faq } from "@/lib/types";

/** FAQ items as native <details>: answers are in the DOM (crawlable), keyboard accessible, no JS. No FAQPage markup. */
export function FaqItems({ items, layout = "list" }: { items: Faq[]; layout?: "list" | "grid" }) {
  return (
    <div className={layout === "grid" ? "grid items-start gap-3 md:grid-cols-2 md:gap-4" : "grid gap-3"}>
      {items.map((f, i) => (
        <details key={i} className="group card overflow-hidden transition-colors open:border-accent-line">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
            <h3 className="text-[0.9375rem] leading-snug font-semibold text-ink">{f.q}</h3>
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-3 transition-transform duration-200 group-open:rotate-180 group-open:bg-accent-subtle group-open:text-accent">
              <Icon name="chevron-down" size={16} />
            </span>
          </summary>
          <div className="prose-body px-5 pb-5 text-[0.9375rem]">
            <Markdown text={f.a} />
          </div>
        </details>
      ))}
    </div>
  );
}

/** FAQ section with its own heading (tool pages, hubs, FAQ page). */
export function FaqList({
  items,
  heading = "Frequently asked questions",
  id = "faq",
  layout = "list",
}: {
  items: Faq[];
  heading?: string;
  id?: string;
  layout?: "list" | "grid";
}) {
  if (!items.length) return null;
  return (
    <section aria-labelledby={id} className="mt-12">
      <h2 id={id} className="mb-4 text-xl font-bold text-ink sm:text-2xl">
        {heading}
      </h2>
      <FaqItems items={items} layout={layout} />
    </section>
  );
}
