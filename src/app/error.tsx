"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { ErrorScreen } from "@/components/errors/ErrorScreen";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";

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
    <ErrorScreen title={t("title")} body={t("body")}>
      <Button onClick={reset}>{t("retry")}</Button>
      <ButtonLink href="/" variant="outline">
        {t("home")}
      </ButtonLink>
    </ErrorScreen>
  );
}
