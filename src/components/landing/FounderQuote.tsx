"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

export function FounderQuote() {
  const t = useTranslations("landing.quote");

  return (
    // The illustration carries its own cream, and on a phone the text sits on
    // the part of it that is empty — so the section's background has to be the
    // same cream for the two to meet without a seam.
    <section className="bg-cream-warm relative isolate overflow-hidden">
      {/* Two different pictures, not one picture cropped two ways — which is
          why this is a <picture> and not next/image. On a phone the design
          turns the illustration on its side: rotated 90° clockwise, the girl
          sits above the bear and the 2:1 drawing becomes a 0.39 portrait that
          fills a tall box without magnifying anything. There is no way to
          express that as an object-position, and <picture> downloads exactly
          one of the two files.

          The phone file is baked rather than rotated in CSS: it is the same
          source turned and cropped to the window the design uses (fitted to
          their render — cover at 0.6, 69% of the horizontal overflow off the
          left), so the markup stays a plain image with no transform. It is
          also cut off just under the drawing. Turned on its side the file
          carries 519px of empty cream below the bear, and the design hides
          that by laying the quote ON TOP of the picture; here the picture is
          in the flow, so the same tail became a screen of blank page between
          the two.

          From lg the landscape original scales by WIDTH and is pinned to the
          BOTTOM — never object-cover. Cover scales by whichever axis needs
          more, and this section is taller than the picture's 2:1 at anything
          under ~1700px, so cover zoomed the girl until she was half the page
          and ran under the quote. Scaling by width keeps her the size the
          design drew her; the shortfall then appears at the TOP, where the
          picture's own edge is the same cream as the section and the seam is
          invisible.

          Capped at 1920 and centred, because the picture only stops growing
          when the page does. The drawing occupies the left 66% of the file
          and the quote sits in the right third, so on a 2560 display an
          uncapped picture reaches past the container's right edge and back
          under the words. */}
      <picture>
        <source media="(min-width: 1024px)" srcSet="/quote-scene.webp" />
        <img
          src="/quote-scene-mobile.webp"
          alt={t("sceneAlt")}
          width={601}
          height={1075}
          className="aspect-[601/1075] w-full object-cover lg:absolute lg:bottom-0 lg:left-1/2 lg:-z-10 lg:aspect-auto lg:h-auto lg:w-full lg:max-w-[1920px] lg:-translate-x-1/2 lg:object-fill"
        />
      </picture>

      <div className={cn(SITE_CONTAINER, "pb-11 lg:py-[min(5.26vw,101px)]")}>
        {/* The quote's WIDTH and TYPE are both proportional, for the same
          reason the hero's are: the drawing beside them scales with the
          viewport, and a fixed 522px column pinned to the right closed the
          gap and then crossed it — the bear was 89px under the text at 1512
          and 156px at 1280. 30.35% is the design's 522 over its 1720 content
          box, and 2.29vw is its 44px over 1920, so the gap between the
          drawing and the first letter stays the ~28px the design leaves. */}
        <figure className="flex flex-col gap-6 lg:ml-auto lg:w-[30.35%] lg:gap-[min(2.29vw,44px)]">
          <div className="flex flex-col gap-1 lg:gap-[min(2.29vw,44px)]">
            {/* Decorative opening mark. The design sets it in Caveat Brush,
                which we do not ship — Caveat's own « is the same gesture. */}
            <span
              aria-hidden="true"
              className="font-display text-[50px] leading-[42px] tracking-[-0.06em] lg:text-[min(5.21vw,100px)] lg:leading-[min(2.19vw,42px)]"
            >
              «
            </span>
            <blockquote className="font-display text-2xl leading-[26px] font-bold tracking-[-0.06em] lg:text-[min(2.29vw,44px)] lg:leading-[min(2.19vw,42px)]">
              {t("body")}
            </blockquote>
          </div>

          <figcaption className="flex items-start gap-3.5">
            <Image
              src="/olena-panchuk.webp"
              alt={t("avatarAlt")}
              width={224}
              height={224}
              className="size-14 shrink-0 rounded-full object-cover"
            />
            <div className="flex max-w-[239px] min-w-0 flex-col gap-1.5">
              <span className="block text-lg leading-4 font-semibold tracking-[-0.03em]">
                {t("author")}
              </span>
              <span className="text-muted-foreground block text-base leading-[18px] tracking-[-0.03em]">
                {t("role")}
              </span>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
