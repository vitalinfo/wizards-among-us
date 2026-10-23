import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AccountShell, type Cabinet } from "@/components/account";
import { StartApplicationButton } from "@/components/parent/StartApplicationButton";
import { canStartApplication } from "@/features/applications/authz";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { getResolvedSettings } from "@/features/settings/queries";
import { hasRole, isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

// The cabinet's chrome: sidebar, header, sign-out. The auth guard is in the
// layout ABOVE this one, which covers `(bare)` as well — see it for why the two
// are split. This one repeats `isUser` only to narrow the actor's type and to
// keep the chrome from ever being drawn for a signed-out visitor.
export default async function AccountShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    // An admin lands on /admin rather than a sign-in page they are past.
    redirect(signedOutRedirect(actor, "/account"));
  }

  // The same gate the anketas page puts on its own button, so the sidebar
  // never offers an application the action would refuse.
  const [campaign, settings] = await Promise.all([
    getActiveCampaignForIntake(),
    getResolvedSettings(),
  ]);
  const canStart = canStartApplication(actor, { campaign, settings });

  // Which cabinets are open to this person; the design greys the other.
  //
  // The volunteer cabinet needs the role, which is opted into on «Волонтерам».
  // The parent cabinet is open to everyone signed in: the parent ROLE is only
  // granted on a first submit, so it cannot gate the place where that first
  // application is started — and anyone may start one (canStartApplication),
  // a volunteer with a child of their own included.
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
      href: "/account/parent",
      emoji: "👫",
      available: true,
      links: [
        {
          key: "applications",
          href: "/account/parent/applications",
          labelKey: "parent.links.applications",
          emoji: "📋",
        },
        {
          key: "volunteer",
          href: "/account/parent/my-volunteer",
          labelKey: "parent.links.volunteer",
          emoji: "🔮",
        },
      ],
      action: canStart
        ? {
            sidebar: <StartApplicationButton variant="sidebar" />,
            panel: <StartApplicationButton variant="panel" />,
          }
        : undefined,
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
