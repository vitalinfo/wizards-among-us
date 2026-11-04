import { useTranslations } from "next-intl";
import Link from "next/link";

import { becomeVolunteerAction } from "@/app/volunteer/actions";
import { ctaVariants } from "@/components/ui/ctaStyles";
import { cn } from "@/lib/utils";

// The volunteer cabinet's one action (Figma 109:2): «Обрати мрію» for someone
// who has joined, «Хочу стати Чарівником» — the self-serve opt-in, which grants
// the role and opens the children — for someone who has not. Shared with the
// account's front page, which offers the opt-in to someone with no role yet.
//
// Whether they have joined is the caller's to say (canBrowseChildren); the
// pages behind both destinations check the role themselves.
export function VolunteerCabinetAction({ joined }: { joined: boolean }) {
  const t = useTranslations("account.volunteer");
  const tInitiatives = useTranslations("initiatives");

  // 64 tall at every width, which is what the design draws here — the shared
  // ctaBase grows to 78 from lg, and overriding that would put two height
  // utilities in one class string for Tailwind's emit order to settle.
  // Colours stay shared; only the geometry is local.
  const cta = cn(
    ctaVariants.primary,
    "focus-visible:outline-ring inline-flex h-16 items-center justify-center gap-2 rounded-full px-8 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:px-14",
  );

  if (joined) {
    return (
      <Link href="/account/volunteer/children" className={cta}>
        <span aria-hidden="true">🔍</span>
        {t("cta")}
      </Link>
    );
  }

  // A form, not a link: joining is a write. Works with no JS.
  return (
    <form action={becomeVolunteerAction}>
      <input type="hidden" name="next" value="/account/volunteer/children" />
      <button type="submit" className={cta}>
        {tInitiatives("volunteer")}
      </button>
    </form>
  );
}
