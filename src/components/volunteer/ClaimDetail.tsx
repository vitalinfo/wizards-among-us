import { getTranslations } from "next-intl/server";

import { ApplicationDetail } from "@/components/applications/ApplicationDetail";
import { ApplicationPhoto } from "@/components/applications/ApplicationPhoto";
import { DetailSection } from "@/components/applications/DetailSection";
import type { ContactMethod } from "@/db/enums";
import type { applications } from "@/db/schema";

type Application = typeof applications.$inferSelect;

// «Картка дитини — повна» for the volunteer holding this child (Figma
// 130:2506): the shared card, plus the two things only that volunteer is shown —
// the family's thanks once they confirm, and the photo of the gift arriving.
export async function ClaimDetail({
  application,
  photos,
  contact,
}: {
  application: Application;
  photos: readonly { id: string; kind: string }[];
  contact: { method: ContactMethod; value: string } | null;
}) {
  const t = await getTranslations("volunteer.claims.card");
  const tPhotos = await getTranslations("volunteer.claims.photos");

  const child = application.childName ?? "";
  // «Фото від родини» is the confirmation, and it sits under its own heading
  // at the bottom — it does not exist until the family sends it.
  const confirmation = photos.find((photo) => photo.kind === "confirmation");

  // Awaited as a function rather than nested as <ApplicationDetail>: it is
  // async, and React cannot render an async component inside another one —
  // which is what this is when a spec renders it. On the server the result is
  // the same tree.
  return ApplicationDetail({
    application,
    photos,
    contact,
    closeHref: "/account/volunteer/claims",
    closeLabel: t("close"),
    // The gift that arrived, under its own heading at the foot of the page —
    // the design puts it below the two portraits, and it is the only photo
    // that does not exist until the family sends it.
    after: (
      <section className="mx-auto mt-12 max-w-[1066px]">
        <h2 className="text-xl font-semibold tracking-[-0.03em]">
          {t("sections.familyPhoto")}
        </h2>
        {confirmation ? (
          <div className="mt-4 lg:w-[306px]">
            <ApplicationPhoto
              applicationId={application.id}
              fileId={confirmation.id}
              title={tPhotos("confirmation.title")}
              alt={tPhotos("confirmation.alt", { child })}
              height={340}
              mobileHeight={443}
            />
          </div>
        ) : (
          <p className="text-muted-foreground mt-4 max-w-[600px] text-sm">
            {t("awaiting")}
          </p>
        )}
      </section>
    ),
    children:
      application.status === "fulfilled" ? (
        <DetailSection title={t("sections.details")} list={false}>
          <p className="text-primary text-sm tracking-[-0.03em]">
            {t.rich("thanks", {
              b: (chunks) => (
                <strong className="font-semibold">{chunks}</strong>
              ),
            })}
          </p>
        </DetailSection>
      ) : null,
  });
}
