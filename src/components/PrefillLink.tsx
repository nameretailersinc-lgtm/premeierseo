"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

export const PREFILL_KEY = "report-form-prefill";

type Prefill = { tool?: string; topic?: string };

/**
 * Link to the contact / report form that preselects a field without putting a query string in the
 * crawlable href. The href stays the clean canonical URL (/tool-complain/, /contact/); the value is
 * handed to ReportForm through sessionStorage on click.
 */
export function PrefillLink({ prefill, onClick, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string; prefill: Prefill }) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        try {
          sessionStorage.setItem(PREFILL_KEY, JSON.stringify(prefill));
        } catch {
          /* storage unavailable: the form simply opens without a preselection */
        }
        onClick?.(e);
      }}
    />
  );
}
