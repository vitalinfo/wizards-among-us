import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { CabinetIntro } from "@/components/account/CabinetIntro";
import { VolunteerCabinetAction } from "@/components/account/VolunteerCabinetAction";
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

  return (
    <CabinetIntro
      title={t.rich("title", {
        em: (chunks) => <span className="text-primary">{chunks}</span>,
      })}
      body={t("body")}
      action={<VolunteerCabinetAction joined={joined} />}
    />
  );
}
