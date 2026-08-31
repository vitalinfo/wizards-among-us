import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

import { adminLogout } from "./login/actions";

// Admin home. Guards on an admin session; anyone else is sent to the login page.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }
  const t = await getTranslations("admin.dashboard");

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
        <p>
          {t("signedInAs")} <strong>{actor.email}</strong>
        </p>
        <p className="text-muted-foreground">{t("placeholder")}</p>
        <form action={adminLogout}>
          <button
            type="submit"
            className="border-border hover:bg-surface-muted w-fit rounded-md border px-4 py-2 font-medium"
          >
            {t("logout")}
          </button>
        </form>
      </main>
    </>
  );
}
