import { useTranslations } from "next-intl";

import { CtaLink } from "@/components/ui/CtaLink";
import { cn } from "@/lib/utils";

// The pair of actions every initiative page repeats — one for the family, one
// for the volunteer. The design puts them in the hero and again at the foot.
//
// «Подати заявку» follows the SAME gate as the card's button: when intake is
// not actually open it becomes a disabled button rather than a greyed link,
// because a control that cannot be used should not be focusable or announced
// as a link. «Хочу стати Чарівником» is always live — a volunteer can sign up
// whether or not a campaign is taking applications.
export function InitiativeCtas({
  applyOpen,
  className,
}: {
  applyOpen: boolean;
  className?: string;
}) {
  const t = useTranslations("initiatives");

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:gap-3", className)}>
      {applyOpen ? (
        <CtaLink href="/parent" variant="accent" className="whitespace-nowrap">
          {t("apply")}
        </CtaLink>
      ) : (
        <button
          type="button"
          disabled
          className="bg-disabled text-disabled-foreground inline-flex h-16 items-center justify-center rounded-full px-11 text-base font-medium whitespace-nowrap lg:h-[78px] lg:text-xl"
        >
          {t("apply")}
        </button>
      )}
      <CtaLink href="/volunteer" className="whitespace-nowrap">
        {t("volunteer")}
      </CtaLink>
    </div>
  );
}
