import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";

import { ErrorScreen } from "@/components/errors/ErrorScreen";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeaderClient } from "@/components/site/SiteHeaderClient";
import { isMaintenanceMode } from "@/lib/maintenance";

// What the middleware rewrites every request to while MAINTENANCE_MODE is on.
// The 404/500 screen with its own copy.
//
// SiteHeaderClient, not SiteHeader: SiteHeader reads the session from the
// database, and maintenance is often exactly when the database is unavailable.
export default async function Maintenance() {
  // Rendered per request: prerendered at build time, the flag would be frozen
  // at whatever it was during `pnpm build`.
  await connection();
  // Outside maintenance the path is not a page.
  if (!isMaintenanceMode()) {
    notFound();
  }

  const t = await getTranslations("errors.maintenance");

  return (
    <>
      <SiteHeaderClient account={null} />
      <ErrorScreen code="503" title={t("title")} body={t("body")} />
      <SiteFooter />
    </>
  );
}
