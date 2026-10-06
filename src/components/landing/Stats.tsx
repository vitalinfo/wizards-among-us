"use client";

import { useTranslations } from "next-intl";

import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

const STATS = ["years", "gifts", "school", "wizards"] as const;
type StatKey = (typeof STATS)[number];

// "4+ роки" is not a constant: it is the years elapsed since the initiative
// started, computed per request. Both halves of that cell take the numbers as
// ICU arguments — and they are passed as STRINGS so the locale's number
// formatting leaves them alone (uk groups thousands with a space, which would
// render the year 2022 as "2 022").
export function Stats({
  years,
  since,
  only,
  className,
}: {
  years: number;
  since: number;
  // Which figures to show, in this order. The landing page shows all four;
  // the «Чарівний Миколай» page shows three of them — the design drops «305
  // до школи», which belongs to the other initiative. Same copy either way,
  // so the figures stay one set of keys rather than being restated per page.
  only?: readonly StatKey[];
  // Extra classes for the row itself. The landing runs it the full width of
  // the container; the initiative pages cap it, because the design draws a
  // three-figure row at 1200 of its 1920 rather than spread across the page.
  className?: string;
}) {
  const t = useTranslations("landing.stats");
  const shown = only ?? STATS;
  const args = {
    years: { count: String(years), since: String(since) },
  } as Partial<Record<(typeof STATS)[number], Record<string, string>>>;

  return (
    <section className={SITE_CONTAINER}>
      {/* Four cells, 400px each and hairline-divided on the desktop frame.
          They do not fit a phone and the design does not try to make them: it
          runs the row off the right edge to be swiped, with gaps instead of
          rules. `snap` turns that into a deliberate gesture rather than a
          drift, and the negative margin lets the row bleed into the gutter so
          a half-visible fourth cell signals there is more. */}
      <dl
        tabIndex={0}
        aria-label={t("region")}
        className={cn(
          "focus-visible:outline-ring -mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-3.5 overflow-x-auto px-4 sm:-mx-6 sm:scroll-pl-6 sm:px-6 lg:mx-0 lg:gap-0 lg:overflow-visible lg:px-[3.49%]",
          className,
        )}
      >
        {shown.map((key, i) => (
          <div
            key={key}
            className={cn(
              // flex-1 rather than a w-1/4: the cell count is the caller's
              // now, and a hardcoded quarter would leave a three-figure row
              // short of the container.
              "flex w-[205px] shrink-0 snap-start flex-col items-center text-center lg:w-auto lg:flex-1 lg:shrink lg:px-6 lg:py-[27px]",
              // A rule to the right of every cell but the last, which is how
              // the design draws it.
              i < shown.length - 1 && "lg:border-divider lg:border-r",
            )}
          >
            {/* A <dl> wants its <dt> first, and a screen reader should hear
                "4+" before "з 2022 року…" — so the pair is ordered visually
                with `order` and left alone semantically.

                The figure is 4.6875vw — the design's 90px over its 1920 —
                because the cells shrink with the page and the rules between
                them do not move: a fixed 90px put "2000+" at 247px wide in a
                166px cell just above the lg breakpoint, straight through the
                divider. */}
            <dt className="text-muted-foreground order-2 mt-6 text-sm leading-5 tracking-[-0.03em] lg:text-base">
              {t(`${key}.label`, args[key])}
            </dt>
            <dd className="text-muted-foreground order-1 text-[60px] leading-none tracking-[-0.03em] lg:text-[min(4.6875vw,90px)]">
              {t(`${key}.value`, args[key])}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
