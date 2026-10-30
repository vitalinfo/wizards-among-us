"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { CloseIcon, MenuIcon, UserIcon } from "@/components/icons";
import { SITE_CONTAINER } from "@/components/site/layout";
import { SITE_NAV } from "@/components/site/nav";
import { SiteLogo } from "@/components/site/SiteLogo";
import { SocialLinks } from "@/components/site/SocialLinks";
import { MenuDetails } from "@/components/ui/MenuDetails";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

const ROUND =
  "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring inline-flex size-8 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:size-[60px]";

export function SiteHeaderClient({
  account,
}: {
  // Where the round button goes, or null when nobody is signed in. Resolved
  // server-side by SiteHeader; see features/users/account.ts for the three
  // destinations and why BOTH roles resolve to the parent side.
  account: { href: string; labelKey: "adminPanel" | "account" } | null;
}) {
  const t = useTranslations("common");

  // The SAME round button in every state — the design draws one control and no
  // name beside it, signed in or out. Only where it goes changes, and that is
  // the button's accessible name: «Увійти», «Профіль» or «Панель
  // адміністратора». Nothing identifies the person, which is also one less
  // place for a @username to leak into a cached page.
  //
  // ONE control, not a mobile copy and a desktop copy hidden from each other by
  // media query: two links with the same accessible name are a duplicate in the
  // a11y tree and a needless second tab stop.
  //
  // Signing out used to live here, as the only control that did it anywhere.
  // It now lives on the page this button leads to — which is where the design's
  // account shell puts it too, top right — so removing it from the header does
  // not strand anyone.
  const accountButton = (
    <Link
      href={account?.href ?? "/login"}
      aria-label={t(account?.labelKey ?? "login")}
      className={ROUND}
    >
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
          The gutter comes from SITE_CONTAINER. */}
      <div
        className={cn(
          SITE_CONTAINER,
          "mt-4 flex h-14 items-center gap-4 lg:mt-0 lg:h-[107px]",
        )}
      >
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
            href="/contacts"
            className="hover:text-primary focus-visible:outline-ring hidden rounded text-base whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:inline"
          >
            {t("nav.contacts")}
          </Link>

          {accountButton}

          {/* The mobile menu is a <details>, so it opens with no JavaScript and
              the keyboard and screen-reader behaviour come from the element —
              the same reason the volunteer's claim cards are one.

              The <summary> IS the close button: when the panel is open the
              burger swaps to an ×, and because the summary stays where it was
              in the header, the × lands exactly where the design puts it. That
              is why there is no second button to close with — there cannot be
              one without script.

              MenuDetails closes it again when a link in it is tapped: the
              root layout holds this header, so it persists across pages, and
              a bare <details> would stay open over the page just chosen. */}
          <MenuDetails className="group lg:hidden">
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
                  {[...SITE_NAV, { key: "contacts", href: "/contacts" }].map(
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
                <SocialLinks
                  instagramLabel={t("footer.instagram")}
                  telegramLabel={t("footer.telegram")}
                  telegramChatLabel={t("footer.telegramChat")}
                  size={44}
                />
              </div>
            </div>
          </MenuDetails>
        </div>
      </div>
    </header>
  );
}
