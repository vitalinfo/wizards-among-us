import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { UserNoteForm } from "@/components/admin/UserNoteForm";
import {
  countUsers,
  listUsers,
  USERS_PAGE_SIZE,
} from "@/features/users/adminQueries";
import { resolveUserContact } from "@/features/users/contact";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

// Everyone who has ever signed in — parents and volunteers — so an admin can
// find a person rather than only an application, and leave a note about them.
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const query = await searchParams;

  // Count before fetching: a stale ?page= would otherwise render an empty list
  // that reads as "there are no users".
  const total = await countUsers();
  const pageCount = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
  const requested = Number(query.page);
  const page = Math.min(
    Number.isInteger(requested) && requested >= 1 ? requested : 1,
    pageCount,
  );

  const [t, tRoles, format, rows] = await Promise.all([
    getTranslations("admin.users"),
    getTranslations("admin.users.roles"),
    getFormatter(),
    listUsers({
      limit: USERS_PAGE_SIZE,
      offset: (page - 1) * USERS_PAGE_SIZE,
    }),
  ]);

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((user) => {
              const contact = resolveUserContact(user);
              const name =
                [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                null;
              return (
                <li
                  key={user.id}
                  className="border-border bg-surface rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="font-semibold">{name ?? t("unnamed")}</h2>
                    {/* Roles as text, never colour alone. A person can hold
                        both, and an empty role set is a real state — someone
                        who signed in and did nothing yet. */}
                    <span className="text-muted-foreground text-xs">
                      {user.role.length > 0
                        ? user.role.map((role) => tRoles(role)).join(", ")
                        : t("noRole")}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {t("joined", {
                        date: format.dateTime(user.createdAt, "short"),
                      })}
                    </span>
                  </div>

                  <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        {t("contact")}
                      </dt>
                      <dd>
                        {contact === null
                          ? "—"
                          : contact.method === "telegram"
                            ? `@${contact.value}`
                            : contact.value}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        {t("applications")}
                      </dt>
                      <dd>{user.applicationCount}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        {t("claims")}
                      </dt>
                      <dd>{user.claimCount}</dd>
                    </div>
                  </dl>

                  <UserNoteForm userId={user.id} note={user.note} />
                </li>
              );
            })}
          </ul>
        )}

        {pageCount > 1 ? (
          <nav aria-label={t("pager")} className="flex items-center gap-4">
            {page > 1 ? (
              <Link
                href={`/admin/users?page=${page - 1}`}
                className="text-primary text-sm font-semibold underline underline-offset-4"
              >
                {t("previous")}
              </Link>
            ) : null}
            <span className="text-muted-foreground text-sm">
              {t("pageOf", { page, pageCount })}
            </span>
            {page < pageCount ? (
              <Link
                href={`/admin/users?page=${page + 1}`}
                className="text-primary text-sm font-semibold underline underline-offset-4"
              >
                {t("next")}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </main>
    </>
  );
}
