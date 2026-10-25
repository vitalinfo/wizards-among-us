import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { ApplicationsTable } from "@/components/parent/ApplicationsTable";
import { StartApplicationButton } from "@/components/parent/StartApplicationButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { Pager } from "@/components/ui/Pager";
import {
  APPLICATION_TABS,
  APPLICATIONS_PAGE_SIZE,
  applicationsHref,
  applicationsPageCount,
  parseApplicationsQuery,
  type ApplicationTab,
} from "@/features/applications/applicationTabs";
import {
  canDeleteApplication,
  canStartApplication,
} from "@/features/applications/authz";
import {
  countMyApplications,
  getMyApplication,
  listMyApplications,
} from "@/features/applications/queries";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { getResolvedSettings } from "@/features/settings/queries";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

import { deleteDraftAction } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.applications");
  return { title: t("title") };
}

// Session- and campaign-dependent; inherits the root layout's noindex default.
export const dynamic = "force-dynamic";

// «Мої заявки» (Figma 139:4543) — this family's applications in the active
// campaign, one tab per status.
//
// The archive is DERIVED: only the active campaign's applications are listed,
// so prior-year ones disappear without a separate store. (The design's mock
// rows show two initiatives side by side; with one active campaign at a time,
// the «Ініціатива» column always reads the same.)
export default async function MyApplicationsPage({
  searchParams,
}: {
  // `confirm` + `id` open the delete confirmation over the list.
  searchParams: Promise<{
    tab?: string;
    page?: string;
    confirm?: string;
    id?: string;
  }>;
}) {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    // Carry the destination so signing in returns here, not to the home page.
    redirect(signedOutRedirect(actor, "/account/parent/applications"));
  }

  const params = await searchParams;
  const query = parseApplicationsQuery(params);
  const t = await getTranslations("parent.applications");
  const [campaign, settings] = await Promise.all([
    getActiveCampaignForIntake(),
    getResolvedSettings(),
  ]);
  const canStart = canStartApplication(actor, { campaign, settings });

  const total = campaign
    ? await countMyApplications(actor.id, campaign.id, query.tab)
    : 0;
  const pageCount = applicationsPageCount(total);
  const page = Math.min(query.page, pageCount);
  const rows =
    campaign && total > 0
      ? await listMyApplications(actor.id, campaign.id, {
          tab: query.tab,
          limit: APPLICATIONS_PAGE_SIZE,
          offset: (page - 1) * APPLICATIONS_PAGE_SIZE,
        })
      : [];

  // The draft the bin was pressed on, if the confirmation is open. Looked up
  // rather than taken from the list, because the id is in the url: someone
  // else's id, or a draft submitted since, simply opens no dialog.
  const pending =
    params.confirm === "delete" && params.id
      ? await getMyApplication(params.id, actor.id)
      : null;
  const toDelete =
    pending && canDeleteApplication(actor, pending) ? pending : null;
  const tDelete = await getTranslations("parent.applications.deleteDraft");

  return (
    <>
      {/* inert while the dialog is up: Tab must not walk into the list under
        it. The header and sidebar are outside this page — InertOutside, in
        the dialog, covers those. */}
      <div className="pt-10 pb-10 lg:pt-11" inert={toDelete !== null}>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl leading-5 font-semibold tracking-[-0.03em]">
            {t("title")}
          </h1>
          <p className="text-muted-foreground max-w-[604px] text-base leading-5 tracking-[-0.03em]">
            {t("intro")}
          </p>
        </div>

        {/* The tabs stay up even with nothing in the list, as drawn: «Чернетки»
          being empty is an answer, and losing the control that got you there
          would leave no way back to «Всі». On a phone «Подати заявку» shares
          the row — on desktop it is at the foot of the sidebar instead. */}
        <div className="mt-5 flex items-center justify-between gap-4 lg:mt-10">
          <FilterTabs
            label={t("tabs.label")}
            current={query.tab}
            tabs={APPLICATION_TABS.map((tab) => ({
              key: tab,
              label: t(`tabs.${tab}`),
              href: applicationsHref({ tab }),
            }))}
          />
          {canStart ? (
            <StartApplicationButton variant="panel" className="lg:hidden" />
          ) : null}
        </div>

        {rows.length === 0 ? (
          <Empty tab={query.tab} canStart={canStart} />
        ) : (
          <>
            <div className="mt-6 lg:mt-8">
              <ApplicationsTable rows={rows} query={{ tab: query.tab, page }} />
            </div>
            <Pager
              label={t("pager.label")}
              page={page}
              pageCount={pageCount}
              total={total}
              from={(page - 1) * APPLICATIONS_PAGE_SIZE + 1}
              to={(page - 1) * APPLICATIONS_PAGE_SIZE + rows.length}
              hrefFor={(target) =>
                applicationsHref({ tab: query.tab, page: target })
              }
            />
          </>
        )}
      </div>

      {toDelete ? (
        <ConfirmModal
          action={deleteDraftAction.bind(null, toDelete.id, {
            tab: query.tab,
            page,
          })}
          title={tDelete("title")}
          message={tDelete("body", {
            name: toDelete.childName ?? t("childFallback"),
          })}
          confirmLabel={tDelete("confirm")}
          cancelHref={applicationsHref({ tab: query.tab, page })}
        />
      ) : null}
    </>
  );
}

// «Тут поки що немає ваших заявок», and a different sentence when it is one
// TAB that is empty rather than the whole list: a family with three drafts who
// opens «Виконано» has not been told anything about being new.
async function Empty({
  tab,
  canStart,
}: {
  tab: ApplicationTab;
  canStart: boolean;
}) {
  const t = await getTranslations("parent.applications.empty");
  const tClosed = await getTranslations("parent.applications.closed");
  const filtered = tab !== "all";

  return (
    <div className="flex flex-col items-center py-16 text-center lg:py-24">
      {/* The cabinet front page's heading, at the same size — the design sets
          both at 100/90 (48/36 on a phone). */}
      <h2 className="font-display max-w-[334px] text-[50px] leading-[44px] font-bold tracking-[-0.06em] lg:max-w-[700px] lg:text-[min(5.52vw,106px)] lg:leading-[min(4.84vw,93px)]">
        {t.rich(filtered ? "filteredTitle" : "title", {
          em: (chunks) => <span className="text-primary">{chunks}</span>,
          br: () => <br />,
        })}
      </h2>
      <p className="text-muted-foreground mt-6 max-w-[328px] text-sm leading-[18px] tracking-[-0.03em] lg:max-w-[678px] lg:text-base lg:leading-5">
        {t(filtered ? "filteredBody" : "body")}
      </p>
      {filtered ? null : canStart ? (
        <StartApplicationButton variant="hero" className="mt-8" />
      ) : (
        <p role="status" className="text-muted-foreground mt-8 max-w-[420px]">
          <span className="text-foreground block font-semibold">
            {tClosed("title")}
          </span>
          {tClosed("body")}
        </p>
      )}
    </div>
  );
}
