import { useTranslations } from "next-intl";

import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

import { PartnerCard } from "./PartnerCard";
import { PARTNERS } from "./partners";
import { SectionHeading } from "./SectionHeading";

export function PartnersList() {
  const t = useTranslations("partners.list");
  const shown = PARTNERS.filter((partner) => !partner.hidden);

  return (
    // The soft blue canvas the public pages sit on — the only section of this
    // page that leaves white.
    <section className="bg-canvas">
      <div className={cn(SITE_CONTAINER, "py-15 lg:py-25")}>
        <SectionHeading
          label={t("label")}
          title={t("title")}
          subtitle={t("subtitle")}
        />

        {/* A horizontal scroller below lg, a two-column grid from it.

            The scroller is the design's own mobile layout — 287px cards
            running past the edge of the 360px frame — and the same shape as
            the landing gallery's row, down to the 15px of bottom padding that
            keeps the scrollbar off the cards.

            It bleeds to the screen edges (-mx-4/px-4) and then puts the page
            gutter back with scroll-pl. Without that the padding only holds at
            rest: `scroll-padding: auto` snaps each card flush to the scrollport
            edge, so the moment you scroll, the gutter is gone and the card
            touches the screen. scroll-pl EQUALS the gap on purpose — wider and
            a sliver of the previous card stays on screen, which is the bug the
            gallery shipped with for a day.

            From lg the odd card at the end of the grid centres under the pair
            above it. `col-span-2` plus a half-width cap does that without
            knowing the count — and it reads the VISIBLE list, so hiding a
            partner or adding one re-centres the tail on its own. */}
        <ul className="-mx-4 mt-8 flex snap-x snap-mandatory scroll-pl-4 gap-4 overflow-x-auto px-4 pb-[15px] sm:-mx-6 sm:scroll-pl-6 sm:gap-6 sm:px-6 lg:mx-0 lg:mt-20 lg:grid lg:scroll-pl-0 lg:grid-cols-2 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0">
          {shown.map((partner, i) => (
            <PartnerCard
              key={partner.key}
              partner={partner}
              name={t(`items.${partner.key}.name`)}
              description={t(`items.${partner.key}.description`)}
              badge={t(`items.${partner.key}.badge`)}
              logoAlt={t("logoAlt", { name: t(`items.${partner.key}.name`) })}
              // The card's width from lg is decided HERE, not in the card,
              // so exactly one `lg:w-*` ever reaches it: `cn` is a plain join
              // rather than tailwind-merge, and two of them would be settled
              // by Tailwind's emit order instead of by intent.
              className={
                i === shown.length - 1 && shown.length % 2 === 1
                  ? "lg:col-span-2 lg:w-[calc(50%-12px)] lg:justify-self-center"
                  : "lg:w-auto"
              }
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
