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
      <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
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
    <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      <CtaLink href="/parent" variant="accent" className="whitespace-nowrap">
        {t("apply")}
      </CtaLink>
      <CtaLink href="/volunteer" className="whitespace-nowrap">
        {t("volunteer")}
      </CtaLink>
    </div>
  );
}
