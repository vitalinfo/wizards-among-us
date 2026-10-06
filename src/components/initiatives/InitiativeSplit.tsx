import Image from "next/image";
import type { ReactNode } from "react";

import { Blob } from "@/components/landing/Blob";
import { SectionLabel } from "@/components/landing/SectionLabel";
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
  label: string;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
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
        <div className="flex flex-col items-start gap-8 lg:gap-11">
          <div className="flex flex-col items-start gap-4.5 lg:gap-5">
            <SectionLabel>{label}</SectionLabel>
            <h2 className="font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:text-[min(4.17vw,80px)] lg:leading-[min(3.65vw,70px)]">
              {title}
            </h2>
          </div>
          <div className="flex flex-col gap-4.5">{children}</div>
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
            )}
          />
        </div>
      </div>
    </section>
  );
}
