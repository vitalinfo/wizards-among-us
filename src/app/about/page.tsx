import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

import {
  CommunityBanner,
  type BannerStat,
  Timeline,
  type Milestone,
} from "@/components/about";
import {
  InitiativeQuote,
  InitiativeSplit,
  InitiativeSteps,
  type Step,
} from "@/components/initiatives";
import { Gallery } from "@/components/landing/Gallery";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { Stats } from "@/components/landing/Stats";
import { BrandMark } from "@/components/site/BrandMark";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { SITE_CONTAINER } from "@/components/site/layout";
import { PageHero } from "@/components/site/PageHero";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SocialLinks } from "@/components/site/SocialLinks";
import { CtaLink } from "@/components/ui/CtaLink";
import { ctaShell } from "@/components/ui/ctaStyles";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";
import { yearsSince } from "@/lib/years";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about.meta");
  return { title: t("title"), description: t("description") };
}

const MILESTONES = ["displaced", "invasion", "today"] as const;
const BANNER_STATS = ["friends", "wizards", "families"] as const;

// Title-only cards: the design gives these a line each and no paragraph.
const BIRTH = [
  { key: "clothes", emoji: "👗" },
  { key: "dishes", emoji: "🍽️" },
  { key: "things", emoji: "💼" },
  { key: "asking", emoji: "✍️" },
  { key: "story", emoji: "❤️" },
] as const;

// «Про нас», from Figma 75:2 — the founder's account of how a chat of 35
// friends became the community. Public but noindex, like every page except
// «/» (§10).
//
// Written in the FIRST PERSON throughout, because the designer wrote it that
// way: this is Олена's story, not the project's prospectus, and switching it
// to «ми» would cost the page the only thing it has that the landing doesn't.
//
// Nothing here reads the database. The four figures in «За кожною цифрою
// стоять люди» are the landing's own `Stats`, so a correction lands on both
// pages at once; `years`/`since` are computed the same way the landing
// computes them.
export default async function AboutPage() {
  const t = await getTranslations("about");
  const tInit = await getTranslations("initiatives");
  const tNav = await getTranslations("common.nav");
  const tFooter = await getTranslations("common.footer");

  const milestones: Milestone[] = MILESTONES.map((key) => ({
    key,
    value: t(`timeline.items.${key}.value`),
    label: t(`timeline.items.${key}.label`),
  }));

  const bannerStats: BannerStat[] = BANNER_STATS.map((key) => ({
    key,
    value: t(`community.stats.${key}.value`),
    label: t(`community.stats.${key}.label`),
  }));

  const birth: Step[] = BIRTH.map((item) => ({
    key: item.key,
    emoji: item.emoji,
    title: t(`birth.items.${item.key}`),
  }));

  const em = (chunks: ReactNode) => (
    <span className="text-primary">{chunks}</span>
  );

  // The designer breaks these paragraphs at sentence boundaries, leaving a
  // third of the line empty — so the breaks are typed, not a consequence of a
  // width, and no max-width reproduces them. They are also only right at the
  // width they were drawn at: on a phone the same text reflows, and a break
  // after «вчинки.» there would leave a 40%-empty line. Hence a <br> that is
  // display:none until lg.
  //
  // next-intl tags must be paired, which is why the messages read `<br></br>`.
  const br = () => <br className="hidden lg:inline" />;

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
          title={t.rich("title", { em })}
          titleClassName="lg:max-w-[min(38.8vw,745px)]"
          // 500, not the 486 the ink measures: the widest line the design
          // draws is not the column, and at 486 the second sentence loses a
          // word onto a fourth line. Anything from 492 up reproduces the
          // drawn 409/485/486, so this sits clear of that edge.
          leadClassName="lg:max-w-[min(26.04vw,500px)]"
          lead={
            <>
              {/* ONE paragraph with a break inside it, not two. The design
                  gives the first sentence a line of its own from lg — it ends
                  at 409 of a 486 measure, so that is a typed break — and runs
                  the two together on a phone, where splitting them leaves
                  «році.» alone on a line. */}
              <p>
                {t.rich("intro.story", {
                  br,
                  b: (chunks) => <b className="font-bold">{chunks}</b>,
                })}
              </p>
              {/* The line the whole page turns on, and the design sets it
                  apart in the brand blue rather than leaving it as a third
                  paragraph. */}
              <p className="text-primary mt-3.5 font-semibold">
                {t("intro.third")}
              </p>
            </>
          }
          below={
            <SocialLinks
              instagramLabel={tFooter("instagram")}
              telegramLabel={tFooter("telegram")}
              telegramChatLabel={tFooter("telegramChat")}
              size={56}
              className="justify-center lg:justify-start"
            />
          }
          art={
            // The heart sits ON the portrait, bottom right, which is the one
            // place on the site it overlaps a photograph — so it is placed
            // here rather than baked into the export, and a swapped portrait
            // keeps it.
            <figure className="mx-auto w-full">
              <div className="relative">
                <Image
                  src="/about-founder.webp"
                  alt={t("portraitAlt")}
                  width={1722}
                  height={1502}
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="h-auto w-full rounded-3xl"
                />
                <BrandMark className="absolute right-[4.9%] bottom-[4.9%] h-[12.3%] w-auto" />
              </div>
              <figcaption className="text-muted-foreground mt-3 text-center text-sm leading-5 tracking-[-0.03em] lg:mt-4">
                {t.rich("portraitCaption", {
                  br: () => <br className="lg:hidden" />,
                  b: (chunks) => <b className="font-semibold">{chunks}</b>,
                })}
              </figcaption>
            </figure>
          }
        />

        <Timeline label={t("timeline.region")} items={milestones} />

        <InitiativeSplit
          image="/about-chat.webp"
          imageAlt={t("chat.imageAlt")}
          imageWidth={1522}
          imageHeight={1616}
          // 761 of the design's 848 column, left-aligned. The corner radius
          // the split gives its pictures is invisible here — this one is a
          // composition on white, not a photograph in a frame.
          imageClassName="lg:mx-0 lg:w-[89.7%]"
          label={t("chat.label")}
          title={t("chat.title")}
        >
          {/* Capped at 600, not the split's full 848 column: the designer
              sets this section's prose in a narrow measure beside the picture
              — the lead takes four balanced lines there and two long ones at
              the column's full width. */}
          <p className="text-muted-foreground text-xl leading-7 font-semibold tracking-[-0.03em] lg:max-w-[600px] lg:text-[26px] lg:leading-[30px]">
            {t.rich("chat.lead", {
              faint: (chunks) => (
                <span className="text-muted-faint">{chunks}</span>
              ),
            })}
          </p>
          <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:max-w-[600px] lg:text-lg">
            {t.rich("chat.friends", {
              em: (chunks) => (
                <span className="text-primary font-bold">{chunks}</span>
              ),
            })}
          </p>
          <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:max-w-[600px] lg:text-lg">
            {t("chat.closing")}
          </p>
        </InitiativeSplit>

        <InitiativeSteps
          label={t("birth.label")}
          title={t("birth.title")}
          subtitle={t.rich("birth.subtitle", {
            em: (chunks) => (
              <span className="text-primary font-bold">{chunks}</span>
            ),
          })}
          steps={birth}
          tone="cream-soft"
        />

        {/* No action: this band closes the chapter rather than asking for
            anything. The page's one ask is at the foot. */}
        <InitiativeQuote
          titleClassName="lg:text-[min(4.17vw,80px)] lg:leading-[min(3.65vw,70px)]"
          note={
            <p>
              {t.rich("quote.note", {
                br,
                em: (chunks) => (
                  <span className="text-primary font-bold">{chunks}</span>
                ),
              })}
            </p>
          }
        >
          {t.rich("quote.title", { em })}
        </InitiativeQuote>

        <CommunityBanner
          image="/about-community.webp"
          imageAlt={t("community.imageAlt")}
          label={t("community.label")}
          title={t("community.title")}
          statsLabel={t("community.region")}
          stats={bannerStats}
        >
          {/* 26/30 and 18/28 as FRACTIONS of the 1920 frame from lg, like the
              title and the stat figures above them, because this band's column
              is a fraction too — it has to be, or the copy lands on the
              children (see `CommunityBanner`). Fixed, the measure shrank while
              the type didn't and the design's two lines became three by 1512;
              scaled, the ratio of measure to type never changes, so the lead
              breaks where it is drawn to break at every width.

              Floored at 16/14, below which this stops being copy a stressed
              parent can read on a 1024 laptop. That floor is reached at
              ~1180, and from there down to 1024 the lead does take a third
              line — the one width where a 660 measure beside a half-width
              illustration was never going to hold two. */}
          <p className="text-muted-foreground text-xl leading-7 font-semibold tracking-[-0.03em] lg:text-[clamp(16px,1.354vw,26px)] lg:leading-[clamp(18.5px,1.5625vw,30px)]">
            {t.rich("community.lead", {
              faint: (chunks) => (
                <span className="text-muted-faint">{chunks}</span>
              ),
            })}
          </p>
          <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:text-[clamp(14px,0.9375vw,18px)] lg:leading-[clamp(21.8px,1.4583vw,28px)]">
            {t("community.note")}
          </p>
        </CommunityBanner>

        {/* The heading and the figures are two sections, because `Stats` is
            the landing's own row and owns its gutter — the same four figures,
            so a correction lands on both pages at once. */}
        <section className={cn(SITE_CONTAINER, "pt-15 lg:pt-25")}>
          <div className="mx-auto flex max-w-[691px] flex-col items-center gap-4.5 text-center lg:gap-8">
            <SectionLabel>{t("today.label")}</SectionLabel>
            <h2 className="font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:text-[min(4.17vw,80px)] lg:leading-[min(3.65vw,70px)]">
              {t("today.title")}
            </h2>
          </div>
        </section>
        <Stats
          years={yearsSince(SITE.foundedYear)}
          since={SITE.foundedYear}
          className="mt-8 pb-15 lg:mt-15 lg:pb-25"
        />

        {/* The page's one ask, and it is deliberately not «Подати заявку»:
            someone who has just read how the money is NOT pooled is being
            told how to help, so it points at the volunteer explainer rather
            than dropping them into a sign-in. */}
        <InitiativeQuote
          titleClassName="lg:text-[min(4.17vw,80px)] lg:leading-[min(3.65vw,70px)]"
          note={<p>{t.rich("closing.note", { br })}</p>}
          cta={
            <div className={cn(ctaShell, "mt-10 lg:mx-auto lg:mt-15")}>
              <CtaLink href="/volunteer" className="w-full whitespace-nowrap">
                {t("closing.cta")}
              </CtaLink>
            </div>
          }
        >
          {t.rich("closing.title", { em })}
        </InitiativeQuote>

        <Gallery title={t.rich("gallery.title", { br })} />
      </main>

      <SiteFooter />
    </>
  );
}
