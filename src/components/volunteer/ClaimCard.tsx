import { getTranslations } from "next-intl/server";

import { ClaimPhotos } from "@/components/volunteer/ClaimPhotos";
import type { FileKind } from "@/db/enums";
import type { applications } from "@/db/schema";
import { resolveUserContact } from "@/features/users/contact";

import { ClaimCardClient } from "./ClaimCardClient";

type Application = typeof applications.$inferSelect;

// Server entry for one claimed child: resolves the copy and the family's
// contact, and hands the island only what it may render. Pages import this;
// ClaimCardClient is the "use client" part (same split as SiteHeader).
//
// Which fields appear is decided HERE rather than in the island, so the tier-2
// list — town, delivery address, parent name, contact — reads in one place next
// to the claim that entitles the volunteer to it.
export async function ClaimCard({
  application,
  claimedAt,
  parentUsername,
  parentPhone,
  photos,
  defaultOpen,
}: {
  application: Application;
  claimedAt: Date;
  parentUsername: string | null;
  parentPhone: string | null;
  photos: readonly { id: string; kind: FileKind }[];
  defaultOpen: boolean;
}) {
  const t = await getTranslations("admin.applications.fields");

  const contact = resolveUserContact({
    username: parentUsername,
    phone: parentPhone,
  });

  return (
    <ClaimCardClient
      childName={application.childName}
      fulfilled={application.status === "fulfilled"}
      claimedAt={claimedAt}
      defaultOpen={defaultOpen}
      fields={[
        [t("giftDescription"), application.giftDescription],
        [t("giftPrice"), application.giftPrice],
        [t("parentName"), application.parentName],
        // The family's own words about what happened to them.
        [t("familyStory"), application.familyStory],
        [t("currentTown"), application.currentTown],
        [t("deliveryInformation"), application.deliveryInformation],
        [
          t("contact"),
          contact === null
            ? null
            : contact.method === "telegram"
              ? `@${contact.value}`
              : contact.value,
        ],
      ]}
      photos={
        <ClaimPhotos
          applicationId={application.id}
          childName={application.childName}
          photos={photos}
        />
      }
    />
  );
}
