import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { isUser } from "@/lib/actor";
import {
  accountReturnPath,
  REQUEST_PATH_HEADER,
  signedOutRedirect,
} from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

// The guard for everything signed-in, and nothing else.
//
// It is split from the CHROME below it because not every page in here wears the
// chrome: `(shell)` is the cabinet — sidebar, header, the lot — and `(bare)` is
// for the screens the design draws full-page, like «Перед тим як стати
// Чарівником», which covers the sidebar rather than sitting inside it. Route
// groups do not appear in the url, so both halves stay under /account.
//
// The guard is here as well as on each page, not instead of it: a layout is not
// a security boundary — Next renders a page's own data fetching independently,
// and a layout that checked the session would not stop a page beneath it from
// loading data. Every page under here keeps its own `isUser` check and its own
// authz. This one exists so a signed-out visitor is bounced once, from the top,
// rather than by whichever page they happened to ask for.
export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    // This redirect runs before the page's own guard, so it must carry the
    // page's path: a hardcoded "/account" sent every deep link back to the
    // account's front page after sign-in. A layout has no url of its own, so
    // the middleware hands it over in a header.
    const returnTo = accountReturnPath(
      (await headers()).get(REQUEST_PATH_HEADER),
    );
    // An admin lands on /admin rather than a sign-in page they are past.
    redirect(signedOutRedirect(actor, returnTo));
  }
  return <>{children}</>;
}
