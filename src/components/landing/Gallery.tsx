"use client";

import { useTranslations } from "next-intl";
import { useCallback, useRef, type ReactNode } from "react";

import { ArrowRightIcon } from "@/components/icons";
import { SITE_CONTAINER } from "@/components/site/layout";
import {
  type GalleryPhoto,
  galleryPhotoHref,
} from "@/features/reviews/gallery";
import { cn } from "@/lib/utils";

import { nextScrollLeft } from "./galleryPaging";
import { SectionLabel } from "./SectionLabel";

const DURATION = 550;

const ARROW =
  "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring flex size-14 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:size-[73px]";

// Slow at both ends, quick through the middle — the shape that reads as one
// deliberate movement rather than a jump.
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// `title` overrides the heading only. «Про нас» closes with the same photos
// under a line of its own — «Все почалося з бажання бути поруч. А сьогодні
// поруч — тисячі людей.» — and the same label and subtitle underneath, so the
// override is one prop rather than a second copy of the section.
//
// The heading drops to 74/70 when it is overridden: the landing's six words
// fit two lines at 80, and this one is a sentence and a half.
//
// ReactNode, not string: the design gives each of those two sentences a line,
// which is a typed break — at 1000 the text of its own accord breaks after «А
// сьогодні» and leaves three words below. The caller passes `t.rich`.
//
// `photos` are families' photos with the gift, from reviews an admin put in
// the gallery (listGalleryPhotos — 20, reshuffled hourly), loaded by the page.
// None — an empty gallery, or no database — and the section is not drawn at
// all: a heading over an empty row promises photos that are not there.
export function Gallery({
  photos,
  title,
}: {
  photos: readonly GalleryPhoto[];
  title?: ReactNode;
}) {
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

  if (photos.length === 0) {
    return null;
  }

  return (
    <section className={cn(SITE_CONTAINER, "py-15 lg:py-25")}>
      <div
        className={cn(
          "mx-auto flex flex-col items-center gap-4.5 text-center lg:gap-11",
          title ? "max-w-[1000px]" : "max-w-[691px]",
        )}
      >
        <div className="flex flex-col items-center gap-4.5 lg:gap-5">
          <SectionLabel>{t("label")}</SectionLabel>
          <h2
            className={cn(
              "font-display text-[48px] leading-9 font-bold tracking-[-0.06em]",
              title
                ? "lg:text-[min(3.854vw,74px)] lg:leading-[min(3.646vw,70px)]"
                : "lg:text-[80px] lg:leading-[70px]",
            )}
          >
            {title ?? t("title")}
          </h2>
        </div>
        <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
          {t("subtitle")}
        </p>
      </div>

      {/* Photos are sized by HEIGHT, with the width following the 3:4 crop
          — the opposite of everywhere else on this page, because
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
        {photos.map((photo, index) => (
          <li key={photo.reviewId} className="shrink-0 snap-start">
            {/* A numbered alt, at Vital's call: these are families' own
                photos, arriving without a description, and a guessed one of
                a real child is worse than none. The number at least tells
                the photos apart.

                Cropped to the design's 3:4 (502x670) whatever the family
                sent: the row is sized by height, and photos of every shape
                would give it ragged widths — and, since their sizes are not
                stored, a row that reflows as each one loads. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- served by the consent-gated gallery photo route, not an optimizable static asset (as ReviewCard) */}
            <img
              src={galleryPhotoHref(photo)}
              alt={t("photoAlt", { n: index + 1 })}
              width={1004}
              height={1340}
              loading="lazy"
              decoding="async"
              className="aspect-[3/4] h-[404px] max-h-[max(240px,calc(100svh-160px))] w-auto rounded-[20px] object-cover lg:h-[670px]"
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
