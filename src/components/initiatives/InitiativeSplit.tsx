import Image from "next/image";
import type { ReactNode } from "react";

import { Blob } from "@/components/landing/Blob";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { BrandMark } from "@/components/site/BrandMark";
import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

// An illustration beside a block of prose — the shape each initiative page
// uses two or three times, with the picture on either side.
//
// `blob` is for the cut-out illustrations: those have no background of their
// own and the design floats them over the cream organic shape instead. The
// rectangular ones get `rounded-3xl` and no blob.
export function InitiativeSplit({
  image,
  imageAlt,
  imageWidth,
  imageHeight,
  side = "start",
  blob = false,
  // How much of the column the picture takes, when the design does not give
  // it the whole one. «Про нас» draws its chat composition at 761 of 848 and
  // left-aligned: the air around the ring of faces is part of the drawing.
  imageClassName,
  // The heart in the bottom-right corner. Two of these sections carry it —
  // /volunteer's «Для нас важливо…» and /parent's «Якщо немає відкритої
  // ініціативи» — where the prose is shorter than the picture beside it and
  // the design fills the corner it leaves with the mark, flush with the
  // container's right edge and level with the picture's foot. It is a flourish
  // in a gap, so it is a prop rather than the default: the sections whose two
  // columns are the same height have no such corner.
  mark = false,
  // The last thing in the prose column, pinned to its FOOT rather than left to
  // follow the paragraphs: /initiatives/family closes with the «не є
  // постійною» caveat on the blue canvas, and the design aligns the bottom of
  // that card with the bottom of the picture beside it. Trailing the prose it
  // sat 177px higher, which reads as the column simply having run out rather
  // than as the pair of them closing together.
  footer,
  label,
  title,
  children,
  className,
}: {
  image: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  // Which side the picture takes from lg. Stacked above the prose below it.
  side?: "start" | "end";
  blob?: boolean;
  imageClassName?: string;
  mark?: boolean;
  footer?: ReactNode;
  label: string;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  // Whether anything is pinned to the foot of the prose column — which is what
  // the column has to be stretched to the row for.
  const pinned = mark || Boolean(footer);

  return (
    // overflow-hidden for the reason the landing hero has it: the blob behind a
    // cut-out is deliberately wider than the picture, and nothing decorative
    // may leak a horizontal scrollbar onto a narrow screen.
    <section
      className={cn(
        SITE_CONTAINER,
        "overflow-hidden py-12 lg:py-20",
        className,
      )}
    >
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-6">
        {/* Prose FIRST in the DOM. On a phone the design stacks the text above
            the picture in both of these sections, and that is also the order a
            screen reader should get them in — the illustration carries none of
            the argument. From lg the picture takes whichever side it is given. */}
        {/* Stretched to the row when it carries the mark, so the prose starts
            at the picture's top edge — which is where the design starts it in
            both of these sections — and the mark can sit at the FOOT of the
            column, level with the picture's own, instead of a gap below the
            last line. Where the prose is the taller column (narrow lg) the
            stretch is a no-op and the mark simply follows the text. */}
        <div
          className={cn(
            "flex flex-col items-start gap-8 lg:gap-11",
            pinned && "lg:self-stretch",
          )}
        >
          <div className="flex flex-col items-start gap-4.5 lg:gap-5">
            <SectionLabel>{label}</SectionLabel>
            <h2 className="font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:text-[min(4.17vw,80px)] lg:leading-[min(3.65vw,70px)]">
              {title}
            </h2>
          </div>
          {/* Grows into the stretched column so that what is pinned below —
              the footer, or the mark when there is none — has free space to be
              pushed down through. */}
          <div
            className={cn(
              "flex w-full flex-col gap-4.5",
              pinned && "lg:flex-1",
            )}
          >
            {children}

            {/* LAST IN THE COLUMN, right-aligned — not absolutely placed in the
              corner of the grid. Pinned to the corner it reproduces the design
              at 1920 exactly and then sits ON the copy everywhere else: the
              prose column grows as it narrows, and it covered the last line of
              «Якщо немає відкритої ініціативи» at 1024, 1280 and 1440, coming
              clear only past 1600 — which is most of the laptops this is read
              on. In the flow it can't collide at any width, it keeps the right
              edge the design aligns it to, and at 1920 the column it closes is
              the same height as the picture, which is where the design has it.

              From lg only: the corner exists because the two columns are
              different heights, and below lg they are stacked.

              It takes the foot of the column only when nothing else does —
              with a footer the mark trails the paragraphs, which is where
              /initiatives/family draws it, just above its caveat card. */}
            {mark ? (
              <BrandMark
                className={cn(
                  "hidden h-[93px] w-auto self-end lg:block",
                  !footer && "lg:mt-auto",
                )}
              />
            ) : null}

            {footer ? <div className="lg:mt-auto">{footer}</div> : null}
          </div>
        </div>

        <div
          className={cn(
            "relative isolate",
            side === "start" && "lg:order-first",
          )}
        >
          {/* An explicit WIDTH, not inset-x-0. An <svg> is a REPLACED element,
              and `width: auto` on one of those ignores `right` and takes the
              intrinsic size instead — so inset-x-0 left this blob 865px wide
              inside a 720px wrapper and the document grew to match. Invisible
              on the pages whose blob sits inside something with
              overflow-hidden; a horizontal scrollbar at 768 on this one. */}
          {blob ? (
            <Blob className="text-cream absolute -bottom-[8%] -left-[8%] -z-10 h-[88%] w-[116%]" />
          ) : null}
          <Image
            src={image}
            alt={imageAlt}
            width={imageWidth}
            height={imageHeight}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className={cn(
              "mx-auto h-auto w-full",
              blob ? "lg:w-[83%]" : "rounded-3xl",
              imageClassName,
            )}
          />
        </div>
      </div>
    </section>
  );
}
