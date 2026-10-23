import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { CloseIcon } from "@/components/icons";
import { SITE_CONTAINER } from "@/components/site/layout";
import { SiteLogo } from "@/components/site/SiteLogo";
import { PhotoLightbox } from "@/components/ui/PhotoLightbox";
import type { applications } from "@/db/schema";
import type { ContactMethod } from "@/db/enums";
import { cn } from "@/lib/utils";

type Application = typeof applications.$inferSelect;

// «Картка дитини — повна» (Figma 130:2506). Everything the volunteer holding
// this child is entitled to, on one page: the photos down the left, the family
// and the wish down the right.
//
// A full page rather than a panel in the cabinet, like the claim briefing — it
// is the longest thing a volunteer reads, and the sidebar beside it would be
// navigation they do not want while reading an address off the screen.
export async function ClaimDetail({
  application,
  photos,
  contact,
}: {
  application: Application;
  // Only what this page uses — an id to fetch by and a kind to place it. The
  // full file row carries a storage key, and a component that does not need one
  // should not be handed one.
  photos: readonly { id: string; kind: string }[];
  contact: { method: ContactMethod; value: string } | null;
}) {
  const t = await getTranslations("volunteer.claims.card");
  const tPhotos = await getTranslations("volunteer.claims.photos");
  const tCard = await getTranslations("volunteer.children.card");
  const tCommon = await getTranslations("common");
  const tRegions = await getTranslations("regions");

  const child = application.childName ?? "";
  const giftUrls = giftUrlsOf(application.typeFields);
  const byKind = new Map(photos.map((photo) => [photo.kind, photo] as const));
  // «Фото від родини» is the confirmation, and it sits under its own heading
  // at the bottom — it does not exist until the family sends it.
  const confirmation = byKind.get("confirmation");

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
            href="/account/volunteer/claims"
            aria-label={t("close")}
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
                  <Photo
                    key={photo.id}
                    applicationId={application.id}
                    fileId={photo.id}
                    title={tPhotos(`${kind}.title`)}
                    alt={tPhotos(`${kind}.alt`, { child })}
                    height={412}
                  />
                );
              },
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[40px] leading-10 font-bold tracking-[-0.03em] lg:text-[64px] lg:leading-[66px]">
              {child || tCard("noName")}
            </h1>
            {application.childAge !== null ? (
              <p className="mt-4 text-base tracking-[-0.03em]">
                {tCard("age", { age: application.childAge })}
              </p>
            ) : null}

            <dl className="mt-8 flex flex-col gap-[14px]">
              <Row label={t("fields.homeTown")} value={application.homeTown} />
              <Row
                label={t("fields.homeRegion")}
                value={
                  application.homeRegion
                    ? tRegions(application.homeRegion)
                    : null
                }
              />
              <Row
                label={t("fields.currentTown")}
                value={application.currentTown}
              />
              <Row
                label={t("fields.currentRegion")}
                value={
                  application.currentRegion
                    ? tRegions(application.currentRegion)
                    : null
                }
              />
              <Row
                label={t("fields.displacedYear")}
                value={
                  application.displacedYear === null
                    ? null
                    : String(application.displacedYear)
                }
              />
              <Row
                label={t("fields.parentName")}
                value={application.parentName}
              />
              <Row
                label={t("fields.familyStory")}
                value={application.familyStory}
              />
            </dl>

            <Section title={t("sections.dream")}>
              <Row
                label={t("fields.giftDescription")}
                value={application.giftDescription}
              />
              {giftUrls.length > 0 ? (
                <Row label={t("fields.giftUrls")}>
                  <ul className="flex flex-col gap-1">
                    {giftUrls.map((url) => (
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
                </Row>
              ) : null}
              <Row
                label={t("fields.giftPrice")}
                value={
                  application.giftPrice === null
                    ? null
                    : t("price", { price: Number(application.giftPrice) })
                }
              />
            </Section>

            <Section title={t("sections.delivery")}>
              <Row
                label={t("fields.deliveryInformation")}
                value={application.deliveryInformation}
              />
              <Row
                label={t("fields.contact")}
                value={
                  contact === null
                    ? null
                    : contact.method === "telegram"
                      ? `@${contact.value}`
                      : contact.value
                }
              />
            </Section>

            {application.status === "fulfilled" ? (
              <Section title={t("sections.details")}>
                <p className="text-primary text-sm tracking-[-0.03em]">
                  {t("thanks")}
                </p>
              </Section>
            ) : null}
          </div>
        </div>

        {/* The gift that arrived, under its own heading at the foot of the
            page — the design puts it below the two portraits, and it is the
            only photo that does not exist until the family sends it. */}
        <section className="mx-auto mt-12 max-w-[1066px]">
          <h2 className="text-xl font-semibold tracking-[-0.03em]">
            {t("sections.familyPhoto")}
          </h2>
          {confirmation ? (
            <div className="mt-4 lg:w-[306px]">
              <Photo
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
      </div>
    </>
  );
}

// A photo that opens over the page. The <img> carries an EMPTY alt on purpose:
// the link around it is already named by the lightbox («Відкрити …»), and a
// second description of the same thing would be read twice. The bytes come
// from the authorized route, which re-checks the claim and logs every read.
function Photo({
  applicationId,
  fileId,
  title,
  alt,
  height,
  mobileHeight = 261,
}: {
  applicationId: string;
  fileId: string;
  title: string;
  alt: string;
  height: number;
  // The design gives the two portraits 261 on a phone, side by side, and the
  // family photo 443 across the full width.
  mobileHeight?: number;
}) {
  return (
    <PhotoLightbox
      href={`/api/applications/${applicationId}/files/${fileId}`}
      title={title}
      alt={alt}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- authorized, logged, never optimized */}
      <img
        src={`/api/applications/${applicationId}/files/${fileId}`}
        alt=""
        width={306}
        height={height}
        loading="lazy"
        decoding="async"
        className="h-[var(--photo-h-sm)] w-full rounded-2xl object-cover lg:h-[var(--photo-h)]"
        style={
          {
            "--photo-h-sm": `${mobileHeight}px`,
            "--photo-h": `${height}px`,
          } as CSSProperties
        }
      />
    </PhotoLightbox>
  );
}

// One labelled line: the label in a fixed column from lg, stacked on a phone,
// exactly as the design draws both.
function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: ReactNode;
}) {
  if (!children && !value) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 text-sm tracking-[-0.03em] lg:flex-row lg:gap-[21px]">
      <dt className="text-muted-foreground lg:w-[203px] lg:shrink-0">
        {label}
      </dt>
      <dd className="min-w-0 whitespace-pre-wrap lg:max-w-[504px]">
        {children ?? value}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-[-0.03em]">{title}</h2>
      <dl className="mt-6 flex flex-col gap-[14px]">{children}</dl>
    </section>
  );
}

// type_fields is jsonb — anything in it is checked, never cast, and the
// protocol is checked because these urls are parent-written and go into an
// href. Same rule as the browse card's mapper.
function giftUrlsOf(typeFields: Application["typeFields"]): string[] {
  if (!typeFields || typeof typeFields !== "object") {
    return [];
  }
  const value = (typeFields as { giftUrls?: unknown }).giftUrls;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => {
    if (typeof entry !== "string") {
      return false;
    }
    try {
      const protocol = new URL(entry).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  });
}
