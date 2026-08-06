import { isUser } from "@/lib/authz";
import { getSessionActor } from "@/lib/auth/session";

import { SiteHeader } from "./SiteHeader";

// Server wrapper: resolves the current session actor and hands SiteHeader only
// what it may render. Admins sign in through /admin — the public header shows the
// signed-out state for them, so only a Telegram user surfaces here.
export async function SiteHeaderServer() {
  const actor = await getSessionActor();
  const user = isUser(actor) ? { username: actor.username } : null;
  return <SiteHeader user={user} />;
}
