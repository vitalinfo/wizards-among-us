import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { CabinetIntro } from "@/components/account/CabinetIntro";
import { StartApplicationButton } from "@/components/parent/StartApplicationButton";
import { canStartApplication } from "@/features/applications/authz";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { getResolvedSettings } from "@/features/settings/queries";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.meta");
  return { title: t("title"), description: t("description") };
}

export const dynamic = "force-dynamic";

// «Кабінет Родин ВПО», from Figma 136:3530 — the front page of the parent's
// cabinet, and where /account lands a family.
//
// No role check beyond being signed in: the parent role is granted on a first
// SUBMIT, so this is exactly the page someone without it needs to reach.
// Starting an application is open to any signed-in person (canStartApplication),
// and the action re-checks that itself.
export default async function ParentCabinetPage() {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/account/parent"));
  }

  const t = await getTranslations("account.parent");
  const tClosed = await getTranslations("parent.applications.closed");
  const [campaign, settings] = await Promise.all([
    getActiveCampaignForIntake(),
    getResolvedSettings(),
  ]);

  return (
    <CabinetIntro
      title={t.rich("title", {
        em: (chunks) => <span className="text-primary">{chunks}</span>,
        br: () => <br />,
      })}
      body={t("body")}
      // Breaks after «на участь в», as the frame does: at the volunteer
      // page's 670 the line ran on through «ініціативах та».
      bodyWidth="lg:max-w-[560px]"
      action={
        canStartApplication(actor, { campaign, settings }) ? (
          <StartApplicationButton variant="hero" />
        ) : (
          // The design only draws the open state. A button the action would
          // refuse is worse than a sentence saying why there is none.
          <p role="status" className="text-muted-foreground max-w-[420px]">
            <span className="text-foreground block font-semibold">
              {tClosed("title")}
            </span>
            {tClosed("body")}
          </p>
        )
      }
    />
  );
}
