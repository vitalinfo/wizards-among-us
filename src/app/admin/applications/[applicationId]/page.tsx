import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { ModerationDecision } from "@/components/admin/ModerationDecision";
import { ApplicationStatusBadge } from "@/components/ui/ApplicationStatusBadge";
import { getApplicationForAdmin } from "@/features/applications/adminQueries";
import {
  moderationQueueHref,
  parseModerationFilter,
  parseModerationPage,
} from "@/features/applications/moderationFilter";
import { listApplicationFiles } from "@/features/applications/fileQueries";
import { recordAuditLog } from "@/features/audit/log";
import { resolveUserContact } from "@/features/users/contact";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

// A pending application still has empty columns (drafts persist), so every
// value is rendered through the same "— when missing" path.
function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="border-border border-b py-2 last:border-b-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm whitespace-pre-wrap">{value ?? "—"}</dd>
    </div>
  );
}

export default async function AdminApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  // Carries the queue filter AND page the admin came from, so "back" returns to
  // the exact view they left instead of the default queue's first page.
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const [{ applicationId }, query] = await Promise.all([params, searchParams]);
  const backHref = moderationQueueHref(
    parseModerationFilter(query.status),
    parseModerationPage(query.page),
  );
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const detail = await getApplicationForAdmin(applicationId);
  if (!detail) {
    notFound();
  }

  const { application, campaignTitle, parent } = detail;
  const [t, tRegions, format, files] = await Promise.all([
    getTranslations("admin.applications"),
    getTranslations("regions"),
    getFormatter(),
    listApplicationFiles(applicationId),
  ]);

  // This page reveals every sensitive field about a child at once — town,
  // delivery address, family contact. The invariant says log every view.
  await recordAuditLog({
    actor,
    action: "application.viewed_full",
    targetType: "application",
    targetId: applicationId,
  });

  const contact = resolveUserContact(parent);
  const giftUrls = Array.isArray(
    (application.typeFields as { giftUrls?: unknown } | null)?.giftUrls,
  )
    ? ((application.typeFields as { giftUrls: string[] }).giftUrls ?? [])
    : [];

  const sections: { key: string; fields: [string, string | null][] }[] = [
    {
      key: "child",
      fields: [
        [t("fields.childName"), application.childName],
        [
          t("fields.childAge"),
          application.childAge === null ? null : String(application.childAge),
        ],
        [t("fields.homeTown"), application.homeTown],
        [
          t("fields.homeRegion"),
          application.homeRegion ? tRegions(application.homeRegion) : null,
        ],
        [t("fields.currentTown"), application.currentTown],
        [
          t("fields.currentRegion"),
          application.currentRegion
            ? tRegions(application.currentRegion)
            : null,
        ],
        [
          t("fields.displacedYear"),
          application.displacedYear === null
            ? null
            : String(application.displacedYear),
        ],
      ],
    },
    {
      key: "family",
      fields: [
        [t("fields.parentName"), application.parentName],
        [t("fields.familyStory"), application.familyStory],
        [
          t("fields.contact"),
          contact === null
            ? null
            : contact.method === "telegram"
              ? `@${contact.value}`
              : contact.value,
        ],
      ],
    },
    {
      key: "gift",
      fields: [
        [t("fields.giftDescription"), application.giftDescription],
        [t("fields.giftPrice"), application.giftPrice],
        [
          t("fields.giftUrls"),
          giftUrls.length > 0 ? giftUrls.join("\n") : null,
        ],
      ],
    },
    {
      key: "delivery",
      fields: [
        [t("fields.deliveryInformation"), application.deliveryInformation],
      ],
    },
    {
      key: "consent",
      fields: [
        [
          t("fields.socialMediaConsent"),
          application.socialMediaConsent === null
            ? null
            : application.socialMediaConsent
              ? t("yes")
              : t("no"),
        ],
      ],
    },
  ];

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={backHref}
            className="text-primary text-sm font-semibold underline underline-offset-4"
          >
            {t("backCta")}
          </Link>
          {/* Operational override: a parent locked out by approval can't fix a
              wrong delivery address themselves. */}
          <Link
            href={`/admin/applications/${applicationId}/edit`}
            className="border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t("editCta")}
          </Link>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold">
              {application.childName ?? t("detailTitle")}
            </h1>
            <ApplicationStatusBadge status={application.status} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("campaignLabel")}: {campaignTitle}
            {" · "}
            {application.submittedAt
              ? t("submittedAt", {
                  date: format.dateTime(application.submittedAt, "short"),
                })
              : t("notSubmitted")}
          </p>
        </div>

        {application.rejectionNote ? (
          <div className="border-border bg-surface-muted rounded-lg border p-4">
            <h2 className="text-sm font-semibold">
              {t("decision.rejectionNote")}
            </h2>
            <p className="mt-1 text-sm whitespace-pre-wrap">
              {application.rejectionNote}
            </p>
          </div>
        ) : null}

        {sections.map((section) => (
          <section key={section.key}>
            <h2 className="mb-2 text-lg font-semibold">
              {t(`sections.${section.key}`)}
            </h2>
            <dl className="border-border bg-surface rounded-lg border px-4">
              {section.fields.map(([label, value]) => (
                <Field key={label} label={label} value={value} />
              ))}
            </dl>
          </section>
        ))}

        <section>
          <h2 className="mb-2 text-lg font-semibold">{t("sections.files")}</h2>
          <p className="text-muted-foreground mb-2 text-sm">
            {t("files.certificateWarning")}
          </p>
          {files.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("files.none")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {files.map((file) => (
                <li key={file.id} className="text-sm">
                  {/* Streams through the authorized route, which re-checks the
                      actor and logs the read. Never a direct storage URL. */}
                  <a
                    href={`/api/applications/${applicationId}/files/${file.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-semibold underline underline-offset-4"
                  >
                    {t(`files.${file.kind}`)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Only an application awaiting review can be decided; anything else is
            already final (the query guards this too). */}
        {application.status === "submitted" ? (
          <section className="border-border bg-surface rounded-lg border p-4">
            <ModerationDecision applicationId={applicationId} />
          </section>
        ) : (
          // NOT a repeat of the status badge above — this explains why there is
          // no decision to make here.
          <p className="text-muted-foreground text-sm">{t("alreadyDecided")}</p>
        )}
      </main>
    </>
  );
}
