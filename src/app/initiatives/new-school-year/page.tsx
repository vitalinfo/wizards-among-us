import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  InitiativeBand,
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
  const t = await getTranslations("initiatives.school.meta");
  return { title: t("title"), description: t("description") };
}

export const dynamic = "force-dynamic";

// The design marks «Чарівник обирає родину» out with a yellow disc instead of
// the tinted blue — the step the whole initiative turns on.
const STEPS = [
  { key: "apply", emoji: "✍️" },
  { key: "list", emoji: "📄" },
  { key: "choose", emoji: "🪄", accent: true },
  { key: "direct", emoji: "🎁" },
  { key: "share", emoji: "❤️" },
] as const;

// «Шкільний Чарівник», from Figma 59:5927. Same sections as «Чарівний
// Миколай» in a different order, plus two it does not have: a tinted band of
// prose («Підхід») and a wide illustration between sections.
export default async function SchoolPage() {
  const [campaigns, settings] = await Promise.all([
    getCampaignStates(),
    getResolvedSettings(),
  ]);
  const status = initiativeStatus(campaigns, settings, "new_school_year");

  const t = await getTranslations("initiatives.school");
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
          // 120/90 here rather than the 120/80 «Чарівний Миколай» gets: two
          // long words need the extra room.
          titleClassName="lg:leading-[min(4.6875vw,90px)]"
          title={t.rich("title", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
          chips={
            <>
              <InitiativeStatChip
                tone="cream"
                value={t("chips.first.value")}
                label={t("chips.first.label")}
                className="2xl:w-[min(15.26vw,293px)] 2xl:-rotate-9"
              />
              <InitiativeStatChip
                tone="canvas"
                value={t("chips.second.value")}
                label={t("chips.second.label")}
                className="2xl:w-[min(15.26vw,293px)] 2xl:rotate-9"
              />
            </>
          }
        />

        <InitiativeSplit
          image="/initiative-school-supplies.webp"
          imageAlt={t("why.imageAlt")}
          imageWidth={1668}
          imageHeight={1320}
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
            {t.rich("why.closing", {
              b: (chunks) => <b className="font-bold">{chunks}</b>,
            })}
          </p>
        </InitiativeSplit>

        <InitiativeSteps
          label={t("steps.label")}
          title={t("steps.title")}
          subtitle={t("steps.subtitle")}
          steps={steps}
          tone="cream-soft"
        />

        {/* 1718 of the design's 1720 content box — the width of the container,
            not of the page, so it keeps the gutter the rest of the page has. */}
        <section className={cn(SITE_CONTAINER, "py-12 lg:py-20")}>
          <Image
            src="/initiative-school-wizard.webp"
            alt={t("wizardAlt")}
            width={2720}
            height={1593}
            sizes="100vw"
            className="h-auto w-full rounded-3xl"
          />
        </section>

        <InitiativeBand
          tone="canvas"
          label={t("approach.label")}
          title={t("approach.title")}
        >
          <p className="text-xl leading-7 font-semibold tracking-[-0.03em] lg:text-[26px] lg:leading-[30px]">
            {t("approach.lead")}
          </p>
          <p className="text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
            {t("approach.body")}
          </p>
          <p className="text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
            {t.rich("approach.closing", {
              b: (chunks) => <b className="font-bold">{chunks}</b>,
            })}
          </p>
        </InitiativeBand>

        <InitiativeQuote intakeOpen={status === "open"}>
          {t.rich("quote", { br: () => <br /> })}
        </InitiativeQuote>

        <Gallery />
      </main>

      <SiteFooter />
    </>
  );
}
