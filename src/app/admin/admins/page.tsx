import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { listAdmins } from "@/features/admins/adminQueries";
import { auditActorLogHref } from "@/features/audit/listQuery";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

// Everyone who has signed in as an admin, each opening onto their own audit
// log. Read-only: admins are provisioned by ADMIN_ALLOWLIST, not from here.
//
// Unpaged — a handful of operators, not a population.
export default async function AdminAdminsPage() {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const [t, format, rows] = await Promise.all([
    getTranslations("admin.admins"),
    getFormatter(),
    listAdmins(),
  ]);

  const cell = "border-border border-b px-3 py-2 align-top";

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-2xl border-collapse text-sm">
              <caption className="sr-only">{t("tableCaption")}</caption>
              <thead>
                <tr className="text-muted-foreground text-left text-xs">
                  <th scope="col" className={cell}>
                    {t("columns.name")}
                  </th>
                  <th scope="col" className={cell}>
                    {t("columns.email")}
                  </th>
                  <th scope="col" className={cell}>
                    {t("columns.access")}
                  </th>
                  <th scope="col" className={cell}>
                    {t("columns.joined")}
                  </th>
                  {/* Named for a screen reader; the links say it visually. */}
                  <th scope="col" className={cell}>
                    <span className="sr-only">{t("columns.log")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((admin) => (
                  <tr key={admin.id}>
                    <th scope="row" className={`${cell} text-left font-medium`}>
                      {admin.displayName}
                    </th>
                    <td className={`${cell} break-all`}>{admin.email}</td>
                    {/* As text, never colour alone. */}
                    <td className={cell}>
                      {admin.hasAccess
                        ? t("access.allowed")
                        : t("access.removed")}
                    </td>
                    <td className={`${cell} whitespace-nowrap`}>
                      {format.dateTime(admin.createdAt, "short")}
                    </td>
                    <td className={cell}>
                      {/* Names the admin: a column of identical «Журнал дій»
                          links tells a screen-reader user nothing. */}
                      <Link
                        href={auditActorLogHref(admin.id)}
                        className="text-primary text-xs font-semibold whitespace-nowrap underline underline-offset-4"
                        aria-label={t("logFor", { email: admin.email })}
                      >
                        {t("log")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
