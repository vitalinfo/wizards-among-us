import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";
import { CheckIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { BrandMark } from "@/components/site/BrandMark";
import { TelegramCard } from "@/components/site/TelegramCard";
import { isAdmin, isUser } from "@/lib/authz";
import { SITE } from "@/lib/site";
import { isDevLoginEnabled } from "@/lib/auth/devLogin";
import { safeReturnPath } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

// Session-dependent → dynamic; inherits the root noindex default.
export const dynamic = "force-dynamic";

const POINTS = ["dataPoint", "privacyPoint"] as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Validated here as well as on the way back — never trust it in either
  // direction (open redirect).
  const returnTo = safeReturnPath(next);

  // Only a signed-in USER is "already logged in" here. An ADMIN holds a session
  // but is not a user, and bouncing them onward is what created an infinite
  // loop with the parent pages' isUser guard. They see the page, with a notice
  // — signing in as a family would replace the admin session they are holding.
  const actor = await getSessionActor();
  if (isUser(actor)) {
    redirect(returnTo);
  }
  const signedInAsAdmin = isAdmin(actor);
  const t = await getTranslations("login");

  return (
    <>
      {/* Header and page share one canvas: in the design the blue runs behind
          the header rather than starting under it, and the logo overhangs the
          header's lower edge onto it. The footer sits outside, on white. */}
      <div className="bg-canvas relative isolate flex flex-1 flex-col overflow-hidden">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center px-5 pt-4 pb-16 sm:px-8">
          {/* The white shape the canvas sits on top of, and the two
              floating Telegram cards. All decoration: hidden from assistive
              tech, never intercepting a click.

              The blob's box is the design's own numbers, as percentages of the
              frame it was drawn in — desktop 1920x1420, mobile 360x1497 — which
              are wildly different shapes, hence two sets. Read from the frames
              rather than from the exported path's own position, which does not
              reconcile with what the frame actually renders. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 2492 2286"
            preserveAspectRatio="none"
            className="pointer-events-none absolute top-[40.6%] left-[-108%] -z-10 h-[61%] w-[285%] lg:top-[59.5%] lg:left-[-15.5%] lg:h-[161%] lg:w-[130%]"
          >
            <path
              fill="var(--surface)"
              d="M1253.2 2285.96C1458.67 2287.88 1662.52 2222.77 1827 2081.06C1919.79 2001.11 1959.07 1899.27 2009.86 1794.02C2092.1 1623.62 2172.14 1452.33 2249.97 1280.18C2317.27 1131.29 2408.21 987.786 2462.22 834.43C2586.71 480.677 2302.7 172.681 1948.43 74.1114C1235.09 -124.37 292.531 63.8748 33.4554 783.887C-54.4594 1028.21 45.5503 1307.13 164.008 1528.96C289.342 1763.69 482.249 1966.55 712.504 2118.78C874.693 2226.02 1064.64 2284.21 1253.2 2285.96Z"
            />
          </svg>

          {/* Composed rather than exported. The exported asset is a raster
              whose SOURCE fill is a Google Drive icon left over from the
              template — the Telegram look is painted over it — so shipping the
              PNG would mean 40KB of someone else's placeholder per card. A
              rotated rounded square plus the Telegram glyph we already have is
              the same picture, crisp at any size, and costs nothing. */}
          <TelegramCard className="bg-surface text-foreground hidden -rotate-12 lg:top-[34%] lg:left-[4%] lg:grid lg:size-[13vw] lg:max-w-[250px]" />
          <TelegramCard className="hidden rotate-12 bg-[#1abaf0] text-white lg:top-[42%] lg:right-[6%] lg:grid lg:size-[12vw] lg:max-w-[234px]" />

          <div className="flex w-full max-w-[580px] flex-col items-center gap-8 text-center">
            <BrandMark className="h-[70px] w-auto" />

            {/* Caveat, the display face — headings only. The design sets it very
            large with tight tracking; both scale down on a phone, where 74px
            would wrap mid-word. */}
            <h1 className="font-display text-[44px] leading-[1.05] font-bold tracking-[-0.04em] sm:text-[74px]">
              {t("title")}
            </h1>

            <p className="text-muted-foreground max-w-[446px] text-lg leading-[1.25]">
              {/* <b>, not <strong>: the design bolds the product name for visual
                  prominence, and this is not text of greater importance — which is
                  the one thing <strong> is supposed to mean. */}
              {t.rich("body", {
                b: (chunks) => <b className="font-bold">{chunks}</b>,
              })}
            </p>

            {signedInAsAdmin ? (
              <div
                role="status"
                className="border-border bg-surface w-full rounded-2xl border p-4 text-left text-sm"
              >
                <p className="font-medium">{t("adminNotice.title")}</p>
                <p className="text-muted-foreground mt-1">
                  {t("adminNotice.body")}
                </p>
                <Link
                  href="/admin"
                  className="text-primary mt-2 inline-block font-semibold underline underline-offset-4"
                >
                  {t("adminNotice.cta")}
                </Link>
              </div>
            ) : null}

            {/* Telegram's Login Widget renders ITS OWN button, inside an iframe
            we cannot style — so this is not the design's pill and cannot be
            without changing how login works (see the PR). The redirect flow it
            uses is the one whose signature the server verifies. */}
            <TelegramLoginButton
              botUsername={process.env.TELEGRAM_BOT_USERNAME ?? null}
              returnTo={returnTo}
            />

            <ul className="flex flex-col items-center gap-3">
              {POINTS.map((key) => (
                <li
                  key={key}
                  className="text-muted-foreground flex items-start gap-2 text-base"
                >
                  <CheckIcon className="text-primary mt-1 size-4 shrink-0" />
                  {/* The design writes these as a ✔️ emoji inside the sentence,
                  which a screen reader announces as "heavy check mark" before
                  every line. Same look, as a hidden icon plus real text. */}
                  <span className="text-left">{t(key)}</span>
                </li>
              ))}
            </ul>

            <p className="text-muted-foreground text-base">
              {/* One message with a <link> tag rather than two keys glued
                together: the sentence stays whole, so a translator can reorder
                it. */}
              {t.rich("consent", {
                link: (chunks) => (
                  <Link
                    href={SITE.privacyUrl}
                    className="text-primary underline underline-offset-4"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>

            {isDevLoginEnabled() && (
              <Link
                href={`/dev/login?next=${encodeURIComponent(returnTo)}`}
                className="text-muted-foreground hover:text-foreground text-xs underline"
              >
                Dev login (local only)
              </Link>
            )}
          </div>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
