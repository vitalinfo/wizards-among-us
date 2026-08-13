import { isUser } from "@/lib/authz";
import { getSessionActor } from "@/lib/auth/session";

import { SiteHeaderClient } from "./SiteHeaderClient";

// Server entry for the site header: resolves the current session actor and hands
// the client header only what it may render. Admins sign in through /admin — the
// public header shows the signed-out state for them, so only a Telegram user
// surfaces here. Pages import this; SiteHeaderClient is the "use client" island.
export async function SiteHeader() {
  const actor = await getSessionActor();
  const user = isUser(actor)
    ? { username: actor.username, firstName: actor.firstName }
    : null;
  return <SiteHeaderClient user={user} />;
}
