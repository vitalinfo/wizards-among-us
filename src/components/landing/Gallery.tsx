"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";

import { ArrowRightIcon } from "@/components/icons";
import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

import { nextScrollLeft } from "./galleryPaging";
import { SectionLabel } from "./SectionLabel";

// 25 of them, and the count is expected to keep growing — the families keep
// sending photos. Generated rather than listed, and the alt text is one
// numbered string rather than 25 written ones, so adding a photo is a file in
// public/ and a bump here. See the note on the alt below.
export const PHOTO_COUNT = 25;
const PHOTOS = Array.from({ length: PHOTO_COUNT }, (_, i) => String(i + 1));

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
      if (!el) {
        return;
      }
      // Measured, never derived. The snap position of a card is its offset
      // minus the row's scroll-padding, and both change with the breakpoint —
      // reading them back is shorter than restating them here, and cannot
      // disagree with the stylesheet.
      const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
      const left = el.getBoundingClientRect().left - el.scrollLeft;
      const offsets = [...el.children].map(
        (card) => card.getBoundingClientRect().left - left - pad,
      );
      animateTo(
        el,
        nextScrollLeft({
          scrollLeft: el.scrollLeft,
          maxScroll: el.scrollWidth - el.clientWidth,
          offsets,
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

      {/* Photos are sized by HEIGHT, with the width following the picture's
          own ratio — the opposite of everywhere else on this page, because
          height is the dimension that runs out. The design draws them 502x670
          in a 1920x1424 frame, where 670 is under half the viewport; on a
          laptop window 652px tall it is 103% of it, so you could never see a
          whole photo and the paging arrows sat off-screen below. The cap only
          bites when there genuinely is not room (photo + arrows + air ≈ 160px
          of chrome), so at any normal window the design's 502x670 is
          untouched. svh, not vh or dvh: vh uses the tallest viewport and
          clips on a phone, dvh resizes the cards as the URL bar collapses.

          The row runs off the right edge on purpose — the design shows a
          fourth photo half-visible, which is what says "there is more here".
          tabIndex makes the scroller reachable by keyboard: a scrollable
          region only a mouse can move is a real barrier, and unlike the arrows
          below it needs no JavaScript.

          scroll-padding is the GAP, not the page gutter. It decides where a
          snapped card comes to rest, and anything wider than the gap leaves a
          slice of the previous photo pinned to the left edge: at 24px against
          a 20px gap that was 4px of the last child, on every page. Zero from
          lg, where the row has no padding of its own, so a card lands flush
          with the copy above it and the one before it clears the edge by the
          full gap.

          pb-[15px] is room for the scrollbar. On a trackpad it is an overlay
          and paints inside the padding box, so without this it draws across
          the bottom of the photos. */}
      <ul
        ref={row}
        tabIndex={0}
        aria-label={t("region")}
        className="focus-visible:outline-ring -mx-4 mt-8 flex snap-x snap-mandatory scroll-pl-3 gap-3 overflow-x-auto px-4 pb-[15px] focus-visible:outline-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-20 lg:scroll-pl-0 lg:gap-5 lg:px-0"
      >
        {PHOTOS.map((key) => (
          <li key={key} className="shrink-0 snap-start">
            {/* A numbered alt, at Vital's call, because 25 hand-written
                descriptions would be guesses from thumbnails that nobody can
                verify or will maintain — and a wrong description of a real
                child's photo is worse than none. Worth knowing what it costs:
                "Галерея фото №7" tells a screen-reader user nothing the
                heading has not already said, so it is noise rather than
                access. If we are not going to describe them, alt="" is the
                better of the two — the row is already a labelled group, and
                the reader would skip the images instead of announcing 25
                empty labels. One line either way. */}
            <Image
              src={`/gallery-${key}.webp`}
              alt={t("photoAlt", { n: key })}
              width={1004}
              height={1340}
              className="h-[404px] max-h-[max(240px,calc(100svh-160px))] w-auto rounded-[20px] lg:h-[670px]"
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
