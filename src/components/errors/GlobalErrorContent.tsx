"use client";

import { useTranslations } from "next-intl";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeaderClient } from "@/components/site/SiteHeaderClient";
import { CtaButton } from "@/components/ui/CtaButton";
import { CtaLink } from "@/components/ui/CtaLink";

import { ErrorScreen } from "./ErrorScreen";

// Body of the root-layout error boundary. Split out from global-error.tsx so the
// copy can come from messages/uk.json (the parent supplies the intl provider)
// and so this is testable without rendering a nested <html>/<body>.
//
// Same signed-out header as error.tsx, and for the same reason — with the
// added one that this boundary catches failures in the root layout itself, so
// the less it depends on, the better.
export function GlobalErrorContent({ reset }: { reset: () => void }) {
  const t = useTranslations("errors.generic");

  return (
    <>
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
