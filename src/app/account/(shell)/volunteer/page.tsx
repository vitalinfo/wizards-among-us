import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

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
// The role is checked here as well as in the layout. A layout is not a
// security boundary (see the note there), and the cabinet nav greys out a
// cabinet you do not hold — but greying a link is UX, so the page itself
// refuses: someone who types the URL without the role goes to the explainer
// that tells them how to get it.
export default async function VolunteerCabinetPage() {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/account/volunteer"));
  }
  if (!canBrowseChildren(actor)) {
    // The role is self-serve, so send them where they can opt in rather than
    // showing a dead end.
    redirect("/volunteer");
  }

  const t = await getTranslations("account.volunteer");

  return (
    <CabinetIntro
      title={t.rich("title", {
        em: (chunks) => <span className="text-primary">{chunks}</span>,
      })}
      body={t("body")}
      action={
        // 64 tall at every width, which is what the design draws here — the
        // shared ctaBase grows to 78 from lg, and overriding that would put two
        // height utilities in one class string for Tailwind's emit order to
        // settle. Colours stay shared; only the geometry is local.
        <Link
          href="/account/volunteer/children"
          className={cn(
            ctaVariants.primary,
            "focus-visible:outline-ring inline-flex h-16 items-center justify-center gap-2 rounded-full px-8 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:px-14",
          )}
        >
          <span aria-hidden="true">🔍</span>
          {t("cta")}
        </Link>
      }
    />
  );
}
