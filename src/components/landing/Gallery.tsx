"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";

import { ArrowRightIcon } from "@/components/icons";
import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

import { nextScrollLeft } from "./galleryPaging";
import { SectionLabel } from "./SectionLabel";

const PHOTOS = ["1", "2", "3", "4"] as const;

// The design's gap between photos: 12px on a phone, 20px from lg.
const GAP = { base: 12, lg: 20 };

const DURATION = 550;

const ARROW =
  "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring flex size-14 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:size-[73px]";

// Slow at both ends, quick through the middle — the shape that reads as one
// deliberate movement rather than a jump.
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function Gallery() {
  const t = useTranslations("landing.gallery");
  const row = useRef<HTMLUListElement>(null);
  const frame = useRef(0);

  // Hand-animated rather than `scrollTo({behavior:"smooth"})`, for two
  // reasons. The native easing is not controllable, and its duration scales
  // with distance — so the wrap from the last photo back to the first (a full
  // row's width) crawled while a single step snapped. And scroll snapping
  // fights a programmatic scroll frame by frame, which is what made it judder;
  // snapping is switched off for the duration and restored at the end, so a
  // trackpad still snaps but the arrows glide.
  const animateTo = useCallback((el: HTMLElement, to: number) => {
    cancelAnimationFrame(frame.current);

    const from = el.scrollLeft;
    const distance = to - from;
    if (Math.abs(distance) < 1) {
      return;
    }

    // Someone who has asked for less motion gets the destination, not a ride.
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      el.scrollLeft = to;
      return;
    }

    const snap = el.style.scrollSnapType;
    el.style.scrollSnapType = "none";
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / DURATION, 1);
      el.scrollLeft = from + distance * easeInOutCubic(progress);
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        el.style.scrollSnapType = snap;
      }
    };
    frame.current = requestAnimationFrame(tick);
  }, []);

  const page = useCallback(
    (direction: 1 | -1) => {
      const el = row.current;
      const card = el?.firstElementChild;
      if (!el || !card) {
        return;
      }
      // Measured, not hardcoded: the photo is 303px on a phone and 502px from
      // lg, and reading it back keeps this right at both without a matchMedia.
      const gap = window.innerWidth >= 1024 ? GAP.lg : GAP.base;
      const step = card.getBoundingClientRect().width + gap;
      animateTo(
        el,
        nextScrollLeft({
          scrollLeft: el.scrollLeft,
          maxScroll: el.scrollWidth - el.clientWidth,
          step,
          direction,
        }),
      );
    },
    [animateTo],
  );

  return (
    <section className={cn(SITE_CONTAINER, "py-15 lg:py-25")}>
      <div className="mx-auto flex max-w-[691px] flex-col items-center gap-4.5 text-center lg:gap-11">
        <div className="flex flex-col items-center gap-4.5 lg:gap-5">
          <SectionLabel>{t("label")}</SectionLabel>
          <h2 className="font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:text-[80px] lg:leading-[70px]">
            {t("title")}
          </h2>
        </div>
        <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
          {t("subtitle")}
        </p>
      </div>

      {/* The row runs off the right edge on purpose — the design shows a
          fourth photo half-visible, which is what says "there is more here".
          tabIndex makes the scroller reachable by keyboard: a scrollable
          region only a mouse can move is a real barrier, and unlike the arrows
          below it needs no JavaScript. */}
      <ul
        ref={row}
        tabIndex={0}
        aria-label={t("region")}
        className="focus-visible:outline-ring -mx-4 mt-8 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto px-4 focus-visible:outline-2 sm:-mx-6 sm:scroll-pl-6 sm:px-6 lg:mx-0 lg:mt-20 lg:gap-5 lg:px-0"
      >
        {PHOTOS.map((key) => (
          <li key={key} className="shrink-0 snap-start">
            <Image
              src={`/gallery-${key}.webp`}
              alt={t(`photos.${key}`)}
              width={1004}
              height={1340}
              className="w-[303px] rounded-[20px] lg:w-[502px]"
            />
          </li>
        ))}
      </ul>

      {/* Neither arrow ever dead-ends: at the last photo "next" returns to the
          first, and at the first "previous" goes to the last. So neither is
          ever disabled, and the labels stay true. */}
      <div className="mt-4.5 flex justify-center gap-3 lg:mt-11 lg:gap-5">
        <button
          type="button"
          aria-label={t("prev")}
          onClick={() => page(-1)}
          className={ARROW}
        >
          <ArrowRightIcon className="size-6 rotate-180" />
        </button>
        <button
          type="button"
          aria-label={t("next")}
          onClick={() => page(1)}
          className={ARROW}
        >
          <ArrowRightIcon className="size-6" />
        </button>
      </div>
    </section>
  );
}
