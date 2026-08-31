import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { InlineConfirm } from "@/components/admin/InlineConfirm";
import { getResolvedSettings } from "@/features/settings/queries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

import { setKillSwitchAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ confirm?: string }>;
}) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const t = await getTranslations("admin.settings");
  const [query, settings] = await Promise.all([
    searchParams,
    getResolvedSettings(),
  ]);
  const enabled = settings.applicationsEnabled;
  const confirming = query.confirm === "intake";

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
            {confirming ? (
              <InlineConfirm
                action={setKillSwitchAction.bind(null, !enabled)}
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
                cancelHref="/admin/settings"
                anchorId="confirm-intake"
              />
            ) : (
              <Link
                href="/admin/settings?confirm=intake#confirm-intake"
                className="border-border bg-surface hover:bg-surface-muted focus-visible:outline-ring inline-block rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {enabled ? t("killSwitch.disable") : t("killSwitch.enable")}
              </Link>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
