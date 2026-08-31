import { getDb } from "@/db";
import { SETTING_KEYS } from "@/db/enums";
import { settings } from "@/db/schema";

// The global kill switch, orthogonal to any campaign: stops all new intake
// instantly without touching campaign state, and — unlike a campaign's
// accepting_applications flag — stays off across a campaign activation. That
// is the case it exists for: during an incident, activating a campaign must not
// quietly reopen the door.
export async function setApplicationsEnabled(enabled: boolean): Promise<void> {
  await getDb()
    .insert(settings)
    .values({ key: SETTING_KEYS.applicationsEnabled, value: enabled })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: enabled, updatedAt: new Date() },
    });
}
