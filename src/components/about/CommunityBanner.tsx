import Image from "next/image";
import type { ReactNode } from "react";

import { SectionLabel } from "@/components/landing/SectionLabel";
import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

export type BannerStat = { key: string; value: string; label: string };

// «Маленька ініціатива стала спільнотою»: the one full-bleed band on the page,
// with Святий Миколай at the left and the copy over the empty right half.
//
// The illustration carries its OWN background — a 2:1 export whose right side
// is a near-white wash the designer left clear for exactly this text. So it is
// the band's background rather than a figure placed on one, and the section's
// own colour exists only to continue that wash below the picture on a phone,
// where the two stack. #f4f9fb is sampled from the export's right edge; it is
// one use, so it stays an arbitrary value rather than becoming a token.
export function CommunityBanner({
  image,
  imageAlt,
  label,
  title,
  children,
  statsLabel,
  stats,
}: {
  image: string;
  imageAlt: string;
  label: string;
  title: ReactNode;
  children: ReactNode;
  statsLabel: string;
  stats: readonly BannerStat[];
}) {
  return (
    // min-h rather than an aspect ratio: the export is 2:1 and the design
    // shows all of it, so the band is half as tall as it is wide — but if the
    // copy ever needs more room than that it must push the band taller rather
    // than spill out of a fixed box.
    <section className="relative isolate overflow-hidden bg-[#f4f9fb] lg:flex lg:min-h-[min(50vw,960px)] lg:items-center">
      {/* In the flow on a phone, where the design stacks the picture above the
          copy; from lg it covers the band and the copy sits on its right half.
          object-left keeps Миколай in frame as the band narrows — object-cover
          centres by default, which crops him in half at 1024. */}
      <Image
        src={image}
        alt={imageAlt}
        width={2560}
        height={1280}
        sizes="100vw"
        className="w-full lg:absolute lg:inset-0 lg:-z-10 lg:h-full lg:object-cover lg:object-left"
      />

      <div className={cn(SITE_CONTAINER, "py-12 lg:py-15")}>
        {/* The design's column is 636 wide centred on 73.8% of its 1920 frame
            — the middle of the clear half, not the middle of the band. */}
        <div className="mx-auto flex max-w-[636px] flex-col items-center gap-4.5 text-center lg:mr-[4.94%] lg:ml-auto lg:gap-8">
          <SectionLabel>{label}</SectionLabel>
          <h2 className="font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:text-[min(4.17vw,80px)] lg:leading-[min(3.65vw,70px)]">
            {title}
          </h2>
          <div className="flex flex-col gap-4.5">{children}</div>

          <dl
            aria-label={statsLabel}
            className="mt-4 flex w-full items-start justify-center gap-8 lg:mt-8 lg:gap-15"
          >
            {stats.map((stat) => (
              <div key={stat.key} className="flex flex-col items-center">
                {/* The DOM keeps the pair the way a description list means
                    it — «Друзів» is the term, «35» describes it — and `order`
                    puts the figure on top visually. So a screen reader hears
                    «Друзів, 35» while the eye reads the number first, which
                    is the landing stats row's arrangement too. */}
                <dt className="text-muted-foreground order-2 mt-2 text-sm leading-5 tracking-[-0.03em] lg:text-base">
                  {stat.label}
                </dt>
                <dd className="text-muted-foreground order-1 text-[40px] leading-none tracking-[-0.03em] lg:text-[min(3.33vw,64px)]">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
