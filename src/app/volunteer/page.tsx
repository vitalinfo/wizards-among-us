import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  InitiativeQuote,
  InitiativeSplit,
  InitiativeSteps,
  type Step,
} from "@/components/initiatives";
import { Gallery } from "@/components/landing/Gallery";
import { BlobArt } from "@/components/site/BlobArt";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { SITE_CONTAINER } from "@/components/site/layout";
import { PageHero } from "@/components/site/PageHero";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import {
  VolunteerCta,
  volunteerCtaState,
} from "@/components/volunteer/VolunteerCta";
import { getSessionActor } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("volunteer.info.meta");
  return { title: t("title"), description: t("description") };
}

// The call to action depends on the session.
export const dynamic = "force-dynamic";

const POINTS = ["meet", "story", "needs", "decide"] as const;

const STEPS = [
  { key: "choose", emoji: "✍️" },
  { key: "meet", emoji: "🙏" },
  { key: "help", emoji: "🪄", accent: true },
  { key: "stay", emoji: "❤️" },
] as const;

// «Волонтерам», from Figma 66:2 — the public explainer someone reads before
// becoming a Чарівник. Public but noindex, like every page except «/» (§10).
export default async function VolunteerPage() {
  const actor = await getSessionActor();
  const state = volunteerCtaState(actor);

  const t = await getTranslations("volunteer.info");
  const tVol = await getTranslations("volunteer");
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
            { label: t("breadcrumb") },
          ]}
          className={cn(SITE_CONTAINER, "pt-3.5 lg:pt-6")}
        />

        <PageHero
          title={t.rich("title", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
          titleClassName="lg:max-w-[min(28.2vw,541px)]"
          lead={t("lead")}
          leadClassName="lg:max-w-[min(33.34vw,640px)]"
          cta={<VolunteerCta state={state} />}
          below={
            // Tilted on a phone and square from lg, which is how the design
            // draws it — the same marginal-note treatment the school and
            // family heroes give their figures.
            <div className="bg-cream-soft mx-auto flex w-full max-w-[271px] rotate-9 flex-col items-center gap-2 rounded-3xl px-6 py-6 text-center lg:mx-0 lg:max-w-[541px] lg:rotate-0 lg:flex-row lg:gap-8 lg:px-9 lg:text-left">
              <span className="text-muted-foreground text-[52px] leading-none tracking-[-0.03em] lg:text-[80px]">
                {t("stat.value")}
              </span>
              <span className="text-muted-foreground text-sm leading-5 tracking-[-0.03em] lg:text-base">
                {t("stat.label")}
              </span>
            </div>
          }
          art={
            <BlobArt
              src="/volunteer-hero.webp"
              alt={t("heroAlt")}
              width={960}
              height={1200}
              className="lg:mx-auto lg:w-[71%]"
              blobClassName="-left-[8.5%] -top-[0.7%] h-[85%] w-[114%]"
            />
          }
        />

        <InitiativeSplit
          image="/volunteer-approach.webp"
          imageAlt={t("approach.imageAlt")}
          imageWidth={1720}
          imageHeight={2010}
          label={t("approach.label")}
          title={t.rich("approach.title", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        >
          {/* An ordered list, because the design numbers them 01–04 and they
              describe one sequence. The numerals are written out rather than
              left to a counter: they are set in the page's blue at four times
              the size of the line beside them, and `::marker` cannot be
              styled that far. */}
          <ol className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-6 lg:gap-x-8 lg:gap-y-8">
            {POINTS.map((point, i) => (
              <li key={point} className="contents">
                <span
                  aria-hidden="true"
                  className="text-primary text-[40px] leading-none tracking-[-0.03em] lg:text-[44px]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-muted-foreground text-sm leading-5 font-semibold tracking-[-0.03em] lg:text-base">
                  {t(`approach.points.${point}`)}
                </span>
              </li>
            ))}
          </ol>
        </InitiativeSplit>

        <InitiativeQuote
          cta={
            <VolunteerCta state={state} className="mt-10 lg:mx-auto lg:mt-15" />
          }
        >
          {t.rich("quote", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
            faint: (chunks) => (
              <span className="text-muted-faint">{chunks}</span>
            ),
          })}
        </InitiativeQuote>

        <InitiativeSteps
          label={t("steps.label")}
          title={t("steps.title")}
          subtitle={t("steps.subtitle")}
          steps={steps}
          tone="canvas"
          accentTone="primary"
        />

        {/* NOT in the design, and kept anyway: these are the rules a volunteer
            agrees to before seeing a child's letter and the photo of a child
            holding it, and this page is where they were stated. The exposure
            tiers in CLAUDE.md are a promise made to the parent; a volunteer
            who never reads them cannot keep it. */}
        <section className={cn(SITE_CONTAINER, "py-15 lg:py-25")}>
          <div className="bg-cream-soft mx-auto max-w-[691px] rounded-3xl px-5 py-6 lg:px-8 lg:py-8">
            <h2 className="text-lg leading-[30px] font-semibold tracking-[-0.03em] lg:text-2xl">
              {tVol("rulesCard.title")}
            </h2>
            <p className="text-muted-foreground mt-4.5 text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
              {tVol("rulesCard.body")}
            </p>
          </div>
        </section>

        <InitiativeQuote
          cta={
            <VolunteerCta state={state} className="mt-10 lg:mx-auto lg:mt-15" />
          }
        >
          {t.rich("closing", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </InitiativeQuote>

        <Gallery />
      </main>

      <SiteFooter />
    </>
  );
}
