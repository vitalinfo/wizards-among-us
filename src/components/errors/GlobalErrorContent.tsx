"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";

import { ErrorScreen } from "./ErrorScreen";

// Body of the root-layout error boundary. Split out from global-error.tsx so the
// copy can come from messages/uk.json (the parent supplies the intl provider)
// and so this is testable without rendering a nested <html>/<body>.
export function GlobalErrorContent({ reset }: { reset: () => void }) {
  const t = useTranslations("errors.generic");

  return (
    <ErrorScreen title={t("title")} body={t("body")}>
      <Button onClick={reset}>{t("retry")}</Button>
      <ButtonLink href="/" variant="outline">
        {t("home")}
      </ButtonLink>
    </ErrorScreen>
  );
}
