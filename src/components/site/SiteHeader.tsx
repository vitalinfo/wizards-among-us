import { isAdmin, isUser } from "@/lib/authz";
import { getSessionActor } from "@/lib/auth/session";

import { SiteHeaderClient } from "./SiteHeaderClient";

// Server entry for the site header: resolves the current session actor and hands
// the client header only what it may render. Admins sign in through /admin and
// are never a `user`, so they get a link to their own panel rather than a
// «Увійти» button that would send them somewhere they have already been.
// Pages import this; SiteHeaderClient is the "use client" island.
export async function SiteHeader() {
  const actor = await getSessionActor();
  const user = isUser(actor)
    ? { username: actor.username, firstName: actor.firstName }
    : null;
  return <SiteHeaderClient user={user} isAdmin={isAdmin(actor)} />;
}
