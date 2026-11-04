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
  campaignToId,
  filterToStatus,
  moderationCampaignScope,
  moderationPageCount,
  moderationQueueHref,
  moderationSearch,
  parseModerationQuery,
  submittedRange,
  MODERATION_PAGE_SIZE,
} from "@/features/applications/moderationFilter";
import { listCampaigns } from "@/features/campaigns/adminQueries";
import { getUserForAdmin } from "@/features/users/adminQueries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    campaign?: string;
    from?: string;
    to?: string;
    parent?: string;
    claimedBy?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const [params, campaigns] = await Promise.all([
    searchParams,
    listCampaigns(),
  ]);
  const campaignScope = moderationCampaignScope(campaigns);
  const query = parseModerationQuery(params, campaignScope);
  const filters = {
    status: filterToStatus(query.filter),
    campaignId: campaignToId(query.campaign),
    ...submittedRange(query),
    parentId: query.parentId ?? undefined,
    claimedBy: query.claimedBy ?? undefined,
    search: query.search,
  };

  // Count first: the requested page has to be clamped to what exists before we
  // fetch, or a stale ?page= (say, after a batch was approved away) shows an
  // empty queue that looks like "nothing to review".
  const total = await countForModeration(filters);
  const pageCount = moderationPageCount(total);
  const page = Math.min(query.page, pageCount);
  const offset = (page - 1) * MODERATION_PAGE_SIZE;

  const [t, tUsers, tList, tRegions, format, rows, parent, volunteer] =
    await Promise.all([
      getTranslations("admin.applications"),
      getTranslations("admin.users"),
      getTranslations("parent.applications"),
      getTranslations("regions"),
      getFormatter(),
      listForModeration({ ...filters, limit: MODERATION_PAGE_SIZE, offset }),
      query.parentId ? getUserForAdmin(query.parentId) : null,
      query.claimedBy ? getUserForAdmin(query.claimedBy) : null,
    ]);
  const nameOf = (user: {
    firstName: string | null;
    lastName: string | null;
  }) =>
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    tUsers("unnamed");

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
        </div>

        <ModerationFilterForm
          query={query}
          campaigns={campaigns}
          campaignScope={campaignScope}
        />

        {/* The person filter has no control of its own — it arrives from a
            count on /admin/users — so it is spelled out here, or the list
            would be narrowed with nothing on screen saying why. */}
        {parent ? (
          <p className="text-sm">
            {t("filter.byParent", { name: nameOf(parent) })}
          </p>
        ) : null}
        {volunteer ? (
          <p className="text-sm">
            {t("filter.byVolunteer", { name: nameOf(volunteer) })}
          </p>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="border-border bg-surface rounded-lg border p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <ApplicationStatusBadge status={row.status} />
                  <span className="text-muted-foreground text-sm">
                    {row.submittedAt
                      ? format.dateTime(row.submittedAt, "short")
                      : t("notSubmitted")}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
                  <h2 className="font-semibold">
                    {row.childName ?? t("empty_value")}
                  </h2>
                  <span className="text-muted-foreground text-sm">
                    {row.childAge !== null
                      ? tList("ageSuffix", { age: row.childAge })
                      : t("empty_value")}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {row.homeRegion ? tRegions(row.homeRegion) : t("empty_value")}
                  {" · "}
                  {row.homeTown ?? t("empty_value")}
                  {" · "}
                  {row.displacedYear ?? t("empty_value")}
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
