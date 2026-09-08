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
          header's lower edge onto it. The footer sits outside, on white.

          min-h is in vw because the artwork inside is: the shape's lowest point
          is at 44vw and the lower card ends at 42vw, while the content that
          would otherwise set this height does not grow with the viewport. Below
          about 1740px wide the content is already taller and this does nothing;
          above it — including at 1920, the width the design was drawn at — it
          is what stops overflow-hidden slicing the curve and the card off flat
          against the footer. Bottom padding alone cannot hold, because the
          amount needed depends on the viewport width. */}
      <div className="bg-surface relative isolate flex flex-1 flex-col overflow-hidden lg:min-h-[46vw]">
        <SiteHeader />
        {/* Gap below the header is the design's: 32px on mobile, 91px from lg
            (the heart sits at y=198 under a 107px header). */}
        <main className="flex flex-1 flex-col items-center px-5 pt-8 pb-44 sm:px-8 lg:pt-[91px] lg:pb-19">
          {/* The white shape the canvas sits on top of, and the two
              floating Telegram cards. All decoration: hidden from assistive
              tech, never intercepting a click.

              The blue is a SHAPE on a white page, not a background with a
              white shape cut out of it — its lower edge bulges downward, which
              is the opposite of what I first built.

              Its box is FITTED: I measured where the blue/white edge falls in
              the design's own renders, sampled the path's own outline in the
              browser, and least-squares solved for the offset and scale that
              map one onto the other. Figma's reported coordinates for this
              vector do not reconcile with where it actually renders, so they
              are not usable. Desktop and mobile were drawn in frames of very
              different proportions (1920x1420 vs 360x1497), hence two sets —
              on mobile the visible slice is nearly flat, and its edge is
              placed as a percentage of THIS SECTION so it always lands below
              the copy — the design keeps every word on blue, and a fixed
              offset would leave text stranded on white as soon as the wording
              grew.

              Desktop sizes the box in vw, not %: a percentage height is a
              percentage of THIS SECTION, which grows and shrinks with the
              content, so the curve drifted up the page as the page got taller.
              Tying it to viewport width fixes the proportions the design was
              drawn at. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 2492 2286"
            preserveAspectRatio="none"
            className="pointer-events-none absolute top-[-106%] left-[-150%] -z-10 h-[200%] w-[400%] lg:top-[-110vw] lg:left-[-39%] lg:h-[154vw] lg:w-[194%]"
          >
            <path
              fill="var(--canvas)"
              d="M1253.2 2285.96C1458.67 2287.88 1662.52 2222.77 1827 2081.06C1919.79 2001.11 1959.07 1899.27 2009.86 1794.02C2092.1 1623.62 2172.14 1452.33 2249.97 1280.18C2317.27 1131.29 2408.21 987.786 2462.22 834.43C2586.71 480.677 2302.7 172.681 1948.43 74.1114C1235.09 -124.37 292.531 63.8748 33.4554 783.887C-54.4594 1028.21 45.5503 1307.13 164.008 1528.96C289.342 1763.69 482.249 1966.55 712.504 2118.78C874.693 2226.02 1064.64 2284.21 1253.2 2285.96Z"
            />
          </svg>

          {/* Positioned in vw, like the shape above, and for the same
              reason: they straddle the blue/white edge, so anything that moves
              that edge has to move them with it. A % top is a % of this
              section, which grows with the content — the cards would float off
              the boundary as the page got taller. Measured from the design:
              the right card's centre sits exactly on the edge, the left one
              just below it.

              Composed rather than exported. The exported asset is a raster
              whose SOURCE fill is a Google Drive icon left over from the
              template — the Telegram look is painted over it — so shipping the
              PNG would mean 40KB of someone else's placeholder per card. A
              rotated rounded square plus the Telegram glyph we already have is
              the same picture, crisp at any size, and costs nothing. */}
          <TelegramCard className="bg-surface text-foreground hidden -rotate-12 lg:top-[27.4vw] lg:left-[5%] lg:grid lg:size-[10.3vw]" />
          <TelegramCard className="top-[82%] left-1/2 grid size-[30vw] -translate-x-1/2 rotate-12 bg-[#1abaf0] text-white lg:top-[32.4vw] lg:right-[8.2%] lg:left-auto lg:size-[9.7vw] lg:translate-x-0" />

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
