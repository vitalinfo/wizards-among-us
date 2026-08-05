import { redirect } from "next/navigation";

import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

import { AdminLoginForm } from "./AdminLoginForm";

// Session-dependent (reads cookies) → dynamic; inherits the root noindex default.
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (isAdmin(await getSessionActor())) {
    redirect("/admin");
  }
  return (
    <main className="bg-surface-muted flex min-h-svh items-center justify-center p-6">
      <AdminLoginForm />
    </main>
  );
}
