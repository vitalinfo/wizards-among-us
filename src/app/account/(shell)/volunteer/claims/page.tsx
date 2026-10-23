import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ctaVariants } from "@/components/ui/ctaStyles";
import { Pager } from "@/components/ui/Pager";
import { ClaimsTable } from "@/components/volunteer/ClaimsTable";
import { ClaimTabs } from "@/components/volunteer/ClaimTabs";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import {
  claimsHref,
  claimsPageCount,
  CLAIMS_PAGE_SIZE,
  parseClaimsQuery,
} from "@/features/claims/claimTabs";
import { countMyClaims, listMyClaims } from "@/features/claims/queries";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// «Мої підопічні» (Figma 130:2506) — the children this volunteer holds.
//
// The LIST carries no sensitive data any more: name, age, campaign, state. The
// current town, the delivery details and the family's contact are behind «Дії»,
// on one child at a time, which is also where the audit entry for reading them
// is written. The old page printed all of it on every card and logged one event
// for the lot.
export default async function MyClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/account/volunteer/claims"));
  }

  const t = await getTranslations("volunteer.claims");
  const query = parseClaimsQuery(await searchParams);
  const campaign = await getActiveCampaignForIntake();

  const total = campaign
    ? await countMyClaims(actor.id, campaign.id, query.tab)
    : 0;
  const pageCount = claimsPageCount(total);
  const page = Math.min(query.page, pageCount);
  const rows =
    campaign && total > 0
      ? await listMyClaims(actor.id, campaign.id, {
          tab: query.tab,
          limit: CLAIMS_PAGE_SIZE,
          offset: (page - 1) * CLAIMS_PAGE_SIZE,
        })
      : [];

  return (
    <div className="pt-10 pb-10 lg:pt-11">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl leading-5 font-semibold tracking-[-0.03em]">
          {t("title")}
        </h1>
        <p className="text-muted-foreground max-w-[839px] text-base leading-5 tracking-[-0.03em]">
          {t("intro")}
        </p>
      </div>

      {/* The tabs stay up even with nothing in the list: «Завершені» being
          empty is an answer, and losing the control that got you there would
          leave no way back to «Всі». */}
      <div className="mt-10">
        <ClaimTabs current={query.tab} />
      </div>

      {rows.length === 0 ? (
        <Empty tab={query.tab} />
      ) : (
        <>
          <div className="mt-8">
            <ClaimsTable rows={rows} />
          </div>
          <Pager
            label={t("pager.label")}
            page={page}
            pageCount={pageCount}
            total={total}
            from={(page - 1) * CLAIMS_PAGE_SIZE + 1}
            to={(page - 1) * CLAIMS_PAGE_SIZE + rows.length}
            hrefFor={(target) => claimsHref({ tab: query.tab, page: target })}
          />
        </>
      )}
    </div>
  );
}

// «Ваші підопічні ще попереду» — and a different sentence when it is a TAB that
// is empty rather than the whole cabinet. A volunteer who has five completed
// children and clicks «Активні» has not been told anything about being new.
async function Empty({ tab }: { tab: "all" | "active" | "completed" }) {
  const t = await getTranslations("volunteer.claims.empty");

  return (
    <div className="flex flex-col items-center py-16 text-center lg:py-24">
      <h2 className="font-display max-w-[320px] text-[40px] leading-10 font-bold tracking-[-0.03em] lg:max-w-none lg:text-[92px] lg:leading-[94px]">
        {t.rich(tab === "all" ? "title" : `${tab}Title`, {
          em: (chunks) => <span className="text-primary">{chunks}</span>,
          br: () => <br className="hidden lg:inline" />,
        })}
      </h2>
      <p className="text-muted-foreground mt-6 max-w-[320px] text-sm leading-5 tracking-[-0.03em] lg:max-w-[678px] lg:text-base">
        {t(tab === "all" ? "body" : `${tab}Body`)}
      </p>
      <Link
        href="/account/volunteer/children"
        className={cn(
          ctaVariants.primary,
          "focus-visible:outline-ring mt-8 inline-flex h-16 items-center justify-center rounded-full px-10 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:mt-[72px]",
        )}
      >
        {t("cta")}
      </Link>
    </div>
  );
}
