import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { ApplicationStatusBadge } from "@/components/ui/ApplicationStatusBadge";
import { APPLICATION_STATUSES } from "@/db/enums";
import {
  countForModeration,
  listForModeration,
} from "@/features/applications/adminQueries";
import {
  filterToStatus,
  moderationPageCount,
  moderationQueueHref,
  parseModerationFilter,
  parseModerationPage,
  MODERATION_PAGE_SIZE,
  type ModerationFilter,
} from "@/features/applications/moderationFilter";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const query = await searchParams;
  const filter = parseModerationFilter(query.status);
  const status = filterToStatus(filter);

  // Count first: the requested page has to be clamped to what exists before we
  // fetch, or a stale ?page= (say, after a batch was approved away) shows an
  // empty queue that looks like "nothing to review".
  const total = await countForModeration({ status });
  const pageCount = moderationPageCount(total);
  const page = Math.min(parseModerationPage(query.page), pageCount);
  const offset = (page - 1) * MODERATION_PAGE_SIZE;

  const [t, tStatus, tList, tRegions, format, rows] = await Promise.all([
    getTranslations("admin.applications"),
    getTranslations("parent.applications.status"),
    getTranslations("parent.applications"),
    getTranslations("regions"),
    getFormatter(),
    listForModeration({ status, limit: MODERATION_PAGE_SIZE, offset }),
  ]);

  const filterOptions: {
    key: ModerationFilter;
    label: string;
    active: boolean;
  }[] = [
    { key: "all", label: t("filter.all"), active: filter === "all" },
    ...APPLICATION_STATUSES.map((value) => ({
      key: value,
      label: tStatus(value),
      active: filter === value,
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
            {filterOptions.map((option) => (
              <li key={option.key}>
                <Link
                  href={moderationQueueHref(option.key)}
                  aria-current={option.active ? "page" : undefined}
                  className="border-border hover:bg-surface-muted focus-visible:outline-ring aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground aria-[current=page]:border-primary rounded-full border px-3 py-1 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {option.label}
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
                {/* The filter rides along so "back" returns to this view
                    rather than resetting to the default queue.
                    prefetch={false}: opening that page logs a full view of a
                    child's data, and a hover must never write an audit entry
                    for something nobody looked at. */}
                <Link
                  href={`/admin/applications/${row.id}?status=${filter}&page=${page}`}
                  prefetch={false}
                  className="text-primary mt-3 inline-block text-sm font-semibold underline underline-offset-4"
                >
                  {t("openCta")}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {total > 0 ? (
          <nav
            aria-label={t("pager.label")}
            className="flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            <p className="text-muted-foreground">
              {t("pager.range", {
                from: offset + 1,
                to: offset + rows.length,
                total,
              })}
            </p>
            {pageCount > 1 ? (
              <div className="flex items-center gap-3">
                {/* Links, not buttons: each page is addressable and this works
                    with no client JS, like the rest of the admin surface. */}
                {page > 1 ? (
                  <Link
                    href={moderationQueueHref(filter, page - 1)}
                    rel="prev"
                    className="border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-3 py-1.5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {t("pager.previous")}
                  </Link>
                ) : null}
                <span className="text-muted-foreground">
                  {t("pager.position", { page, pageCount })}
                </span>
                {page < pageCount ? (
                  <Link
                    href={moderationQueueHref(filter, page + 1)}
                    rel="next"
                    className="border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-3 py-1.5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {t("pager.next")}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </nav>
        ) : null}
      </main>
    </>
  );
}
