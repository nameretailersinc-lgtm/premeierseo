import type { IconName } from "@/lib/types";

/* SVG icons (paths from Lucide, ISC licence) served as one cached sprite (/icons.svg) and referenced with <use>,
   so pages don't repeat the path data for every icon. No icon font. */


export function Icon({
  name,
  size = 20,
  className,
  strokeWidth,
  label,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  label?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? (size <= 16 ? 2 : 1.75)}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
    >
      <use href={`/icons.svg#${name}`} />
    </svg>
  );
}
