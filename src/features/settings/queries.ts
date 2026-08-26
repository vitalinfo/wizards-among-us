import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { SETTING_KEYS } from "@/db/enums";
import { settings } from "@/db/schema";
import type { ResolvedSettings } from "@/features/campaigns/authz";

// Reads the key-value settings rows the authorization predicates need.
//
// Fails CLOSED: if the row is missing or the database is unreachable we treat
// intake as disabled. This is the emergency kill switch — an error must never
// leave it silently on.
export async function getResolvedSettings(): Promise<ResolvedSettings> {
  try {
    const [row] = await getDb()
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, SETTING_KEYS.applicationsEnabled))
      .limit(1);
    return { applicationsEnabled: row?.value === true };
  } catch (error) {
    console.error("getResolvedSettings failed:", error);
    return { applicationsEnabled: false };
  }
}
