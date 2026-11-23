import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Admin | Premier SEO Services" },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="container-page py-8 sm:py-10">{children}</div>;
}
