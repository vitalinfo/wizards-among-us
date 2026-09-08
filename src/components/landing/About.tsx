"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

import { SectionLabel } from "./SectionLabel";

// Body paragraphs share their type: 16/22 on a phone, 18/22 from lg, with the
// design's -0.03em everywhere.
const BODY =
  "text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:text-lg";

// <b>, not <strong>: these are names set in bold for rhythm, not text of
// greater importance — which is the one thing <strong> means.
const bold = (chunks: ReactNode) => <b className="font-bold">{chunks}</b>;

export function About() {
  const t = useTranslations("landing.about");

  return (
    <section
      id="about"
      className={cn(
        SITE_CONTAINER,
        "relative scroll-mt-24 pt-[99px] pb-15 lg:pt-[163px] lg:pb-[180px]",
      )}
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-[2.56%]">
        {/* The picture leads on a wide screen and follows the prose on a
            phone — so it is ordered, not duplicated. Both crops come from one
            1200x960 source: 816x655 is very nearly its own aspect ratio, while
            the phone's 328x403 is portrait, and object-cover is exactly the
            "scale to fill, crop the sides" the design draws. */}
        <div className="order-2 aspect-[328/403] w-full shrink-0 overflow-hidden rounded-[20px] lg:order-1 lg:aspect-[816/655] lg:w-[47.44%] lg:rounded-[32px]">
          <Image
            src="/about-mykolai.webp"
            alt={t("imageAlt")}
            width={1200}
            height={960}
            className="size-full object-cover"
          />
        </div>

        <div className="order-1 flex flex-col gap-6 lg:order-2 lg:min-w-0 lg:flex-1 lg:gap-11">
          <div className="flex flex-col items-start gap-4.5 lg:gap-5">
            <SectionLabel>{t("label")}</SectionLabel>
            <h2 className="font-display max-w-[584px] text-[48px] leading-9 font-bold tracking-[-0.06em] lg:text-[80px] lg:leading-[70px]">
              {t("title")}
            </h2>
          </div>

          <div className="flex flex-col gap-3.5 lg:max-w-[637px] lg:gap-4.5">
            {/* The lead greys a clause back to 40% — an emphasis effect, not a
                de-emphasis of meaning, so the faded words stay in the same
                sentence and the same element. It is only legible because the
                type is 20-26px semibold; see --muted-faint. */}
            <p className="text-muted-foreground text-xl leading-6 font-semibold tracking-[-0.03em] lg:text-[26px] lg:leading-[30px]">
              {t.rich("lead", {
                dim: (chunks) => (
                  <span className="text-muted-faint">{chunks}</span>
                ),
              })}
            </p>
            <p className={BODY}>{t.rich("mykolai", { b: bold })}</p>
            <p className={BODY}>{t("scale")}</p>
            <p className={BODY}>{t.rich("tradition", { b: bold })}</p>
          </div>

          {/* The brand heart, at the foot of the prose column. The design
              floats it against the section's bottom-right corner, level with
              the last paragraph — but that only clears the text at the width
              it was drawn at, and below about 1800px it lands on top of the
              words. In the flow it cannot, and it reads the same. */}
          <Image
            src="/heart.svg"
            alt=""
            aria-hidden="true"
            width={84}
            height={93}
            className="hidden self-end lg:block"
          />
        </div>
      </div>
    </section>
  );
}
