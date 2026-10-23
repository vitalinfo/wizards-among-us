import { redirect } from "next/navigation";

import { hasRole, isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

// /account is the header's one destination for everyone signed in, so it has
// to land them somewhere real. It sends them to the cabinet they hold, which
// is the decision `accountDestination` used to make for the header — now made
// once, here, where the account area can answer it.
//
// Someone with BOTH roles lands on the parent side, the same rule as before:
// the volunteer cabinet only when that is the only thing they are. Someone
// with NEITHER lands on the parent side too, because a brand-new Telegram
// account most likely came to file an application.
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/account"));
  }

  redirect(
    hasRole(actor, "volunteer") && !hasRole(actor, "parent")
      ? "/account/volunteer"
      : "/account/parent/applications",
  );
}
