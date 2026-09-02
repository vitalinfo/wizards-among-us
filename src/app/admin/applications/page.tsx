import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { ModerationFilterForm } from "@/components/admin/ModerationFilterForm";
import { Pager } from "@/components/ui/Pager";
import { ApplicationStatusBadge } from "@/components/ui/ApplicationStatusBadge";
import {
  countForModeration,
  listForModeration,
} from "@/features/applications/adminQueries";
import {
  filterToStatus,
  moderationPageCount,
  moderationQueueHref,
  moderationSearch,
  parseModerationQuery,
  submittedRange,
  MODERATION_PAGE_SIZE,
} from "@/features/applications/moderationFilter";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const query = parseModerationQuery(await searchParams);
  const filters = {
    status: filterToStatus(query.filter),
    ...submittedRange(query),
  };

  // Count first: the requested page has to be clamped to what exists before we
  // fetch, or a stale ?page= (say, after a batch was approved away) shows an
  // empty queue that looks like "nothing to review".
  const total = await countForModeration(filters);
  const pageCount = moderationPageCount(total);
  const page = Math.min(query.page, pageCount);
  const offset = (page - 1) * MODERATION_PAGE_SIZE;

  const [t, tList, tRegions, format, rows] = await Promise.all([
    getTranslations("admin.applications"),
    getTranslations("parent.applications"),
    getTranslations("regions"),
    getFormatter(),
    listForModeration({ ...filters, limit: MODERATION_PAGE_SIZE, offset }),
  ]);

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
        </div>

        <ModerationFilterForm query={query} />

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
                  href={`/admin/applications/${row.id}?${moderationSearch(query, page)}`}
                  prefetch={false}
                  className="text-primary mt-3 inline-block text-sm font-semibold underline underline-offset-4"
                >
                  {t("openCta")}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Pager
          label={t("pager.label")}
          page={page}
          pageCount={pageCount}
          total={total}
          from={offset + 1}
          to={offset + rows.length}
          hrefFor={(target) => moderationQueueHref(query, target)}
        />
      </main>
    </>
  );
}
