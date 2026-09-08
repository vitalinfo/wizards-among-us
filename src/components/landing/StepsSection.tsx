"use client";

import { useTranslations } from "next-intl";

import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

import { SectionLabel } from "./SectionLabel";

// One step: the emoji the design puts in the disc, and the disc's fill. The
// design tints most discs and singles ONE out per section in a solid colour —
// the moment the two sides actually meet.
export type Step = {
  key: string;
  emoji: string;
  tone?: "soft" | "accent" | "primary";
};

const TONES = {
  soft: "bg-primary-soft",
  accent: "bg-accent",
  primary: "bg-primary",
} as const;

// The two "Як це працює" bands — «Для родин» on cream and «Для тих, хто хоче
// стати Чарівником» on the blue canvas. Same component: identical geometry,
// different background, heading and cards, and the design draws them that way
// too.
export function StepsSection({
  id,
  namespace,
  steps,
  columns,
  className,
}: {
  id: string;
  // Copy namespace under `landing` — "families" or "volunteers".
  namespace: string;
  steps: readonly Step[];
  // Grid track counts from lg. The two bands hold a different number of
  // cards, so they wrap differently — five go 3+2, four go 2+2.
  columns: string;
  // The band's background.
  className: string;
}) {
  const t = useTranslations(`landing.${namespace}`);

  return (
    <section
      id={id}
      className={cn("scroll-mt-24 py-15 lg:py-[180px]", className)}
    >
      <div className={SITE_CONTAINER}>
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

        {/* Scroller on a phone, GRID from lg — never a horizontal scrollbar
            on a desktop. Five cards at a width a sentence survives need about
            1220px of content box, which a 1025 viewport does not have (they
            came out at 164px each), so between lg and xl they wrap onto two
            rows instead and line up as the design's single row only from
            1280, where they are 210px and up. */}
        <ul
          tabIndex={0}
          aria-label={t("region")}
          className={cn(
            "focus-visible:outline-ring -mx-4 mt-8 flex snap-x snap-mandatory scroll-pl-4 items-stretch gap-3.5 overflow-x-auto px-4 sm:-mx-6 sm:scroll-pl-6 sm:px-6 lg:mx-0 lg:mt-15 lg:grid lg:gap-6 lg:overflow-visible lg:px-0",
            columns,
          )}
        >
          {steps.map((step) => (
            <li
              key={step.key}
              className="bg-surface flex w-[287px] shrink-0 snap-start flex-col gap-6 rounded-3xl px-5 py-8 lg:min-h-[308px] lg:w-auto"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-15 shrink-0 items-center justify-center rounded-full text-[28px] leading-[30px]",
                  TONES[step.tone ?? "soft"],
                )}
              >
                {step.emoji}
              </span>
              <div className="flex flex-col gap-4.5">
                <h3 className="text-muted-foreground text-2xl leading-[30px] font-semibold tracking-[-0.03em]">
                  {t(`steps.${step.key}.title`)}
                </h3>
                <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em]">
                  {t(`steps.${step.key}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
