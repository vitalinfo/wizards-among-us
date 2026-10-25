import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ReactNode } from "react";

import { CloseIcon } from "@/components/icons";
import { SITE_CONTAINER } from "@/components/site/layout";
import { SiteLogo } from "@/components/site/SiteLogo";
import type { ContactMethod } from "@/db/enums";
import type { applications } from "@/db/schema";
import { giftUrls } from "@/features/applications/mappers";
import { cn } from "@/lib/utils";

import { ApplicationPhoto } from "./ApplicationPhoto";
import { DetailRow } from "./DetailRow";
import { DetailSection } from "./DetailSection";

type Application = typeof applications.$inferSelect;

// «Картка дитини — повна»: one application, everything on one page — the
// photos down the left, the family and the wish down the right. Drawn the same
// for the volunteer holding the child (Figma 130:2506) and for the family that
// wrote it (139:4543), so both pages render this and add their own sections.
//
// A full page rather than a panel in the cabinet — it is the longest thing
// either of them reads, and a sidebar beside it would be navigation nobody
// wants while reading an address off the screen.
//
// WHO may see it is the page's decision, not this component's: it renders what
// it is handed. Both callers fetch through a query scoped to the reader.
export async function ApplicationDetail({
  application,
  photos,
  contact,
  closeHref,
  closeLabel,
  children,
  after,
}: {
  application: Application;
  // Only what this page uses — an id to fetch by and a kind to place it. The
  // full file row carries a storage key, and a component that does not need one
  // should not be handed one.
  photos: readonly { id: string; kind: string }[];
  contact: { method: ContactMethod; value: string } | null;
  // Where × goes, and what it is called — back to whichever list this came from.
  closeHref: string;
  closeLabel: string;
  // More sections in the text column, after «Доставка».
  children?: ReactNode;
  // Below the photos and the text, across the page.
  after?: ReactNode;
}) {
  const t = await getTranslations("applicationCard");
  const tCommon = await getTranslations("common");
  const tRegions = await getTranslations("regions");

  const child = application.childName ?? "";
  const urls = giftUrls(application.typeFields);
  const byKind = new Map(photos.map((photo) => [photo.kind, photo] as const));

  return (
    <>
      <header className={cn(SITE_CONTAINER, "py-6")}>
        <div className="flex items-start justify-between gap-4">
          <Link
            href="/"
            aria-label={tCommon("brand")}
            className="focus-visible:outline-ring shrink-0 rounded"
          >
            <SiteLogo
              width={135}
              height={135}
              className="h-14 w-auto lg:h-20"
            />
          </Link>
          <Link
            href={closeHref}
            aria-label={closeLabel}
            className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:size-[60px]"
          >
            <CloseIcon className="size-5 lg:size-6" />
          </Link>
        </div>
      </header>

      <div className={cn(SITE_CONTAINER, "pb-16 lg:pb-24")}>
        {/* 1066 centred, which is where the design puts the pair: a 306 photo
            column, 32 of gap and a 728 measure, sitting in the middle of the
            page rather than against the gutter the logo uses. */}
        <div className="mx-auto flex max-w-[1066px] flex-col gap-8 lg:flex-row">
          {/* The letter and the child. A column of two beside the text from lg;
              on a phone the design puts them BELOW it, side by side — so the
              order flips and the stack becomes a two-column grid. Thumbnails
              open over the page: one is enough to see a letter exists and
              useless for reading it, which is the only reason to show one. */}
          <div className="order-last grid grid-cols-2 gap-3 lg:order-first lg:flex lg:w-[306px] lg:shrink-0 lg:flex-col lg:gap-6">
            {(["child_with_letter_photo", "letter_photo"] as const).map(
              (kind) => {
                const photo = byKind.get(kind);
                if (!photo) {
                  return null;
                }
                return (
                  <ApplicationPhoto
                    key={photo.id}
                    applicationId={application.id}
                    fileId={photo.id}
                    title={t(`photos.${kind}.title`)}
                    alt={t(`photos.${kind}.alt`, { child })}
                    height={412}
                  />
                );
              },
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[40px] leading-10 font-bold tracking-[-0.03em] lg:text-[64px] lg:leading-[66px]">
              {child || t("noName")}
            </h1>
            {application.childAge !== null ? (
              <p className="mt-4 text-base tracking-[-0.03em]">
                {t("age", { age: application.childAge })}
              </p>
            ) : null}

            <dl className="mt-8 flex flex-col gap-[14px]">
              <DetailRow
                label={t("fields.homeTown")}
                value={application.homeTown}
              />
              <DetailRow
                label={t("fields.homeRegion")}
                value={
                  application.homeRegion
                    ? tRegions(application.homeRegion)
                    : null
                }
              />
              <DetailRow
                label={t("fields.currentTown")}
                value={application.currentTown}
              />
              <DetailRow
                label={t("fields.currentRegion")}
                value={
                  application.currentRegion
                    ? tRegions(application.currentRegion)
                    : null
                }
              />
              <DetailRow
                label={t("fields.displacedYear")}
                value={
                  application.displacedYear === null
                    ? null
                    : String(application.displacedYear)
                }
              />
              <DetailRow
                label={t("fields.parentName")}
                value={application.parentName}
              />
              <DetailRow
                label={t("fields.familyStory")}
                value={application.familyStory}
              />
            </dl>

            <DetailSection title={t("sections.dream")}>
              <DetailRow
                label={t("fields.giftDescription")}
                value={application.giftDescription}
              />
              {urls.length > 0 ? (
                <DetailRow label={t("fields.giftUrls")}>
                  <ul className="flex flex-col gap-1">
                    {urls.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-primary focus-visible:outline-ring break-all underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </DetailRow>
              ) : null}
              <DetailRow
                label={t("fields.giftPrice")}
                value={
                  application.giftPrice === null
                    ? null
                    : t("price", { price: Number(application.giftPrice) })
                }
              />
            </DetailSection>

            <DetailSection title={t("sections.delivery")}>
              <DetailRow
                label={t("fields.deliveryInformation")}
                value={application.deliveryInformation}
              />
              <DetailRow
                label={t("fields.contact")}
                value={
                  contact === null
                    ? null
                    : contact.method === "telegram"
                      ? `@${contact.value}`
                      : contact.value
                }
              />
            </DetailSection>

            {children}
          </div>
        </div>

        {after}
      </div>
    </>
  );
}
