import { useTranslations } from "next-intl";

import type { InitiativeStatus } from "@/features/initiatives/catalog";
import { cn } from "@/lib/utils";

// The «Відбувається набір» / «Набір ще не відкрито» / «Набір завершено» chip.
//
// Shared between the initiative CARD and the initiative PAGE's hero, which is
// the whole reason it is a component: the three tone classes lived privately
// inside the card, and a second copy of them is how «Набір завершено» ends up
// green on one surface and grey on the other.
//
// Not SectionLabel: that one is a decorative section marker and is always the
// primary blue. This one carries STATE, and its colour is the information.
const TONES: Record<InitiativeStatus, string> = {
  open: "bg-status-open",
  soon: "bg-primary",
  closed: "bg-status-closed",
};

export function InitiativeStatusPill({
  status,
  className,
}: {
  status: InitiativeStatus;
  className?: string;
}) {
  const t = useTranslations("landing.initiatives");

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-[9px] text-sm leading-[14px] font-medium text-white lg:px-3 lg:py-3 lg:leading-5",
        TONES[status],
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}
