import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { becomeVolunteerAction } from "@/app/volunteer/actions";
import { CabinetIntro } from "@/components/account/CabinetIntro";
import { ctaVariants } from "@/components/ui/ctaStyles";
import { cn } from "@/lib/utils";
import { canBrowseChildren } from "@/lib/authz";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.meta");
  return { title: t("title"), description: t("description") };
}

export const dynamic = "force-dynamic";

// «Кабінет Чарівника», from Figma 109:2 — the front page of the volunteer's
// cabinet, and what the header's account button lands a volunteer on.
//
// Open to everyone signed in, like the parent cabinet (Vital): the sidebar no
// longer greys a cabinet out by role. What changes is the button. Someone who
// has not joined gets «Хочу стати Чарівником», the same self-serve opt-in as
// on «Волонтерам» (becomeVolunteerAction), which grants the role and opens the
// children; a volunteer gets «Обрати мрію». Browsing and claiming still
// require the role — those pages check it themselves (canBrowseChildren).
export default async function VolunteerCabinetPage() {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/account/volunteer"));
  }
  const joined = canBrowseChildren(actor);

  const t = await getTranslations("account.volunteer");
  const tInitiatives = await getTranslations("initiatives");

  // 64 tall at every width, which is what the design draws here — the shared
  // ctaBase grows to 78 from lg, and overriding that would put two height
  // utilities in one class string for Tailwind's emit order to settle.
  // Colours stay shared; only the geometry is local.
  const cta = cn(
    ctaVariants.primary,
    "focus-visible:outline-ring inline-flex h-16 items-center justify-center gap-2 rounded-full px-8 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:px-14",
  );

  return (
    <CabinetIntro
      title={t.rich("title", {
        em: (chunks) => <span className="text-primary">{chunks}</span>,
      })}
      body={t("body")}
      action={
        joined ? (
          <Link href="/account/volunteer/children" className={cta}>
            <span aria-hidden="true">🔍</span>
            {t("cta")}
          </Link>
        ) : (
          // A form, not a link: joining is a write. Works with no JS.
          <form action={becomeVolunteerAction}>
            <input
              type="hidden"
              name="next"
              value="/account/volunteer/children"
            />
            <button type="submit" className={cta}>
              {tInitiatives("volunteer")}
            </button>
          </form>
        )
      }
    />
  );
}
