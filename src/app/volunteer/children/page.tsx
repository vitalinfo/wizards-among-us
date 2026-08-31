import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { BrowseFilterForm } from "@/components/volunteer/BrowseFilterForm";
import { ChildCard } from "@/components/volunteer/ChildCard";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  ageBand,
  browseHref,
  browsePageCount,
  BROWSE_PAGE_SIZE,
  parseBrowseQuery,
} from "@/features/claims/browseFilters";
import { countBrowsable, listBrowsable } from "@/features/claims/queries";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { recordAuditLog } from "@/features/audit/log";
import { canBrowseChildren } from "@/lib/authz";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

import { claimAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function BrowseChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{
    region?: string;
    availability?: string;
    age?: string;
    page?: string;
    claim?: string;
  }>;
}) {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/volunteer/children"));
  }
  // The role is self-serve, so someone without it is sent to opt in rather than
  // shown a dead end.
  if (!canBrowseChildren(actor)) {
    redirect("/volunteer");
  }

  const params = await searchParams;
  const query = parseBrowseQuery(params);
  const t = await getTranslations("volunteer.children");

  // Scoped to the ACTIVE campaign (invariant) — prior-year families must never
  // surface to volunteers.
  const campaign = await getActiveCampaignForIntake();
  if (!campaign) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:px-8">
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground mt-4">{t("noCampaign")}</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const band = ageBand(query.age);
  const filters = {
    campaignId: campaign.id,
    region: query.region ?? undefined,
    minAge: band?.min,
    // The open-ended top band has no maximum, so nobody the form accepts is
    // filtered out of existence.
    maxAge: band?.max ?? undefined,
    availability: query.availability === "all" ? undefined : query.availability,
  };

  const total = await countBrowsable(filters);
  const pageCount = browsePageCount(total);
  const page = Math.min(query.page, pageCount);
  const rows = await listBrowsable({
    ...filters,
    limit: BROWSE_PAGE_SIZE,
    offset: (page - 1) * BROWSE_PAGE_SIZE,
  });

  await recordAuditLog({
    actor,
    action: "children.browsed",
    targetType: "campaign",
    targetId: campaign.id,
  });

  // Claiming confirms first: it commits this volunteer to a child and reveals
  // the family's details to them. Same no-JS page-state pattern as the admin
  // surface. Only a row on THIS page can be confirmed, so a stale link can't
  // put an unrelated child behind the prompt.
  const pendingClaim = params.claim
    ? (rows.find((row) => row.id === params.claim && !row.claimed) ?? null)
    : null;
  const currentHref = browseHref({ ...query, page });

  return (
    <>
      <SiteHeader />
      <main
        inert={pendingClaim !== null}
        className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:px-8"
      >
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>

        <div className="mt-6">
          <BrowseFilterForm query={query} />
        </div>

        {rows.length === 0 ? (
          <p className="text-muted-foreground mt-8">{t("empty")}</p>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <ChildCard
                key={row.id}
                row={row}
                claimHref={
                  row.claimed
                    ? null
                    : `${currentHref}${currentHref.includes("?") ? "&" : "?"}claim=${row.id}`
                }
              />
            ))}
          </ul>
        )}

        {total > 0 ? (
          <nav
            aria-label={t("pager.label")}
            className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            <p className="text-muted-foreground">
              {t("pager.range", {
                from: (page - 1) * BROWSE_PAGE_SIZE + 1,
                to: (page - 1) * BROWSE_PAGE_SIZE + rows.length,
                total,
              })}
            </p>
            {pageCount > 1 ? (
              <div className="flex items-center gap-3">
                {page > 1 ? (
                  <Link
                    href={browseHref(query, { page: page - 1 })}
                    rel="prev"
                    className="border-border hover:bg-surface-muted rounded-md border px-3 py-1.5 font-medium"
                  >
                    {t("pager.previous")}
                  </Link>
                ) : null}
                <span className="text-muted-foreground">
                  {t("pager.position", { page, pageCount })}
                </span>
                {page < pageCount ? (
                  <Link
                    href={browseHref(query, { page: page + 1 })}
                    rel="next"
                    className="border-border hover:bg-surface-muted rounded-md border px-3 py-1.5 font-medium"
                  >
                    {t("pager.next")}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </nav>
        ) : null}
      </main>

      {pendingClaim ? (
        <ConfirmModal
          action={claimAction.bind(null, pendingClaim.id, currentHref)}
          title={t("confirmClaim.title", {
            name: pendingClaim.childFirstName ?? t("noName"),
          })}
          message={t("confirmClaim.body")}
          confirmLabel={t("claimCta")}
          cancelHref={currentHref}
        />
      ) : null}
      <SiteFooter />
    </>
  );
}
