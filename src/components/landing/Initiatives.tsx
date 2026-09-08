"use client";

import { useTranslations } from "next-intl";

import { SITE_CONTAINER } from "@/components/site/layout";
import type { CampaignStates } from "@/features/campaigns/queries";
import { cn } from "@/lib/utils";

import { InitiativeCard, type InitiativeStatus } from "./InitiativeCard";
import { SectionLabel } from "./SectionLabel";

// The three initiatives, in the design's order. `campaignType` ties a card to
// the database: whether it reads as open, finished or not yet running comes
// from whether we have ever run a campaign of that type and whether one is
// running now.
//
// «Чарівник для родини» has no campaign type — it is the on-demand one and we
// do not run it as a campaign — so it always resolves to «Набір ще не
// відкрито», which is the state the design draws it in.
const INITIATIVES = [
  {
    key: "mykolai",
    image: "/initiative-mykolai.webp",
    campaignType: "saint_nicholas_day",
  },
  { key: "family", image: "/initiative-family.webp" },
  {
    key: "school",
    image: "/initiative-school.webp",
    campaignType: "new_school_year",
  },
] as const satisfies readonly {
  key: string;
  image: string;
  campaignType?: keyof CampaignStates;
}[];

function statusOf(
  campaigns: CampaignStates,
  campaignType?: keyof CampaignStates,
): InitiativeStatus {
  if (!campaignType) {
    return "soon";
  }
  const state = campaigns[campaignType];
  if (state === undefined) {
    return "soon";
  }
  return state === "active" ? "open" : "closed";
}

export function Initiatives({ campaigns }: { campaigns: CampaignStates }) {
  const t = useTranslations("landing.initiatives");

  return (
    <section
      id="initiatives"
      className={cn(SITE_CONTAINER, "scroll-mt-24 py-15 lg:py-25")}
    >
      <div className="mx-auto flex max-w-[681px] flex-col items-center gap-4.5 text-center lg:gap-11">
        <div className="flex flex-col items-center gap-4.5 lg:gap-5">
          <SectionLabel>{t("label")}</SectionLabel>
          <h2 className="font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:text-[80px] lg:leading-[70px]">
            {t("title")}
          </h2>
        </div>
        <p className="text-muted-foreground max-w-[691px] text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
          {t("subtitle")}
        </p>
      </div>

      {/* A grid at every width, and never a scroller: unlike the step cards,
          the design stacks these three vertically on a phone. Three across
          only from xl — at 1025 they would be 290px wide and «Прийняти
          участь» in the design's pill is 248 inside a 238px content box, so
          the button itself would not fit. Two across until then. */}
      <ul
        aria-label={t("region")}
        className="mt-8 grid grid-cols-1 items-stretch gap-6 lg:mt-15 lg:grid-cols-2 xl:grid-cols-3"
      >
        {INITIATIVES.map((item) => (
          <InitiativeCard
            key={item.key}
            itemKey={item.key}
            image={item.image}
            status={statusOf(
              campaigns,
              "campaignType" in item ? item.campaignType : undefined,
            )}
          />
        ))}
      </ul>
    </section>
  );
}
