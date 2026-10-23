import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { BrowseFilterForm } from "@/components/volunteer/BrowseFilterForm";
import { ChildCard } from "@/components/volunteer/ChildCard";
import { ChildrenEmptyState } from "@/components/volunteer/ChildrenEmptyState";
import { Pager } from "@/components/ui/Pager";
import {
  ageBand,
  browseHref,
  browsePageCount,
  claimHref,
  BROWSE_ANCHOR,
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

export const dynamic = "force-dynamic";

// «Знайти історію» — the volunteer browse list (Figma 118:420).
export default async function BrowseChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{
    region?: string;
    age?: string;
    page?: string;
  }>;
}) {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/account/volunteer/children"));
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
      <div className="pt-10 pb-10 lg:pt-[50px]">
        <Header title={t("title")} intro={t("intro")} />
        <p className="text-muted-foreground mt-8 text-sm">{t("noCampaign")}</p>
      </div>
    );
  }

  const band = ageBand(query.age);
  const filters = {
    campaignId: campaign.id,
    region: query.region ?? undefined,
    minAge: band?.min,
    maxAge: band?.max,
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

  // A filter is what emptied the list, as opposed to there being nothing to
  // show — the two need different copy, and only one of them is reassuring.
  const filtered = query.region !== null || query.age !== null;

  return (
    <div className="pt-10 pb-10 lg:pt-[50px]">
      <Header title={t("title")} intro={t("intro")} />

      {/* 60 between the intro and the filters, 58 between the filters and the
          first card — the rhythm the design draws, looser than the page's
          default spacing. */}
      <div className="mt-10 lg:mt-[60px]">
        <BrowseFilterForm query={query} anchor={BROWSE_ANCHOR} />
      </div>

      {/* scroll-mt clears the account header, or the anchor lands under it and
          the first card is hidden. */}
      <div id={BROWSE_ANCHOR} className="scroll-mt-20" />

      {rows.length === 0 ? (
        <ChildrenEmptyState filtered={filtered} />
      ) : (
        <>
          <ul className="mt-14 flex flex-col gap-10 lg:mt-[58px] lg:gap-6">
            {rows.map((row) => (
              <ChildCard
                key={row.id}
                row={row}
                claimHref={claimHref(query, page, row.id)}
              />
            ))}
          </ul>

          <Pager
            label={t("pager.label")}
            page={page}
            pageCount={pageCount}
            total={total}
            from={(page - 1) * BROWSE_PAGE_SIZE + 1}
            to={(page - 1) * BROWSE_PAGE_SIZE + rows.length}
            hrefFor={(target) => browseHref(query, { page: target })}
          />
        </>
      )}
    </div>
  );
}

// 20px semibold over 16px muted at 604 — the cabinet's page header, which the
// parent cabinet will want too when its screens arrive.
function Header({ title, intro }: { title: string; intro: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl leading-5 font-semibold tracking-[-0.03em]">
        {title}
      </h1>
      <p className="text-muted-foreground max-w-[604px] text-base leading-5 tracking-[-0.03em]">
        {intro}
      </p>
    </div>
  );
}
