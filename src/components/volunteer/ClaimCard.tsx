import { getFormatter, getTranslations } from "next-intl/server";

import { ClaimPhotos } from "@/components/volunteer/ClaimPhotos";
import type { FileKind } from "@/db/enums";
import type { applications } from "@/db/schema";
import { resolveUserContact } from "@/features/users/contact";

type Application = typeof applications.$inferSelect;

// One claimed child, as a collapsible card.
//
// Everything below the summary is TIER 2 — the family's town, delivery address
// and contact, revealed because this volunteer holds the active claim. Keeping
// it behind a disclosure is not security (it is in the response either way);
// it is so the address of the child you are NOT looking at isn't sitting open
// on a phone screen in a shop.
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
  // Open when this is the volunteer's only child — nobody should have to click
  // to see the one thing on the page.
  defaultOpen: boolean;
}) {
  const t = await getTranslations("volunteer.claims");
  const tFields = await getTranslations("admin.applications.fields");
  const tPhotos = await getTranslations("volunteer.claims.photos");
  const format = await getFormatter();

  const contact = resolveUserContact({
    username: parentUsername,
    phone: parentPhone,
  });
  const fulfilled = application.status === "fulfilled";

  const fields: [string, string | null][] = [
    [tFields("giftDescription"), application.giftDescription],
    [tFields("giftPrice"), application.giftPrice],
    [tFields("parentName"), application.parentName],
    // The family's own words about what happened to them.
    [tFields("familyStory"), application.familyStory],
    [tFields("currentTown"), application.currentTown],
    [tFields("deliveryInformation"), application.deliveryInformation],
    [
      tFields("contact"),
      contact === null
        ? null
        : contact.method === "telegram"
          ? `@${contact.value}`
          : contact.value,
    ],
  ];

  return (
    <li className="border-border bg-surface rounded-lg border">
      {/* <details>, not a JS toggle: the open/closed state, the keyboard and
          the screen-reader announcement all come from the element, and the
          default is server-rendered, so the page is right before hydration. */}
      <details open={defaultOpen} className="group">
        <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-4 marker:content-none">
          <h2 className="font-semibold">{application.childName}</h2>
          {/* Status by text, not colour alone. */}
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              fulfilled
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-surface-muted text-muted-foreground border-border"
            }`}
          >
            {fulfilled ? t("fulfilled") : t("inProgress")}
          </span>
          <span className="text-muted-foreground text-xs">
            {t("claimedAt", { date: format.dateTime(claimedAt, "short") })}
          </span>
          {/* The affordance only. aria-hidden because <summary> already
              announces its own expanded state — a visible label saying
              "expand" would be read out too, and contradict it once open. */}
          <span
            aria-hidden="true"
            className="text-muted-foreground ml-auto text-xs group-open:hidden"
          >
            {t("expand")}
          </span>
          <span
            aria-hidden="true"
            className="text-muted-foreground ml-auto hidden text-xs group-open:inline"
          >
            {t("collapse")}
          </span>
        </summary>

        <div className="flex flex-col gap-2 px-4 pb-4">
          <dl className="text-sm">
            {fields.map(([label, value]) => (
              <div
                key={label}
                className="border-border border-b py-1.5 last:border-b-0"
              >
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap">{value ?? "—"}</dd>
              </div>
            ))}
          </dl>

          <ClaimPhotos
            applicationId={application.id}
            photos={photos.map((photo) => ({
              id: photo.id,
              title: tPhotos(`${photo.kind}.title`),
              alt: tPhotos(`${photo.kind}.alt`, {
                child: application.childName ?? "",
              }),
              openLabel: tPhotos("openFull", {
                title: tPhotos(`${photo.kind}.title`),
              }),
            }))}
          />

          <p className="text-muted-foreground mt-2 text-xs">
            {fulfilled ? t("thanks") : t("releaseNote")}
          </p>
        </div>
      </details>
    </li>
  );
}
