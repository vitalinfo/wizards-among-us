import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  InitiativeHero,
  InitiativeQuote,
  InitiativeSplit,
  InitiativeStatChip,
  InitiativeSteps,
  type Step,
} from "@/components/initiatives";
import { Gallery } from "@/components/landing/Gallery";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { SITE_CONTAINER } from "@/components/site/layout";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getCampaignStates } from "@/features/campaigns/queries";
import { initiativeStatus } from "@/features/initiatives/catalog";
import { getResolvedSettings } from "@/features/settings/queries";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("initiatives.family.meta");
  return { title: t("title"), description: t("description") };
}

export const dynamic = "force-dynamic";

const STEPS = [
  { key: "apply", emoji: "✍️" },
  { key: "review", emoji: "📄" },
  { key: "choose", emoji: "🪄", accent: true },
  { key: "direct", emoji: "🎁" },
  { key: "home", emoji: "❤️" },
] as const;

// «Чарівник для родини», from Figma 59:7415 (desktop 59:7424). The shortest of
// the three and the only one whose hero is asymmetric — copy left, figure
// right.
//
// It has NO campaign type, so `initiativeStatus` always answers «Набір ще не
// відкрито» and both actions are disabled. That is deliberate and matches the
// design, which draws it closed: this is the on-demand initiative and we never
// run it as a campaign.
export default async function FamilyPage() {
  const [campaigns, settings] = await Promise.all([
    getCampaignStates(),
    getResolvedSettings(),
  ]);
  const status = initiativeStatus(campaigns, settings, undefined);

  const t = await getTranslations("initiatives.family");
  const tInit = await getTranslations("initiatives");
  const tNav = await getTranslations("common.nav");

  const steps: Step[] = STEPS.map((s) => ({
    key: s.key,
    emoji: s.emoji,
    ...("accent" in s ? { accent: true as const } : {}),
    title: t(`steps.items.${s.key}.title`),
    body: t(`steps.items.${s.key}.body`),
  }));

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <Breadcrumb
          label={tNav("breadcrumb")}
          items={[
            { label: tInit("breadcrumbHome"), href: "/" },
            { label: tNav("initiatives"), href: "/initiatives" },
            { label: t("breadcrumb") },
          ]}
          className={cn(SITE_CONTAINER, "pt-3.5 lg:pt-6")}
        />

        <InitiativeHero
          status={status}
          lead={t("lead")}
          align="start"
          title={t.rich("title", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
          art={
            <Image
              src="/initiative-family-hero.webp"
              alt={t("heroAlt")}
              width={972}
              height={1166}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="mx-auto h-auto w-full max-w-[486px]"
            />
          }
          chips={
            <InitiativeStatChip
              tone="cream"
              value={t("chip.value")}
              label={t("chip.label")}
              className="2xl:w-[min(15.28vw,293px)] 2xl:rotate-9"
            />
          }
        />

        <InitiativeSplit
          image="/initiative-family-help.webp"
          imageAlt={t("why.imageAlt")}
          imageWidth={1670}
          imageHeight={1764}
          label={t("why.label")}
          title={t("why.title")}
        >
          <p className="text-muted-foreground text-xl leading-7 font-semibold tracking-[-0.03em] lg:text-[26px] lg:leading-[30px]">
            {t.rich("why.lead", {
              faint: (chunks) => (
                <span className="text-muted-faint">{chunks}</span>
              ),
            })}
          </p>
          <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
            {t("why.body")}
          </p>
          <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
            {t("why.meeting")}
          </p>
          <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
            {t.rich("why.closing", {
              b: (chunks) => <b className="font-bold">{chunks}</b>,
            })}
          </p>

          {/* The one caveat on this page, and the design sets it apart on the
              blue canvas rather than leaving it as a fourth paragraph: this
              initiative is not always open, and a family should not read the
              rest and then be surprised. */}
          <p className="bg-canvas rounded-3xl p-6 text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
            {t("why.note")}
          </p>
        </InitiativeSplit>

        <InitiativeSteps
          label={t("steps.label")}
          title={t("steps.title")}
          subtitle={t("steps.subtitle")}
          steps={steps}
          tone="cream-soft"
        />

        <InitiativeQuote intakeOpen={status === "open"}>
          {t.rich("quote", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </InitiativeQuote>

        <Gallery />
      </main>

      <SiteFooter />
    </>
  );
}
