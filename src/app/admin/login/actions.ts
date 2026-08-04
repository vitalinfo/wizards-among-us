"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { admins } from "@/db/schema";
import { isAdminEmailAllowed } from "@/lib/auth/adminAllowlist";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { adminLoginSchema } from "@/lib/validation";

// Error codes (mapped to uk copy in the form) — never reveal allowlist
// membership, so "not allowlisted" and "wrong password" share one message.
export type AdminLoginState = {
  error: "invalid_input" | "invalid_credentials" | null;
};

export async function adminLogin(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "invalid_input" };
  }
  const { email, password } = parsed.data;

  if (!isAdminEmailAllowed(email)) {
    return { error: "invalid_credentials" };
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: admins.id, passwordHash: admins.passwordHash })
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  let adminId: string;
  if (existing) {
    if (!(await verifyPassword(password, existing.passwordHash))) {
      return { error: "invalid_credentials" };
    }
    adminId = existing.id;
  } else {
    // First login for an allowlisted email → self-provision the admins row.
    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(admins)
      .values({ email, passwordHash, displayName: email })
      .returning({ id: admins.id });
    adminId = created.id;
  }

  await createSession({ actorType: "admin", actorId: adminId });
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
