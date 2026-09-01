import { getTranslations } from "next-intl/server";

import { PhotoLightbox } from "@/components/ui/PhotoLightbox";
import type { applications } from "@/db/schema";
import type { ApplicationFile } from "@/features/applications/fileQueries";

type Application = typeof applications.$inferSelect;

// What the parent submitted, read-only.
//
// Shown once the application is locked — approved, claimed, fulfilled, rejected
// or from a finished campaign. Before this, those states rendered a single line
// of explanation and nothing else: the parent could no longer see the story
// they wrote, the wish they described or the photos they uploaded, on the one
// page that is about their own child.
//
// Every field here is the family's own data, so there is no tier to enforce —
// including the ВПО certificate, which is admin-only in the sense of "never a
// volunteer", not "not even the parent who uploaded it".
export async function ApplicationSummary({
  application,
  files,
  giftUrls,
}: {
  application: Application;
  files: readonly ApplicationFile[];
  giftUrls: readonly string[];
}) {
  const t = await getTranslations("admin.applications.fields");
  const tRegions = await getTranslations("regions");
  const tFiles = await getTranslations("admin.applications.files");
  const tSummary = await getTranslations("parent.applications.summary");

  const fields: [string, string | null][] = [
    [t("childName"), application.childName],
    [
      t("childAge"),
      application.childAge === null ? null : String(application.childAge),
    ],
    [t("homeTown"), application.homeTown],
    [
      t("homeRegion"),
      application.homeRegion && tRegions(application.homeRegion),
    ],
    [t("currentTown"), application.currentTown],
    [
      t("currentRegion"),
      application.currentRegion && tRegions(application.currentRegion),
    ],
    [
      t("displacedYear"),
      application.displacedYear === null
        ? null
        : String(application.displacedYear),
    ],
    [t("parentName"), application.parentName],
    [t("familyStory"), application.familyStory],
    [t("giftDescription"), application.giftDescription],
    [t("giftPrice"), application.giftPrice],
    [t("giftUrls"), giftUrls.length > 0 ? giftUrls.join("\n") : null],
    [t("deliveryInformation"), application.deliveryInformation],
  ];

  return (
    <section className="border-border bg-surface rounded-lg border p-4">
      <h2 className="text-lg font-semibold">{tSummary("title")}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{tSummary("intro")}</p>

      <dl className="mt-4 text-sm">
        {fields.map(([label, value]) => (
          <div
            key={label}
            className="border-border border-b py-1.5 last:border-b-0"
          >
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="mt-0.5 break-words whitespace-pre-wrap">
              {value ?? "—"}
            </dd>
          </div>
        ))}
      </dl>

      {files.length > 0 ? (
        <>
          <h3 className="mt-6 text-sm font-semibold">{tSummary("files")}</h3>
          <ul className="mt-2 flex flex-wrap gap-4">
            {files.map((file) => (
              <li key={file.id}>
                <figure className="flex w-32 flex-col gap-1.5">
                  {/* Same authorized route as everywhere else — re-checks the
                      actor and logs the read. Opens in place rather than
                      throwing the parent out to a bare image url. */}
                  <PhotoLightbox
                    href={`/api/applications/${application.id}/files/${file.id}`}
                    title={tFiles(file.kind)}
                    alt={tFiles(file.kind)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- served by an authorized route, not an optimizable static asset */}
                    <img
                      src={`/api/applications/${application.id}/files/${file.id}`}
                      alt=""
                      className="border-border h-24 w-32 rounded-md border object-cover"
                    />
                  </PhotoLightbox>
                  <figcaption className="text-xs font-medium">
                    {tFiles(file.kind)}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
