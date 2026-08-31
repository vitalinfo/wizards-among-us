import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";
import { CheckIcon } from "@/components/icons";
import { isAdmin, isUser } from "@/lib/authz";
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
    <main className="bg-surface-muted flex min-h-svh items-center justify-center p-6">
      <div className="border-border bg-surface flex w-full max-w-md flex-col gap-5 rounded-lg border p-6">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {signedInAsAdmin ? (
          <div
            role="status"
            className="border-border bg-surface-muted rounded-lg border p-4 text-sm"
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
        <p className="text-muted-foreground leading-relaxed">{t("body")}</p>
        <TelegramLoginButton
          botUsername={process.env.TELEGRAM_BOT_USERNAME ?? null}
          returnTo={returnTo}
        />
        <ul className="flex flex-col gap-2">
          {POINTS.map((key) => (
            <li key={key} className="text-body flex items-start gap-2 text-sm">
              <CheckIcon className="text-primary mt-0.5 size-4 shrink-0" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">{t("consent")}</p>
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
  );
}
