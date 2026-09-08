"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { logout } from "@/app/auth/actions";
import { UserIcon } from "@/components/icons";
import { SiteLogo } from "@/components/site/SiteLogo";

// The design's header nav. «Ініціативи» and «Партнерам» are in the Figma file
// but have no route, so they are not rendered — a nav item that goes nowhere is
// worse on every page than one that is absent. Add the page, add the key, add
// the line.
const NAV = [
  { key: "about", href: "/#about" },
  { key: "parents", href: "/parent" },
  { key: "volunteers", href: "/volunteer" },
] as const;

const PILL =
  "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

export function SiteHeaderClient({
  user,
  isAdmin = false,
}: {
  // The current Telegram user (for display), or null when signed out. Resolved
  // server-side by SiteHeader (the server entry that wraps this island).
  user: { username: string | null; firstName: string | null } | null;
  // An admin holds a session but is NOT a user, so `user` is null for them.
  // Showing them «Увійти» is a lie that leads somewhere confusing — they are
  // signed in, just not to this side of the app — so point at their own panel.
  isAdmin?: boolean;
}) {
  const t = useTranslations("common");

  return (
    // Transparent, not a coloured bar: the design lets the page canvas run
    // behind the header, and the logo overhangs its bottom edge.
    <header className="relative z-40">
      <div className="mx-auto flex w-full max-w-[1720px] items-center gap-4 px-5 py-4 sm:px-8 lg:py-6">
        {/* Three columns on desktop so the logo is centred on the PAGE rather
            than on whatever the nav happens to measure. */}
        <nav
          aria-label={t("nav.label")}
          className="hidden flex-1 items-center gap-6 lg:flex"
        >
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="hover:text-primary focus-visible:outline-ring rounded text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>

        <Link
          href="/"
          aria-label={t("brand")}
          className="focus-visible:outline-ring order-first shrink-0 rounded lg:order-none"
        >
          <SiteLogo
            width={135}
            height={100}
            priority
            className="h-14 w-auto lg:h-[100px]"
          />
        </Link>

        <div className="flex flex-1 items-center justify-end gap-4">
          <Link
            href="/#contacts"
            className="hover:text-primary focus-visible:outline-ring hidden rounded text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:inline"
          >
            {t("nav.contacts")}
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-base font-medium sm:inline">
                {/* A Telegram @username is optional; fall back to the first
                    name so the signed-in state always names *someone*, and only
                    then to a generic label. */}
                {user.username
                  ? `@${user.username}`
                  : (user.firstName ?? t("account"))}
              </span>
              <form action={logout}>
                <button type="submit" className={PILL}>
                  {t("signOut")}
                </button>
              </form>
            </div>
          ) : isAdmin ? (
            <Link href="/admin" className={PILL}>
              {t("adminPanel")}
            </Link>
          ) : (
            // ONE control, not a mobile copy and a desktop copy hidden from
            // each other by media query: two links with the same accessible
            // name is a duplicate in the a11y tree at any width where the CSS
            // has not loaded, and a needless second tab stop besides. The label
            // is always the accessible name; only its rendering collapses.
            <Link
              href="/login"
              aria-label={t("login")}
              className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring inline-flex size-11 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:size-[60px]"
            >
              <UserIcon className="size-5 lg:size-6" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
