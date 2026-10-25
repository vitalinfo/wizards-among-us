import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MyVolunteersTable } from "@/components/parent/MyVolunteersTable";
import { StartApplicationButton } from "@/components/parent/StartApplicationButton";
import { ctaVariants } from "@/components/ui/ctaStyles";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { Pager } from "@/components/ui/Pager";
import { canStartApplication } from "@/features/applications/authz";
import {
  countMyVolunteers,
  listMyVolunteers,
} from "@/features/applications/queries";
import { myVolunteersHref } from "@/features/applications/volunteerTabs";
import { recordAuditLog } from "@/features/audit/log";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import {
  CLAIM_TABS,
  CLAIMS_PAGE_SIZE,
  claimsPageCount,
  parseClaimsQuery,
} from "@/features/claims/claimTabs";
import type { ClaimTab } from "@/features/claims/queries";
import { getResolvedSettings } from "@/features/settings/queries";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.myVolunteer");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

// «Мої Чарівники» (Figma 142:6503) — "who is helping my child, and how do I
// reach them?"
//
// The only disclosure that runs volunteer → parent. Everywhere else the family's
// details flow outward; a family that has handed over a child's address deserves
// the same courtesy back. Audit-logged like any other contact reveal, whenever
// a page of contacts is shown.
export default async function MyVolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/account/parent/my-volunteer"));
  }

  const t = await getTranslations("parent.myVolunteer");
  const tTabs = await getTranslations("volunteer.claims.tabs");
  const query = parseClaimsQuery(await searchParams);
  const [campaign, settings] = await Promise.all([
    getActiveCampaignForIntake(),
    getResolvedSettings(),
  ]);
  const canStart = canStartApplication(actor, { campaign, settings });

  const total = campaign
    ? await countMyVolunteers(actor.id, campaign.id, query.tab)
    : 0;
  // Whether any volunteer holds any child, whatever the tab — the same count
  // when the tab is «Всі», so it costs a second query only on the other two.
  const holdsAny =
    query.tab === "all"
      ? total > 0
      : campaign
        ? (await countMyVolunteers(actor.id, campaign.id, "all")) > 0
        : false;
  const pageCount = claimsPageCount(total);
  const page = Math.min(query.page, pageCount);
  const rows =
    campaign && total > 0
      ? await listMyVolunteers(actor.id, campaign.id, {
          tab: query.tab,
          limit: CLAIMS_PAGE_SIZE,
          offset: (page - 1) * CLAIMS_PAGE_SIZE,
        })
      : [];

  if (rows.length > 0) {
    await recordAuditLog({
      actor,
      action: "volunteer.contact_viewed",
      targetType: "user",
      targetId: actor.id,
    });
  }

  return (
    <div className="pt-10 pb-10 lg:pt-11">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl leading-5 font-semibold tracking-[-0.03em]">
          {t("title")}
        </h1>
        <p className="text-muted-foreground max-w-[604px] text-base leading-5 tracking-[-0.03em]">
          {t("intro")}
        </p>
      </div>

      {/* No tabs for a family nobody has taken yet — there is nothing to
          filter, and the design draws the empty page without them. They stay
          when only one tab is empty, so «Завершені» leads back to «Всі». On a
          phone «Подати заявку» shares the row, as on «Мої заявки». */}
      {holdsAny ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 lg:mt-10">
          <FilterTabs
            label={t("tabs.label")}
            current={query.tab}
            tabs={CLAIM_TABS.map((tab) => ({
              key: tab,
              label: tTabs(tab),
              href: myVolunteersHref({ tab }),
            }))}
          />
          {canStart ? (
            <StartApplicationButton
              variant="panel"
              className="ml-auto lg:hidden"
            />
          ) : null}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <Empty tab={query.tab} />
      ) : (
        <>
          <div className="mt-6 lg:mt-8">
            <MyVolunteersTable rows={rows} />
          </div>
          <Pager
            label={t("pager.label")}
            page={page}
            pageCount={pageCount}
            total={total}
            from={(page - 1) * CLAIMS_PAGE_SIZE + 1}
            to={(page - 1) * CLAIMS_PAGE_SIZE + rows.length}
            hrefFor={(target) =>
              myVolunteersHref({ tab: query.tab, page: target })
            }
          />
        </>
      )}
    </div>
  );
}

// «Ваші Чарівники ще попереду», and a different sentence when it is one TAB
// that is empty rather than the whole page.
async function Empty({ tab }: { tab: ClaimTab }) {
  const t = await getTranslations("parent.myVolunteer.empty");
  const filtered = tab !== "all";

  return (
    <div className="flex flex-col items-center py-16 text-center lg:py-24">
      {/* The cabinet's empty-state heading, at the same size as «Мої заявки»
          — the design sets both at 100/90 (48/36 on a phone). */}
      <h2 className="font-display max-w-[334px] text-[50px] leading-[44px] font-bold tracking-[-0.06em] lg:max-w-[700px] lg:text-[min(5.52vw,106px)] lg:leading-[min(4.84vw,93px)]">
        {t.rich(filtered ? "filteredTitle" : "title", {
          em: (chunks) => <span className="text-primary">{chunks}</span>,
          br: () => <br />,
        })}
      </h2>
      <p className="text-muted-foreground mt-6 max-w-[328px] text-sm leading-[18px] tracking-[-0.03em] lg:max-w-[678px] lg:text-base lg:leading-5">
        {t(filtered ? "filteredBody" : "body")}
      </p>
      {filtered ? null : (
        // 64 tall at both widths, as drawn — not ctaBase's 78 from lg.
        <Link
          href="/account/parent/applications"
          className={cn(
            ctaVariants.primary,
            "focus-visible:outline-ring mt-8 inline-flex h-16 items-center justify-center rounded-full px-8 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
          )}
        >
          {t("cta")}
        </Link>
      )}
    </div>
  );
}
