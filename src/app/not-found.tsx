import { getTranslations } from "next-intl/server";

import { ErrorScreen } from "@/components/errors/ErrorScreen";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { CtaLink } from "@/components/ui/CtaLink";

// App-wide 404. Replaces Next's built-in English "This page could not be
// found", which is what users saw before. Inherits the root layout's noindex
// default.
//
// A server component, so unlike the error boundaries it can render the real
// header and show whoever is signed in as signed in.
export default async function NotFound() {
  const t = await getTranslations("errors.notFound");

  return (
    <>
      <SiteHeader />
      <ErrorScreen code="404" title={t("title")} body={t("body")}>
        <CtaLink href="/">{t("home")}</CtaLink>
      </ErrorScreen>
      <SiteFooter />
    </>
  );
}
