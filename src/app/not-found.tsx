import { getTranslations } from "next-intl/server";

import { ErrorScreen } from "@/components/errors/ErrorScreen";
import { ButtonLink } from "@/components/ui/ButtonLink";

// App-wide 404. Replaces Next's built-in English "This page could not be found",
// which is what users saw before. Inherits the root layout's noindex default.
export default async function NotFound() {
  const t = await getTranslations("errors.notFound");

  return (
    <ErrorScreen title={t("title")} body={t("body")}>
      <ButtonLink href="/">{t("home")}</ButtonLink>
    </ErrorScreen>
  );
}
