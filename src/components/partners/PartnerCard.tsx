import Image from "next/image";

import { Blob } from "@/components/landing/Blob";
import { cn } from "@/lib/utils";

import type { Partner } from "./partners";

// One partner: logo, name, one line of what they do, and a badge saying how
// long they have been here or which initiative they back.
//
// Presentational — the copy arrives already translated, so this stays a plain
// (non-async) leaf the way ClaimPhotos does, and a spec can render it.
export function PartnerCard({
  partner,
  name,
  description,
  badge,
  logoAlt,
  className,
}: {
  partner: Partner;
  name: string;
  description: string;
  badge: string;
  logoAlt: string;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "bg-surface relative isolate overflow-hidden rounded-3xl p-5 lg:min-h-[258px] lg:px-5 lg:pt-8 lg:pb-[74px]",
        className,
      )}
    >
      {/* The same organic shape as the hero and the initiative cards — the
          design's export for this card is the identical outline, equal to four
          decimal places once both are normalised by their viewBox, just drawn
          into a wider box. Decorative, clipped by the card, and behind
          everything. */}
      <Blob className="text-cream absolute -top-[70%] -right-[18%] -bottom-[70%] left-[42%] -z-10 -rotate-[170deg]" />

      {/* Pinned to the top-right corner from lg, which is where the design
          puts it. On a phone there is no corner to spare, so it sits in the
          flow above the logo — first in the DOM either way, so the order a
          screen reader reads is the order the eye takes it in. */}
      <span className="bg-primary text-primary-foreground mb-4 inline-flex w-fit items-center rounded-full p-2 text-sm leading-5 font-medium lg:absolute lg:top-8 lg:right-5 lg:mb-0">
        {badge}
      </span>

      <div className="flex flex-col gap-4 lg:mt-[58px] lg:flex-row lg:items-center lg:gap-6">
        {/* Width by SHAPE, not one width for all five. The design lays the
            four wordmarks out to a common 164px; Newsoft's mark is a disc, and
            giving it the wordmark width would render it as a 164px circle
            twice the height of its row. */}
        <Image
          src={partner.src}
          alt={logoAlt}
          width={partner.width}
          height={partner.height}
          className={cn(
            "h-auto shrink-0 object-contain",
            partner.shape === "disc"
              ? "w-[72px] lg:w-[92px]"
              : "w-[132px] lg:w-[164px]",
          )}
        />

        <div className="flex min-w-0 flex-col gap-3 lg:gap-3.5">
          <h3 className="text-lg leading-[30px] font-semibold tracking-[-0.03em] lg:text-2xl">
            {name}
          </h3>
          <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
            {description}
          </p>
        </div>
      </div>
    </li>
  );
}
