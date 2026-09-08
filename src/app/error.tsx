"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { ErrorScreen } from "@/components/errors/ErrorScreen";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeaderClient } from "@/components/site/SiteHeaderClient";
import { CtaButton } from "@/components/ui/CtaButton";
import { CtaLink } from "@/components/ui/CtaLink";

// Error boundary for the whole app (every route segment inherits it). Must be a
// client component — React needs `reset` to re-render the segment.
//
// NEVER render `error.message` here: a server-side failure can carry a database
// error or personal data, and this app handles children's data. Users get the
// same neutral copy whatever broke.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors.generic");

  useEffect(() => {
    // Goes to the server log (Heroku) — the digest correlates this screen with
    // the real stack trace, which stays server-side.
    console.error("Unhandled error", error.digest ?? error.message);
  }, [error]);

  return (
    <>
      {/* SiteHeaderClient, not SiteHeader: a client boundary cannot render an
          async server component, so the session is not available here. The
          header therefore shows its signed-out state even to someone signed
          in — the account control just links to /login, which bounces a
          signed-in user straight back, so the cost is one redirect and never
          a lost session. */}
      <SiteHeaderClient user={null} isAdmin={false} />
      <ErrorScreen code="500" title={t("title")} body={t("body")}>
        <CtaButton onClick={reset}>{t("retry")}</CtaButton>
        <CtaLink href="/" variant="outline">
          {t("home")}
        </CtaLink>
      </ErrorScreen>
      <SiteFooter />
    </>
  );
}
