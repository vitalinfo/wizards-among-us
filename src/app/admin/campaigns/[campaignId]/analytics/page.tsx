import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { AnalyticsChart } from "@/components/admin/AnalyticsChart";
import { AnalyticsTable } from "@/components/admin/AnalyticsTable";
import { CountBarChart } from "@/components/admin/CountBarChart";
import { buildAnalyticsDays } from "@/features/campaigns/analytics";
import {
  countCampaignApplicationsByAge,
  countCampaignApplicationsByGender,
  countCampaignApplicationsByRegion,
  listCampaignStateEvents,
} from "@/features/campaigns/analyticsQueries";
import { getAdminCampaign } from "@/features/campaigns/adminQueries";
import {
  buildAgeBars,
  buildGenderBars,
  buildRegionBars,
  type Bar,
} from "@/features/campaigns/breakdowns";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";
import { isUuid } from "@/lib/uuid";
import { toZonedDateInput } from "@/lib/zonedDate";

export const dynamic = "force-dynamic";

export default async function CampaignAnalyticsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  if (!isUuid(campaignId)) {
    notFound();
  }

  const campaign = await getAdminCampaign(campaignId);
  if (!campaign) {
    notFound();
  }

  const [t, tc, tRegion, tGender, format, events, byRegion, byAge, byGender] =
    await Promise.all([
      getTranslations("admin.campaigns.analytics"),
      getTranslations("admin.campaigns"),
      getTranslations("regions"),
      getTranslations("genders"),
      getFormatter(),
      listCampaignStateEvents(campaignId),
      countCampaignApplicationsByRegion(campaignId),
      countCampaignApplicationsByAge(campaignId),
      countCampaignApplicationsByGender(campaignId),
    ]);

  // A running campaign runs to today, so the days since the last change show
  // the state as it still is.
  const days = buildAnalyticsDays(
    events,
    campaign.status === "active" ? toZonedDateInput(new Date()) : null,
  );
  const rows = days.map((day) => {
    // Noon UTC is the same calendar date in Kyiv whatever the season.
    const at = new Date(`${day.day}T12:00:00Z`);
    return {
      ...day,
      label: format.dateTime(at, "short"),
      shortLabel: format.dateTime(at, { day: "2-digit", month: "2-digit" }),
    };
  });

  const breakdowns = [
    {
      id: "by-region",
      bars: buildRegionBars(byRegion, (region) => tRegion(region)),
      title: t("regionsTitle"),
      description: t("regionsDescription"),
    },
    {
      id: "by-age",
      bars: buildAgeBars(byAge, (age) => t("ageLabel", { age })),
      title: t("ageTitle"),
      description: t("ageDescription"),
    },
    {
      id: "by-gender",
      bars: buildGenderBars(byGender, (gender) => tGender(gender)),
      title: t("genderTitle"),
      description: t("genderDescription"),
    },
  ] satisfies {
    id: string;
    bars: Bar<string | number>[];
    title: string;
    description: string;
  }[];

  const series = {
    waiting: t("series.waiting"),
    claimed: t("series.claimed"),
  };

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
        <Link
          href="/admin/campaigns"
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {tc("backCta")}
        </Link>
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{campaign.title}</p>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">{t("intro")}</p>
            <AnalyticsChart
              rows={rows}
              labels={{
                title: t("chartTitle"),
                description: t("chartDescription"),
                ...series,
              }}
            />
            <AnalyticsTable
              rows={rows}
              labels={{ caption: t("tableCaption"), day: t("day"), ...series }}
            />
            {breakdowns.map(({ id, bars, title, description }) => (
              <CountBarChart
                key={id}
                id={id}
                bars={bars.map(({ value, label, count }) => ({
                  key: String(value),
                  label,
                  count,
                }))}
                labels={{ title, description }}
              />
            ))}
          </>
        )}
      </main>
    </>
  );
}
