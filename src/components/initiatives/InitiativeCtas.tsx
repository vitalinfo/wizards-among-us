import { useTranslations } from "next-intl";

import { CtaLink } from "@/components/ui/CtaLink";
import { cn } from "@/lib/utils";

// The pair of actions every initiative page repeats — one for the family, one
// for the volunteer. The design puts them in the hero and again at the foot.
//
// BOTH follow the campaign (Vital): when intake is not open, neither is a
// link. I had left «Хочу стати Чарівником» live on the reasoning that a
// volunteer can register out of season and claim when the next campaign opens
// — his call is that an initiative with no campaign running offers no way in
// at all, and that it reads as a broken promise otherwise.
//
// Disabled BUTTONS rather than greyed-out links: a control that cannot be used
// should not be focusable, announced as a link, or followable by keyboard.
// The landing hero's shape, which is also the design's: stacked and full
// width up to 271px on a phone, a row from lg. 271 is what the mobile frame
// draws (a 271 wrapper inset 28 either side of a 328 column) and what
// Hero.tsx already uses, so the two surfaces behave the same.
//
// EQUAL widths in the row (Vital). The design draws them 291 and 309 —
// content-width around labels of different lengths — and a mismatched pair
// reads as an accident rather than a choice. `grid-flow-col auto-cols-fr`
// makes every column 1fr, and in a shrink-to-fit grid 1fr resolves to the
// widest item's max-content, so both end up as wide as «Хочу стати
// Чарівником» without that width being written down anywhere.
//
// `w-fit` keeps the row from inheriting its container: in the quote band the
// column runs to 1568px and 1fr of that would be two 780px buttons.
//
// The switch is at lg, not sm, for the reason the landing's is: the pair needs
// ~630px and a 640px viewport has 608 inside the gutter, so switching at sm
// would overflow by the width of the gap.
const ROW =
  "mx-auto grid w-full max-w-[271px] gap-3 lg:mx-0 lg:w-fit lg:max-w-none lg:grid-flow-col lg:auto-cols-fr";

const DISABLED =
  "bg-disabled text-disabled-foreground inline-flex h-16 items-center justify-center rounded-full px-11 text-base font-medium whitespace-nowrap lg:h-[78px] lg:text-xl";

export function InitiativeCtas({
  intakeOpen,
  className,
}: {
  intakeOpen: boolean;
  className?: string;
}) {
  const t = useTranslations("initiatives");

  if (!intakeOpen) {
    return (
      <div className={cn(ROW, className)}>
        <button type="button" disabled className={DISABLED}>
          {t("apply")}
        </button>
        <button type="button" disabled className={DISABLED}>
          {t("volunteer")}
        </button>
      </div>
    );
  }

  return (
    <div className={cn(ROW, className)}>
      <CtaLink href="/parent" variant="accent" className="whitespace-nowrap">
        {t("apply")}
      </CtaLink>
      <CtaLink href="/volunteer" className="whitespace-nowrap">
        {t("volunteer")}
      </CtaLink>
    </div>
  );
}
