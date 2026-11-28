import { getFormatter, getTranslations } from "next-intl/server";

import { ApplicationDetail } from "@/components/applications/ApplicationDetail";
import { ApplicationPhoto } from "@/components/applications/ApplicationPhoto";
import { DetailSection } from "@/components/applications/DetailSection";
import { ReviewStars } from "@/components/reviews/ReviewStars";
import type { ContactMethod } from "@/db/enums";
import type { applications } from "@/db/schema";

type Application = typeof applications.$inferSelect;

// «Картка дитини — повна» for the volunteer holding this child (Figma
// 130:2506): the shared card, plus what only that volunteer is shown — the
// family's thanks once they confirm, the photo of the gift arriving, and the
// review the family left, if they left one.
export async function ClaimDetail({
  application,
  photos,
  contact,
  review = null,
}: {
  application: Application;
  photos: readonly { id: string; kind: string }[];
  contact: { method: ContactMethod; value: string } | null;
  review?: { rating: number; body: string | null; createdAt: Date } | null;
}) {
  const t = await getTranslations("volunteer.claims.card");
  const tPhotos = await getTranslations("volunteer.claims.photos");
  const format = await getFormatter();

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
    // The gift that arrived, under its own heading below the two portraits,
    // as the design puts it — the only photo that does not exist until the
    // family sends it.
    after: (
      <section className="mt-4 lg:mt-12">
        <h2 className="text-xl font-semibold tracking-[-0.03em]">
          {t("sections.familyPhoto")}
        </h2>
        {confirmation ? (
          <div className="mt-4">
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
    children: (
      <>
        {application.status === "fulfilled" ? (
          <DetailSection title={t("sections.details")} list={false}>
            <p className="text-primary text-sm tracking-[-0.03em]">
              {t.rich("thanks", {
                b: (chunks) => (
                  <strong className="font-semibold">{chunks}</strong>
                ),
              })}
            </p>
          </DetailSection>
        ) : null}
        {/* No heading without a review: unlike the photo, a review is
            optional, so there is nothing to tell the volunteer to wait for. */}
        {review ? (
          <DetailSection title={t("sections.review")} list={false}>
            <div className="flex flex-col gap-4">
              {/* pre-line: a parent who wrote two paragraphs sees two. */}
              {review.body ? (
                <p className="text-sm tracking-[-0.03em] whitespace-pre-line">
                  {review.body}
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <ReviewStars
                  rating={review.rating}
                  label={t("reviewRating", { rating: review.rating })}
                />
                <time
                  dateTime={review.createdAt.toISOString()}
                  className="text-muted-foreground text-sm"
                >
                  {format.dateTime(review.createdAt, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </time>
              </div>
            </div>
          </DetailSection>
        ) : null}
      </>
    ),
  });
}
