import { useTranslations } from "next-intl";
import Link from "next/link";

import { becomeVolunteerAction } from "@/app/volunteer/actions";
import { ctaBase, ctaShell, ctaVariants } from "@/components/ui/ctaStyles";
import { type Actor, hasRole, isUser } from "@/lib/actor";
import { loginPathFor } from "@/lib/auth/returnPath";
import { cn } from "@/lib/utils";

// Where the visitor stands on the way to becoming a Чарівник. Three states, in
// the order someone moves through them:
//
//   anonymous → sign in (returning here afterwards)
//   candidate → signed in with no volunteer role; opt in. The role is
//               self-serve (Phase 6 decision), because nothing else grants it
//               and canBrowseChildren requires it
//   volunteer → browse
//
// Resolved from the actor by the page, ONCE, and passed to each of the three
// places the design repeats the button. getSessionActor is a database query
// and is not request-cached, so an async component rendered three times would
// be three round trips for one answer.
export type VolunteerCtaState = "anonymous" | "candidate" | "volunteer";

export function volunteerCtaState(actor: Actor | null): VolunteerCtaState {
  if (!isUser(actor)) {
    return "anonymous";
  }
  return hasRole(actor, "volunteer") ? "volunteer" : "candidate";
}

// The design draws one blue pill and labels it «Хочу стати Чарівником», and
// that label stands in every state (Vital) — only the destination moves.
//
// Naming the promise rather than the step is the point: «Увійти через
// Telegram» or «Стати чарівником» would make the page argue its case and then
// offer paperwork. A volunteer who is already one lands on the children they
// can help, which is what wanting to be a Чарівник means here.
export function VolunteerCta({
  state,
  className,
}: {
  state: VolunteerCtaState;
  className?: string;
}) {
  const t = useTranslations("initiatives");

  const pill = cn(ctaBase, ctaVariants.primary, "w-full");

  if (state === "candidate") {
    return (
      <form action={becomeVolunteerAction} className={cn(ctaShell, className)}>
        <input type="hidden" name="next" value="/volunteer/children" />
        <button type="submit" className={pill}>
          {t("volunteer")}
        </button>
      </form>
    );
  }

  return (
    <div className={cn(ctaShell, className)}>
      <Link
        href={
          state === "volunteer"
            ? "/volunteer/children"
            : loginPathFor("/volunteer")
        }
        className={pill}
      >
        {t("volunteer")}
      </Link>
    </div>
  );
}
