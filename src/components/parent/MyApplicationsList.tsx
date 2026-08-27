import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import type { MyApplicationSummary } from "@/features/applications/queries";

import { ApplicationStatusBadge } from "./ApplicationStatusBadge";

// A record collection, so it's a <ul>/<li> — screen readers announce the count
// and let the user step through items (accessibility rules).
export function MyApplicationsList({
  applications,
}: {
  applications: MyApplicationSummary[];
}) {
  const t = useTranslations("parent.applications");
  const format = useFormatter();

  if (applications.length === 0) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {applications.map((application) => {
        const editable =
          application.status === "draft" || application.status === "submitted";
        const timestamp = application.submittedAt
          ? t("submittedAt", {
              date: format.dateTime(application.submittedAt, "short"),
            })
          : t("updatedAt", {
              date: format.dateTime(application.updatedAt, "short"),
            });

        return (
          <li
            key={application.id}
            className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {application.childName ?? t("childFallback")}
                </span>
                {application.childAge !== null ? (
                  <span className="text-muted-foreground text-sm">
                    {t("ageSuffix", { age: application.childAge })}
                  </span>
                ) : null}
                <ApplicationStatusBadge status={application.status} />
              </div>
              {application.giftDescription ? (
                <span className="text-body text-sm">
                  {application.giftDescription}
                </span>
              ) : null}
              <span className="text-muted-foreground text-xs">{timestamp}</span>
            </div>

            <Link
              href={`/parent/applications/${application.id}`}
              className="text-primary focus-visible:outline-ring shrink-0 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {editable ? t("continueCta") : t("viewCta")}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
