"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Sign-in failed.");
      router.replace("/admin/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-6 grid gap-4">
      <div>
        <label htmlFor="pw" className="field-label">
          Password
        </label>
        <input id="pw" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-[var(--danger,#b42318)]">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy || !password}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
