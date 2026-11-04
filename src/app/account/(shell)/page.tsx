import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { CabinetIntro } from "@/components/account/CabinetIntro";
import { VolunteerCabinetAction } from "@/components/account/VolunteerCabinetAction";
import { StartApplicationButton } from "@/components/parent/StartApplicationButton";
import { canStartApplication } from "@/features/applications/authz";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { getResolvedSettings } from "@/features/settings/queries";
import { hasRole, isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.meta");
  return { title: t("title"), description: t("description") };
}

// /account is the header's one destination for everyone signed in, and where
// a sign-in with no `next` lands. Someone who holds a cabinet is sent to it:
// the parent side when they hold both, the volunteer side only when that is
// the only thing they are.
//
// Someone with NEITHER role stays here and chooses. They used to be sent to
// the parent cabinet on the guess that a new account came to file an
// application — which put a would-be volunteer in front of «Подати заявку»
// with nothing on the page saying they were in the wrong place. So this page
// offers both cabinets' own actions, and neither is guessed for them.
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/account"));
  }

  if (hasRole(actor, "parent")) {
    redirect("/account/parent");
  }
  if (hasRole(actor, "volunteer")) {
    redirect("/account/volunteer");
  }

  const t = await getTranslations("account.welcome");
  const tClosed = await getTranslations("parent.applications.closed");
  const [campaign, settings] = await Promise.all([
    getActiveCampaignForIntake(),
    getResolvedSettings(),
  ]);
  const canStart = canStartApplication(actor, { campaign, settings });

  return (
    <CabinetIntro
      title={t.rich("title", {
        em: (chunks) => <span className="text-primary">{chunks}</span>,
      })}
      body={t("body")}
      bodyWidth="lg:max-w-[560px]"
      action={
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            {canStart ? <StartApplicationButton variant="hero" /> : null}
            <VolunteerCabinetAction joined={false} />
          </div>
          {canStart ? null : (
            // The same sentence the parent cabinet shows in place of its
            // button: a family that came for help should learn why there is
            // no button for it, not just find one missing.
            <p role="status" className="text-muted-foreground max-w-[420px]">
              <span className="text-foreground block font-semibold">
                {tClosed("title")}
              </span>
              {tClosed("body")}
            </p>
          )}
        </div>
      }
    />
  );
}
