import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";

import { logout } from "@/app/auth/actions";
import { CloseIcon, MenuIcon, SignOutIcon } from "@/components/icons";
import { SITE_CONTAINER } from "@/components/site/layout";
import { SiteLogo } from "@/components/site/SiteLogo";
import { cn } from "@/lib/utils";

import { AccountNav, type Cabinet } from "./AccountNav";

const ROUND =
  "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring inline-flex size-10 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:size-[60px]";

// The account area's own chrome. NOT SiteHeader: the design strips the site
// nav out entirely here — no «Про нас», no «Контакти» — and leaves the logo,
// a kicker, and one round button. Someone inside their cabinet is not being
// marketed to.
//
// That round button is sign-out on desktop and the menu toggle on a phone,
// where the sidebar collapses into a panel. Which means sign-out has nowhere
// to live on a phone in the design as drawn, so it goes at the FOOT of that
// panel — flagged, because it is the one thing here the design does not say.
export function AccountShell({
  cabinets,
  identity,
  children,
}: {
  cabinets: readonly Cabinet[];
  identity: string | null;
  children: ReactNode;
}) {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");

  const signOut = (
    <form action={logout}>
      <button type="submit" aria-label={tCommon("signOut")} className={ROUND}>
        <SignOutIcon className="size-5 lg:size-6" />
      </button>
    </form>
  );

  return (
    <>
      <header className={cn(SITE_CONTAINER, "relative z-40")}>
        <div className="flex h-14 items-center justify-between gap-4 lg:h-[107px]">
          {/* The kicker sits left of the logo on the desktop frame and is not
              drawn on a phone, where the row has no room for it beside the
              logo and the toggle. */}
          <span className="hidden flex-1 text-sm font-semibold tracking-[0.08em] uppercase lg:inline">
            {t("kicker")}
          </span>

          <Link
            href="/"
            aria-label={tCommon("brand")}
            className="focus-visible:outline-ring shrink-0 rounded"
          >
            <SiteLogo
              width={135}
              height={135}
              priority
              className="h-12 w-auto lg:h-[103px]"
            />
          </Link>

          <div className="flex flex-1 justify-end">
            {/* Sign-out from lg, where the sidebar is always on screen. */}
            <div className="hidden lg:block">{signOut}</div>

            {/* A <details>, so the panel opens with no JavaScript and the
                keyboard and screen-reader behaviour come from the element —
                the same reason the site header's menu is one. The <summary>
                IS the close button: open, the burger swaps to an ×, and
                because the summary stays put the × lands where the design
                draws it. */}
            <details className="group lg:hidden">
              <summary
                aria-label={t("nav.menu")}
                className={cn(
                  ROUND,
                  "relative z-60 cursor-pointer list-none [&::-webkit-details-marker]:hidden",
                )}
              >
                <MenuIcon className="size-5 group-open:hidden" />
                <CloseIcon className="hidden size-5 group-open:block" />
              </summary>

              <div className="bg-surface fixed inset-0 z-50 flex flex-col overflow-y-auto px-4 pt-4 pb-10">
                {/* The panel covers the header, so it carries its own logo —
                    otherwise the brand disappears the moment the menu opens,
                    and the design keeps it in frame. The same reason the site
                    header's panel repeats it. */}
                <Link
                  href="/"
                  aria-label={tCommon("brand")}
                  className="focus-visible:outline-ring mb-6 w-fit rounded"
                >
                  <SiteLogo width={135} height={135} className="h-12 w-auto" />
                </Link>

                <AccountNav cabinets={cabinets} identity={identity} />
                {/* The design gives a phone no sign-out at all — the round
                    button is the menu toggle there. It belongs with the rest
                    of the account controls rather than nowhere. */}
                <div className="mt-auto flex justify-center pt-10">
                  {signOut}
                </div>
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className={cn(SITE_CONTAINER, "flex flex-1 gap-6 pb-15 lg:pb-25")}>
        {/* 310 of the design's 1920, and only from lg — below it the same nav
            is the panel above. */}
        <AccountNav
          cabinets={cabinets}
          identity={identity}
          className="hidden w-[310px] shrink-0 pt-4 lg:flex"
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
