"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { logout } from "@/app/auth/actions";
import {
  CloseIcon,
  InstagramIcon,
  MenuIcon,
  TelegramIcon,
  UserIcon,
} from "@/components/icons";
import { SITE_NAV } from "@/components/site/nav";
import { SiteLogo } from "@/components/site/SiteLogo";
import { SITE } from "@/lib/site";

const PILL =
  "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

const ROUND =
  "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring inline-flex size-8 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:size-[60px]";

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

  const account = user ? (
    <div className="flex items-center gap-3">
      <span className="hidden text-base font-medium sm:inline">
        {/* A Telegram @username is optional; fall back to the first name so the
            signed-in state always names *someone*, and only then to a generic
            label. */}
        {user.username ? `@${user.username}` : (user.firstName ?? t("account"))}
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
    // ONE control, not a mobile copy and a desktop copy hidden from each other
    // by media query: two links with the same accessible name are a duplicate
    // in the a11y tree and a needless second tab stop.
    <Link href="/login" aria-label={t("login")} className={ROUND}>
      <UserIcon className="size-5 lg:size-6" />
    </Link>
  );

  return (
    // Transparent, not a coloured bar: the design lets the page canvas run
    // behind the header, and the logo overhangs its lower edge.
    <header className="relative z-40">
      {/* Row heights and gutters are the design's own numbers rather than a
          generic scale. HEIGHT: 56px on mobile, 107px from lg — a fixed height,
          not padding, because the logo is TALLER than the row it sits in (135px
          in a 107px header) and overhangs it, which padding cannot express.
          GUTTER: 16px on mobile; from lg it is 5.2% — the design's 100px as a
          FRACTION of its 1920 frame, so it stays proportional rather than
          eating a fifth of a 1024 viewport and wrapping «Про нас» onto two
          lines. The container is
          capped at the frame width itself, NOT at 1920-minus-gutters — capping
          at 1720 and then adding 100px of padding centres the container first
          and pads inside it, which doubled the gutter to 200. */}
      <div className="mx-auto mt-4 flex h-14 w-full max-w-[1920px] items-center gap-4 px-4 sm:px-6 lg:mt-0 lg:h-[107px] lg:px-[5.2%]">
        <nav
          aria-label={t("nav.label")}
          className="hidden flex-1 items-center gap-4 lg:flex xl:gap-6"
        >
          {SITE_NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="hover:text-primary focus-visible:outline-ring rounded text-base whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
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
          {/* Sized to FIT the row, not to overhang it. The design's logo is
              135px in a 107px header, but its asset carries transparent
              padding so that overhang is empty space; ours is tight artwork,
              and the page wrapper's overflow-hidden sliced the top off the
              wordmark. */}
          <SiteLogo
            width={135}
            height={135}
            priority
            className="h-12 w-auto lg:h-[103px]"
          />
        </Link>

        <div className="flex flex-1 items-center justify-end gap-3 lg:gap-4">
          <Link
            href="/#contacts"
            className="hover:text-primary focus-visible:outline-ring hidden rounded text-base whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:inline"
          >
            {t("nav.contacts")}
          </Link>

          {account}

          {/* The mobile menu is a <details>, so it opens with no JavaScript and
              the keyboard and screen-reader behaviour come from the element —
              the same reason the volunteer's claim cards are one.

              The <summary> IS the close button: when the panel is open the
              burger swaps to an ×, and because the summary stays where it was
              in the header, the × lands exactly where the design puts it. That
              is why there is no second button to close with — there cannot be
              one without script. */}
          <details className="group lg:hidden">
            <summary
              aria-label={t("nav.menu")}
              className="focus-visible:outline-ring relative z-60 grid size-8 cursor-pointer list-none place-items-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden"
            >
              <MenuIcon className="size-6 group-open:hidden" />
              <CloseIcon className="hidden size-6 group-open:block" />
            </summary>

            <div className="bg-canvas fixed inset-0 z-50 flex flex-col gap-8 overflow-y-auto px-5 pt-4 pb-10">
              {/* The panel covers the header, so it carries its own logo —
                  otherwise the brand disappears the moment the menu opens.
                  Decorative: the link around it is already named. */}
              <Link
                href="/"
                aria-label={t("brand")}
                className="focus-visible:outline-ring w-fit rounded"
              >
                <SiteLogo width={135} height={135} className="h-14 w-auto" />
              </Link>

              <nav aria-label={t("nav.label")}>
                <ul className="flex flex-col gap-6 text-lg">
                  {[...SITE_NAV, { key: "contacts", href: "/#contacts" }].map(
                    (item) => (
                      <li key={item.key}>
                        <Link
                          href={item.href}
                          className="focus-visible:outline-ring rounded focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          {t(`nav.${item.key}`)}
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              </nav>

              <div className="mt-auto flex flex-col gap-4">
                <a
                  href={`mailto:${SITE.email}`}
                  className="text-base underline underline-offset-4"
                >
                  {SITE.email}
                </a>
                <div className="flex items-center gap-3">
                  <a
                    href={SITE.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("footer.instagram")}
                    className="bg-primary text-primary-foreground inline-flex size-11 items-center justify-center rounded-full"
                  >
                    <InstagramIcon className="size-5" />
                  </a>
                  <a
                    href={SITE.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("footer.telegram")}
                    className="bg-primary text-primary-foreground inline-flex size-11 items-center justify-center rounded-full"
                  >
                    <TelegramIcon className="size-5" />
                  </a>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
