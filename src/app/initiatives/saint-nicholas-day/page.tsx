import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  InitiativeHero,
  InitiativeQuote,
  InitiativeSplit,
  InitiativeSteps,
  type Step,
} from "@/components/initiatives";
import { Gallery } from "@/components/landing/Gallery";
import { Stats } from "@/components/landing/Stats";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { SITE_CONTAINER } from "@/components/site/layout";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getCampaignStates } from "@/features/campaigns/queries";
import { initiativeStatus } from "@/features/initiatives/catalog";
import { getResolvedSettings } from "@/features/settings/queries";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";
import { yearsSince } from "@/lib/years";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("initiatives.mykolai.meta");
  return { title: t("title"), description: t("description") };
}

// Per request, for the recruitment state in the hero — and it keeps the DB out
// of the build. Both reads fail safe; see the initiatives index.
export const dynamic = "force-dynamic";

const STEP_EMOJI = ["✍️", "📄", "🪄", "🎁", "❤️"] as const;
const STEP_KEYS = ["letter", "wish", "read", "gift", "share"] as const;

// «Чарівний Миколай» — the first of the three initiative pages. A thin
// composer: every section is a shared component from components/initiatives,
// and the only thing particular to this page is the order and the copy.
export default async function MykolaiPage() {
  const [campaigns, settings] = await Promise.all([
    getCampaignStates(),
    getResolvedSettings(),
  ]);
  const status = initiativeStatus(campaigns, settings, "saint_nicholas_day");

  const t = await getTranslations("initiatives.mykolai");
  const tInit = await getTranslations("initiatives");
  const tNav = await getTranslations("common.nav");

  const steps: Step[] = STEP_KEYS.map((key, i) => ({
    key,
    emoji: STEP_EMOJI[i],
    title: t(`steps.items.${key}.title`),
    body: t(`steps.items.${key}.body`),
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
          title={t.rich("title", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        />

        {/* Three of the landing page's four figures, with the same copy — the
            design drops «305 до школи», which belongs to the other
            initiative. */}
        <Stats
          years={yearsSince(SITE.foundedYear)}
          since={SITE.foundedYear}
          only={["years", "gifts", "wizards"]}
          className="lg:mx-auto lg:max-w-[min(62.5vw,1200px)] lg:px-0"
        />

        <InitiativeSplit
          image="/initiative-mykolai-why.webp"
          imageAlt={t("why.imageAlt")}
          imageWidth={1118}
          imageHeight={864}
          label={t("why.label")}
          title={t("why.title")}
        >
          {/* A size up from the body, with the design's greyed-back middle
              clause. --muted-faint is large-text-only and this is 26px
              semibold, which is exactly the size it was reserved for. */}
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
        />

        {/* Picture on the right, and a cut-out rather than a rectangle — it
            has no background of its own, so it floats on the cream blob the
            way the hero's family does. */}
        <InitiativeSplit
          image="/initiative-mykolai-letter.webp"
          imageAlt={t("behind.imageAlt")}
          imageWidth={960}
          imageHeight={1200}
          side="end"
          blob
          label={t("behind.label")}
          title={t("behind.title")}
        >
          <p className="text-muted-foreground text-xl leading-7 font-semibold tracking-[-0.03em] lg:text-[26px] lg:leading-[30px]">
            {t("behind.lead")}
          </p>
          {(["p2", "p3", "p4"] as const).map((key) => (
            <p
              key={key}
              className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:text-lg"
            >
              {t(`behind.${key}`)}
            </p>
          ))}
        </InitiativeSplit>

        <InitiativeQuote intakeOpen={status === "open"}>
          {t("quote")}
        </InitiativeQuote>

        {/* The same photographs, label and heading as the landing gallery —
            the designer reuses the section wholesale, so the component is
            dropped in rather than re-cut. */}
        <Gallery />
      </main>

      <SiteFooter />
    </>
  );
}
