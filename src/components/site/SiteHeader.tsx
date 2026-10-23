import { accountDestination } from "@/features/users/account";
import { getSessionActor } from "@/lib/auth/session";

import { SiteHeaderClient } from "./SiteHeaderClient";

// Server entry for the site header: resolves the current session actor and
// hands the client header only what it may render — which, since the design
// settled on one round button with no name beside it, is a destination and
// nothing else. Who the person is never reaches the browser.
//
// Pages import this; SiteHeaderClient is the "use client" island.
export async function SiteHeader() {
  return (
    <SiteHeaderClient account={accountDestination(await getSessionActor())} />
  );
}
