"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function AdminHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login/");
    router.refresh();
  }
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href="/admin/" className="eyebrow eyebrow-pill">
          Blog admin
        </Link>
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
