"use server";

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/features/audit/log";
import { setApplicationsEnabled } from "@/features/settings/adminQueries";
import { requireAdmin } from "@/lib/auth/session";

// requireAdmin() first — a server action is a public endpoint, so hiding the UI
// proves nothing. It throws rather than returning, so a non-admin can't fall
// through to the work.
export async function setKillSwitchAction(enabled: boolean): Promise<void> {
  const admin = await requireAdmin();
  await setApplicationsEnabled(enabled);
  await recordAuditLog({
    actor: admin,
    action: enabled ? "settings.intake_enabled" : "settings.intake_disabled",
    targetType: "settings",
    targetId: null,
  });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/campaigns");
  // The parent entry point renders an "closed for now" state from this.
  revalidatePath("/parent");
  revalidatePath("/parent/applications");
}
