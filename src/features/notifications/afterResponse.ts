import { getTranslations } from "next-intl/server";
import { after } from "next/server";

import type { Actor } from "@/lib/actor";

import { notify, type Notice } from "./telegram";

// Queue a Telegram notice to go out after the response. Whoever triggered it
// must not wait on Telegram, and a failed send must not look like a failed
// action. Call it only once the change it reports has actually landed.
//
// Kept apart from ./telegram so the backfill script can import that without
// pulling in Next's request-scoped APIs.
export async function notifyAfterResponse(
  actor: Actor,
  applicationId: string,
  notice: Notice,
): Promise<void> {
  // Resolved now, inside the request: next-intl reads its config from the
  // request scope, which after() is not guaranteed to have.
  const t = await getTranslations("notifications.telegram");
  after(() =>
    notify({
      actor,
      applicationId,
      notice,
      t: (key, values) => t(key, values),
    }),
  );
}
