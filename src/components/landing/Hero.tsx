"use client";

import { useTranslations } from "next-intl";

import { SITE_CONTAINER } from "@/components/site/layout";
import { CtaLink } from "@/components/ui/CtaLink";
import { cn } from "@/lib/utils";

import { HeroArt } from "./HeroArt";

export function Hero() {
  const t = useTranslations("landing.hero");

  return (
    // isolate + overflow-hidden: the artwork is absolutely placed from lg and
    // its blob runs wider than the picture, so neither may leak a horizontal
    // scrollbar onto a narrow screen.
    <section className="relative isolate overflow-hidden">
      <div
        className={cn(
          SITE_CONTAINER,
          "pt-6.5 pb-15 lg:pt-[min(6.09vw,117px)] lg:pb-[min(6.93vw,133px)]",
        )}
      >
        {/* One column of 782 out of the design's 1720 content box. Below lg
            everything stacks and centres.

            Every vertical step from lg is in vw for the reason spelt out on
            the heading: the artwork beside this column is sized against the
            viewport, so anything here that stays a fixed pixel value pushes
            the column out of proportion with it as the window narrows. */}
        <div className="flex flex-col items-center text-center lg:max-w-[45.5%] lg:items-start lg:text-left">
          {/* Caveat, the display face. 120/100 with -0.06em tracking at the
              width the design was drawn at, 48/36 on a phone. Both
              line-heights are TIGHTER than the font size — that is what makes
              the three lines read as one hand-written block rather than three
              sentences.

              From lg the size is 6.25vw — the design's 120 over its 1920 —
              rather than a fixed 120, and the section's padding scales with
              it. A fixed 120 wrapped to FOUR lines on a 1440 laptop and
              pushed the promise card a long way below the bottom of the
              artwork, which is placed in vw and does shrink. Tying both to
              the same unit keeps the three-line wrap, and keeps the picture
              ending roughly level with the middle of the card — which is the
              composition. min() stops it growing past the design's 120 on a
              wider display. */}
          <h1 className="font-display text-[48px] leading-[36px] font-bold tracking-[-0.06em] lg:text-[min(6.25vw,120px)] lg:leading-[min(5.208vw,100px)]">
            {t.rich("title", {
              em: (chunks) => <span className="text-primary">{chunks}</span>,
            })}
          </h1>

          {/* The design caps this at 678px, where the sentence lands on two
              lines by 12 pixels — one word of copy editing away from three,
              which would push the buttons and the card down with it. Left to
              the column's full 782 instead: same two lines, with room. */}
          <p className="text-muted-foreground mt-3.5 text-sm leading-[18px] tracking-[-0.03em] lg:mt-[min(1.67vw,32px)] lg:text-base lg:leading-5">
            {t("subtitle")}
          </p>

          <div className="mt-8 flex w-full max-w-[271px] flex-col gap-3 lg:mt-[min(3.125vw,60px)] lg:max-w-none lg:flex-row">
            <CtaLink href="/parent" variant="accent">
              {t("parentCta")}
            </CtaLink>
            <CtaLink href="/volunteer">{t("volunteerCta")}</CtaLink>
          </div>

          {/* ONE element, placed two ways. On a phone the artwork sits in the
              flow between the buttons and the promise card, which is the
              design's mobile order. From lg it leaves the flow and is pinned
              to the SECTION (full-bleed, so its percentages are of the
              viewport): left 54.84% is the design's 1053 over 1920.

              The WIDTH is not a flat 35.9vw (the design's 689/1920), even
              though that is its proportion at the width it was drawn at. The
              copy beside it does not shrink linearly — the subtitle and the
              promise card are body text and stay legible rather than scaling
              — so a purely proportional picture ended well above the card as
              the window narrowed. This is the line through the three widths
              at which the picture's feet land on the middle of the card: 689
              at 1920, 566 at 1440, 526 at 1280, capped so it never grows past
              the design's 689. -24px puts its top at the design's y=83 — 24px
              above the bottom of the 107px header, which is transparent, so
              the picture passes behind it. Anchoring it to the section rather
              than to the copy is deliberate: the copy's height changes with
              the wording and would otherwise drag the picture with it. */}
          <HeroArt
            alt={t("imageAlt")}
            className="mt-6 w-full lg:pointer-events-none lg:absolute lg:top-[-24px] lg:left-[54.84%] lg:-z-10 lg:mt-0 lg:w-[min(25.63vw_+_197px,689px)]"
          />

          {/* The promise card: cream, 24px radius, first line bold. 29px of
              padding rather than a round 32 because the design's card is 419
              wide around 361 of text, and at 355 the body takes a fourth
              line. */}
          <div className="bg-cream-soft mt-6 w-full rounded-3xl px-5 py-6 text-left lg:mt-[min(3.59vw,69px)] lg:w-[419px] lg:px-[29px]">
            <p className="text-muted-foreground text-sm leading-5 font-bold tracking-[-0.03em] lg:text-base">
              {t("promise.title")}
            </p>
            <p className="text-muted-foreground mt-3 text-sm leading-5 tracking-[-0.03em] lg:text-base">
              {t("promise.body")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
