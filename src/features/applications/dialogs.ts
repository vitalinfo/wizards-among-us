import type { applications } from "@/db/schema";
import { getReviewBlockReason } from "@/features/reviews/authz";
import { hasReviewed } from "@/features/reviews/queries";
import type { UserActor } from "@/lib/actor";

import type { ApplicationDialog } from "./applicationTabs";
import { canDeleteApplication, ownsApplication } from "./authz";
import { listApplicationFiles } from "./fileQueries";
import { getMyApplication } from "./queries";

type Application = typeof applications.$inferSelect;

// What a dialog over «Мої заявки» needs, or null when the url asks for one this
// parent may not open.
//
// The id is in the url, so every dialog is LOOKED UP and re-checked here rather
// than trusted: someone else's id, a draft submitted since, a gift already
// confirmed or a review already left simply opens nothing. The actions behind
// the dialogs check again; this only decides what to draw.
export type LoadedDialog =
  | { dialog: "delete"; application: Application }
  | {
      dialog: "receive";
      application: Application;
      photo: { id: string; kind: string; contentType: string } | null;
    }
  | { dialog: "review"; application: Application };

export async function loadApplicationDialog(
  actor: UserActor,
  requested: { dialog: ApplicationDialog; id: string },
): Promise<LoadedDialog | null> {
  const application = await getMyApplication(requested.id, actor.id);
  if (!application) {
    return null;
  }

  switch (requested.dialog) {
    case "delete":
      return canDeleteApplication(actor, application)
        ? { dialog: "delete", application }
        : null;

    case "receive": {
      // Only while a volunteer holds the child. The photo is NOT checked
      // here — adding it is what the dialog is for.
      if (
        !ownsApplication(actor, application) ||
        application.status !== "claimed"
      ) {
        return null;
      }
      const files = await listApplicationFiles(application.id);
      const photo = files.findLast((file) => file.kind === "confirmation");
      return {
        dialog: "receive",
        application,
        photo: photo
          ? { id: photo.id, kind: photo.kind, contentType: photo.contentType }
          : null,
      };
    }

    case "review":
      return getReviewBlockReason(actor, application, {
        alreadyReviewed: await hasReviewed(actor.id, application.id),
      }) === null
        ? { dialog: "review", application }
        : null;
  }
}
