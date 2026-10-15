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
    // than spill out of a fixed box. It does, below ~1250: the picture then
    // sits at the foot of a taller band and the section's own wash fills the
    // strip above it.
    <section className="relative isolate overflow-hidden bg-[#f4f9fb] lg:flex lg:min-h-[min(50vw,960px)] lg:items-center">
      {/* In the flow on a phone, where the design stacks the picture above the
          copy; from lg it lies behind the band and the copy sits on its right
          half.

          CROPPED to a portrait on a phone, not scaled down whole. The export
          is a 2:1 band with the figures on its left 53% and a clear wash on
          the right — the wash exists for the copy that sits beside them from
          lg, and on a phone the copy is underneath instead, so showing the
          whole file put 47% of nothing on screen and left Миколай 195px tall
          on a 390 phone. The design crops to roughly the left 40% at 4:5,
          which is Миколай and three of the four children at a size a phone
          can see; the fourth child goes off the right edge of the screen, the
          way the design takes it off the right edge of the frame.

          Its own 2:1 ratio at the band's WIDTH — never `h-full object-cover`,
          which ties the picture's scale to the band's height. The copy pushes
          the band past 50vw at the narrow end of lg, and cover answered that by
          scaling the whole illustration up: at 1024 the children grew back over
          the copy's left edge no matter how narrow the column was made. Width-
          driven, Миколай and the children end at 52.9% of the viewport at every
          width, which is the one thing the column's position is measured
          against.

          Pinned to the BOTTOM, because the figures stand on the export's
          bottom edge: the room the copy asks for opens above them, where the
          export is its own near-white wash and the band continues it. Capped at
          the 1920 frame so a very wide screen doesn't keep scaling the
          illustration into a column the container has stopped moving right —
          past ~3850 it would have caught up with it. */}
      <Image
        src={image}
        alt={imageAlt}
        width={2560}
        height={1280}
        sizes="100vw"
        className="aspect-4/5 w-full object-cover object-left lg:absolute lg:bottom-0 lg:left-0 lg:-z-10 lg:aspect-auto lg:max-w-[1920px] lg:object-fill"
      />

      <div className={cn(SITE_CONTAINER, "py-12 lg:py-15")}>
        {/* The column sits in the middle of the clear half, not the middle of
            the band, so the margin — not the width — fixes its right edge at
            the design's 1735.

            660, measured from where the lead BREAKS rather than from its ink.
            The design's first line is 636 wide and the next word would carry
            it to 674, so the column is somewhere in 637…673 — the ink alone
            only gives the lower bound. Below that range our text drops a word
            onto a third line; above it, the word comes back up and the line
            breaks a word later than drawn.

            And 660 as a FRACTION of the 1920 frame from lg, because the
            picture behind it is full-bleed: Миколай and the children reach
            52.9% of the export at their widest (that is the children's band,
            level with the lead), and everything that fixes the column's right
            edge — both gutters — is a percentage too. A fixed 660 therefore
            only cleared them at 1920: the left edge slid from 56% there to 26%
            at 1024, and the lead ran straight across the children. Fluid, the
            same arithmetic lands the left edge at 56% of EVERY width from lg
            up (100 − 5.2 − 4.94·0.896 − 34.38), so the clearance the design
            drew is the clearance everywhere. The copy sets in a narrower
            measure as the band narrows and the lead runs to three lines and
            then four, which is the band getting smaller rather than the text
            spilling out of it. */}
        <div className="mx-auto flex max-w-[660px] flex-col items-center gap-4.5 text-center lg:mr-[4.94%] lg:ml-auto lg:max-w-[min(34.38vw,660px)] lg:gap-8">
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
