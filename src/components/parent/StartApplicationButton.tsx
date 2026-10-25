import { useTranslations } from "next-intl";
import Link from "next/link";

import { ArrowDownIcon, PlusIcon } from "@/components/icons";
import { ctaVariants } from "@/components/ui/ctaStyles";
import { cn } from "@/lib/utils";

// «Подати заявку» — the parent cabinet's one action, drawn three ways by Figma
// 136:3530: a yellow pill on the cabinet's front page, a blue pill with an
// arrow at the foot of the desktop sidebar, and a blue text link with a plus in
// the phone menu.
//
// A LINK to the briefing («Перед заповненням анкети», Figma 147:7166), not the
// form that creates a draft: a family reads what an application needs before
// one exists. The briefing's own button is that form, and startApplication
// re-checks intake. Rendering this at all is the caller's call — see
// canStartApplication.
export type StartApplicationVariant = "hero" | "sidebar" | "panel";

const FOCUS =
  "focus-visible:outline-ring transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

// 64 tall at both widths, which is what the design draws — not ctaBase's 78
// from lg (see the volunteer cabinet's button for why the geometry is local).
const PILL = "inline-flex h-16 items-center justify-center rounded-full";

const VARIANTS: Record<StartApplicationVariant, string> = {
  // 192 wide on the phone frame, 235 from lg.
  hero: cn(ctaVariants.accent, PILL, "w-48 text-base font-medium lg:w-[235px]"),
  sidebar: cn(
    ctaVariants.primary,
    PILL,
    "w-[235px] gap-2.5 text-base font-medium",
  ),
  // One line: beside a long filter on a phone it would otherwise break
  // between «Подати» and «заявку».
  panel:
    "text-primary hover:text-primary-hover inline-flex items-center gap-2 rounded text-base leading-6 font-medium whitespace-nowrap",
};

export function StartApplicationButton({
  variant,
  className,
}: {
  variant: StartApplicationVariant;
  className?: string;
}) {
  const t = useTranslations("account.parent");

  return (
    <Link
      href="/account/parent/applications/new"
      className={cn(VARIANTS[variant], FOCUS, className)}
    >
      {variant === "panel" ? <PlusIcon className="size-5" /> : null}
      {t("cta")}
      {variant === "sidebar" ? <ArrowDownIcon className="size-6" /> : null}
    </Link>
  );
}
