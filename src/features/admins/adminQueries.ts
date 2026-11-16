import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { admins } from "@/db/schema";
import { isAdminEmailAllowed } from "@/lib/auth/adminAllowlist";

// Read side of the admins table, for the admins list and the audit export.
// Authorization lives in the page/route (isAdmin); these execute, they don't
// adjudicate. Never selects password_hash.

export type AdminListRow = {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  // Whether the email is still in ADMIN_ALLOWLIST. A row outlives its access:
  // removing an email ends the sessions (toAdminActor) but not the row, and a
  // list that showed a former admin as an admin would be wrong.
  hasAccess: boolean;
};

const columns = {
  id: admins.id,
  email: admins.email,
  displayName: admins.displayName,
  createdAt: admins.createdAt,
};

export async function listAdmins(): Promise<AdminListRow[]> {
  const rows = await getDb()
    .select(columns)
    .from(admins)
    .orderBy(asc(admins.email));
  return rows.map((row) => ({
    ...row,
    hasAccess: isAdminEmailAllowed(row.email),
  }));
}

// One admin by id, or null. The id must already be a uuid (isUuid) — Postgres
// errors on a malformed one.
export async function getAdminById(id: string): Promise<AdminListRow | null> {
  const [row] = await getDb()
    .select(columns)
    .from(admins)
    .where(eq(admins.id, id))
    .limit(1);
  return row ? { ...row, hasAccess: isAdminEmailAllowed(row.email) } : null;
}
