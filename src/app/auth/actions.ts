"use server";

import { redirect } from "next/navigation";

import { destroySession } from "@/lib/auth/session";

// Sign out (users). Deletes the session row (instant revocation) + clears the
// cookie, then returns home. Admins use adminLogout (→ /admin/login).
export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
