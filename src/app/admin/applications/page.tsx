import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { ApplicationStatusBadge } from "@/components/ui/ApplicationStatusBadge";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/db/enums";
import { listForModeration } from "@/features/applications/adminQueries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

function parseStatus(value: string | undefined): ApplicationStatus | undefined {
  return APPLICATION_STATUSES.includes(value as ApplicationStatus)
    ? (value as ApplicationStatus)
    : undefined;
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const query = await searchParams;
  // Default to the queue that actually needs an admin: everything waiting for a
  // decision. "all" is an explicit choice, not the landing state.
  const status =
    query.status === "all"
      ? undefined
      : (parseStatus(query.status) ?? "submitted");

  const [t, tStatus, tList, tRegions, format, rows] = await Promise.all([
    getTranslations("admin.applications"),
    getTranslations("parent.applications.status"),
    getTranslations("parent.applications"),
    getTranslations("regions"),
    getFormatter(),
    listForModeration({ status }),
  ]);

  const filters: { key: string; label: string; active: boolean }[] = [
    { key: "all", label: t("filter.all"), active: status === undefined },
    ...APPLICATION_STATUSES.map((value) => ({
      key: value,
      label: tStatus(value),
      active: status === value,
    })),
  ];

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
        </div>

        {/* Links, not a form: each filter is a distinct addressable page, so it
            is shareable, bookmarkable and works without JS. */}
        <nav aria-label={t("filter.legend")}>
          <ul className="flex flex-wrap gap-2 text-sm">
            {filters.map((filter) => (
              <li key={filter.key}>
                <Link
                  href={`/admin/applications?status=${filter.key}`}
                  aria-current={filter.active ? "page" : undefined}
                  className="border-border hover:bg-surface-muted focus-visible:outline-ring aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground aria-[current=page]:border-primary rounded-full border px-3 py-1 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {filter.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {rows.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="border-border bg-surface rounded-lg border p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-semibold">
                    {row.childName ?? t("empty_value")}
                  </h2>
                  <ApplicationStatusBadge status={row.status} />
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {row.childAge !== null
                    ? tList("ageSuffix", { age: row.childAge })
                    : t("empty_value")}
                  {" · "}
                  {row.currentRegion
                    ? tRegions(row.currentRegion)
                    : t("empty_value")}
                  {" · "}
                  {row.campaignTitle}
                  {" · "}
                  {row.submittedAt
                    ? t("submittedAt", {
                        date: format.dateTime(row.submittedAt, "short"),
                      })
                    : t("notSubmitted")}
                </p>
                {/* prefetch={false}: opening this page logs a full view of a
                    child's data. A hover must never write an audit entry for
                    something nobody looked at. */}
                <Link
                  href={`/admin/applications/${row.id}`}
                  prefetch={false}
                  className="text-primary mt-3 inline-block text-sm font-semibold underline underline-offset-4"
                >
                  {t("openCta")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
