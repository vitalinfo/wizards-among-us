"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { logout } from "@/app/auth/actions";
import { StarIcon, TelegramIcon } from "@/components/icons";

const NAV = [
  { key: "about", href: "/#about" },
  { key: "how", href: "/#how" },
  { key: "reviews", href: "/#reviews" },
  { key: "contacts", href: "/#contacts" },
] as const;

const ACTION_CLASS =
  "border-header-outline text-header-outline hover:bg-header-outline/10 focus-visible:outline-ring inline-flex h-11 items-center gap-2 rounded-md border-[1.5px] px-4 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

export function SiteHeader({
  user,
}: {
  // The current Telegram user (for display), or null when signed out. Resolved
  // server-side in SiteHeaderServer.
  user: { username: string | null } | null;
}) {
  const t = useTranslations("common");

  return (
    <header className="bg-header text-header-foreground sticky top-0 z-40">
      <div className="mx-auto flex h-17 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-md">
          <span
            aria-hidden="true"
            className="bg-header-outline/20 text-header-outline flex size-7 items-center justify-center rounded-[5px]"
          >
            <StarIcon className="size-4" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">
            {t("brand")}
          </span>
        </Link>

        <nav
          aria-label={t("brand")}
          className="hidden items-center gap-7 md:flex"
        >
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="text-header-muted hover:text-header-foreground text-[15px] transition-colors"
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-semibold">
              {user.username ? `@${user.username}` : t("account")}
            </span>
            <form action={logout}>
              <button type="submit" className={ACTION_CLASS}>
                {t("signOut")}
              </button>
            </form>
          </div>
        ) : (
          <Link href="/login" className={ACTION_CLASS}>
            <TelegramIcon className="size-4" />
            {t("login")}
          </Link>
        )}
      </div>
    </header>
  );
}
