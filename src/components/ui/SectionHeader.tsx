import type { ReactNode } from "react";

/** Section heading row: optional eyebrow, title, one-line subtitle, and an action aligned right. */
export function SectionHeader({
  id,
  eyebrow,
  title,
  subtitle,
  action,
  className = "",
}: {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 ${className}`}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 id={id} className="section-title">
          {title}
        </h2>
        {subtitle && <p className="mt-1.5 text-[0.9375rem] text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
