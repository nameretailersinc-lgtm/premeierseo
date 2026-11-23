import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { adminEnabled, isAdmin } from "@/lib/server/admin-auth";

export default async function AdminLogin() {
  if (await isAdmin()) redirect("/admin/");
  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Blog admin</h1>
        <p className="mt-2 text-sm text-ink-3">Sign in to write and manage blog posts.</p>
        {adminEnabled() ? (
          <LoginForm />
        ) : (
          <p className="mt-6 rounded-xl border border-line bg-surface-2 p-4 text-sm text-ink-2">
            Admin is disabled. Set <code>ADMIN_PASSWORD</code> (and <code>ADMIN_SESSION_SECRET</code>) in the server environment and restart.
          </p>
        )}
      </div>
    </div>
  );
}
