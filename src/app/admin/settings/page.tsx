import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { getResolvedSettings } from "@/features/settings/queries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

import { setKillSwitchAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const t = await getTranslations("admin.settings");
  const settings = await getResolvedSettings();
  const enabled = settings.applicationsEnabled;

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
        </div>

        <section className="border-border bg-surface rounded-lg border p-4">
          <h2 className="font-semibold">{t("killSwitch.title")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("killSwitch.body")}
          </p>
          {/* Status is conveyed by text, not by the button's colour alone. */}
          <p className="mt-3 text-sm font-medium">
            {enabled ? t("killSwitch.enabled") : t("killSwitch.disabled")}
          </p>
          <div className="mt-3">
            <ConfirmSubmitButton
              action={setKillSwitchAction.bind(null, !enabled)}
              label={enabled ? t("killSwitch.disable") : t("killSwitch.enable")}
              title={
                enabled
                  ? t("killSwitch.confirmDisable.title")
                  : t("killSwitch.confirmEnable.title")
              }
              message={
                enabled
                  ? t("killSwitch.confirmDisable.body")
                  : t("killSwitch.confirmEnable.body")
              }
              confirmLabel={
                enabled ? t("killSwitch.disable") : t("killSwitch.enable")
              }
              className="border-border bg-surface hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
            />
          </div>
        </section>
      </main>
    </>
  );
}
