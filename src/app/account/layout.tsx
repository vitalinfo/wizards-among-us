import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AccountShell, type Cabinet } from "@/components/account";
import { hasRole, isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

// The account area's shell, and its guard.
//
// The guard is here as well as on each page, not instead of it: a layout is not
// a security boundary — Next renders a page's own data fetching independently,
// and a layout that checked the session would not stop a page beneath it from
// loading data. Every page under here keeps its own `isUser` check and its own
// authz. This one exists so the CHROME is never drawn for a signed-out visitor
// and so they are bounced once, from the top, rather than by whichever page
// they happened to ask for.
export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    // An admin lands on /admin rather than a sign-in page they are past.
    redirect(signedOutRedirect(actor, "/account"));
  }

  // Which cabinets this person holds. The design greys the one they do not and
  // marks the one they do with a ✅, so the roles decide both. The parent
  // cabinet has no landing page of its own yet, so it points at the anketas,
  // which is what that cabinet currently contains.
  const cabinets: Cabinet[] = [
    {
      key: "volunteer",
      href: "/account/volunteer",
      emoji: "🔮",
      available: hasRole(actor, "volunteer"),
      links: [
        {
          key: "children",
          href: "/account/volunteer/children",
          labelKey: "volunteer.links.children",
          emoji: "🔍",
        },
        {
          key: "claims",
          href: "/account/volunteer/claims",
          labelKey: "volunteer.links.claims",
          emoji: "👧",
        },
      ],
    },
    {
      key: "parent",
      href: "/account/parent/applications",
      emoji: "👫",
      available: hasRole(actor, "parent"),
      links: [],
    },
  ];

  // No SiteFooter: the design does not draw one here, for the same reason the
  // header drops the site nav — someone inside their cabinet is not being
  // marketed to. It does cost the footer's link to the privacy policy, which
  // is the one thing in it a signed-in person might want.
  return (
    <AccountShell
      cabinets={cabinets}
      identity={actor.username ? `@${actor.username}` : null}
    >
      {children}
    </AccountShell>
  );
}
