import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { becomeVolunteerAction } from "@/app/volunteer/actions";
import { buttonBase, buttonVariants } from "@/components/ui/buttonStyles";
import { hasRole, isUser } from "@/lib/actor";
import { getSessionActor } from "@/lib/auth/session";

const CTA = `${buttonBase} ${buttonVariants.primary} w-full`;

// The volunteer entry point's call to action, resolved server-side because it
// depends on the session. Three states, in the order someone moves through them:
//
//   anonymous          → sign in (returning here afterwards)
//   signed in, no role → opt in; the role is self-serve (Phase 6 decision),
//                        because nothing else grants it and canBrowseChildren
//                        requires it
//   volunteer          → browse
//
// This replaced a button that went nowhere.
export async function VolunteerCta() {
  const t = await getTranslations("volunteer");
  const actor = await getSessionActor();

  if (!isUser(actor)) {
    return (
      <Link href="/login?next=%2Fvolunteer" className={CTA}>
        {t("signInCta")}
      </Link>
    );
  }

  if (!hasRole(actor, "volunteer")) {
    return (
      <form action={becomeVolunteerAction} className="w-full">
        <input type="hidden" name="next" value="/volunteer/children" />
        <button type="submit" className={CTA}>
          {t("joinCta")}
        </button>
      </form>
    );
  }

  // Already a volunteer: browsing AND their own children. Without the second
  // link, "Мої діти" was reachable only by the one-time redirect right after
  // claiming — close the tab and it was gone.
  return (
    <div className="flex w-full flex-col gap-2.5">
      <Link href="/volunteer/children" className={CTA}>
        {t("browseCta")}
      </Link>
      <Link
        href="/volunteer/claims"
        className={`${buttonBase} ${buttonVariants.outline} w-full`}
      >
        {t("myClaimsCta")}
      </Link>
    </div>
  );
}
