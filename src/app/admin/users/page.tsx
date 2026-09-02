import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { UserSearchForm } from "@/components/admin/UserSearchForm";
import { countUsers, listUsers } from "@/features/users/adminQueries";
import { resolveUserContact } from "@/features/users/contact";
import {
  parseUsersQuery,
  userNoteHref,
  usersHref,
  usersPageCount,
  USERS_PAGE_SIZE,
} from "@/features/users/listQuery";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

// Everyone who has ever signed in — parents and volunteers — so an admin can
// find a person rather than only an application, and leave a note about them.
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const query = parseUsersQuery(await searchParams);

  // Count before fetching: a stale ?page= (or a search that narrowed the list
  // under it) would otherwise render an empty table that reads as "there is
  // nobody".
  const total = await countUsers(query.search);
  const pageCount = usersPageCount(total);
  const page = Math.min(query.page, pageCount);
  const view = { ...query, page };

  const [t, tRoles, format, rows] = await Promise.all([
    getTranslations("admin.users"),
    getTranslations("admin.users.roles"),
    getFormatter(),
    listUsers({
      limit: USERS_PAGE_SIZE,
      offset: (page - 1) * USERS_PAGE_SIZE,
      search: query.search,
    }),
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

        <UserSearchForm query={query} />

        {rows.length === 0 ? (
          <p className="text-muted-foreground">
            {query.search === "" ? t("empty") : t("noMatches")}
          </p>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">
              {t("count", { total })}
            </p>

            {/* A real <table>: this is tabular data, and a screen reader
                announces the column a cell belongs to only if the markup says
                so. It scrolls inside its own container rather than making the
                page scroll sideways on a phone. */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-4xl border-collapse text-sm">
                <caption className="sr-only">{t("tableCaption")}</caption>
                <thead>
                  <tr className="text-muted-foreground text-left text-xs">
                    <th scope="col" className={cell}>
                      {t("columns.name")}
                    </th>
                    <th scope="col" className={cell}>
                      {t("columns.contact")}
                    </th>
                    <th scope="col" className={cell}>
                      {t("columns.role")}
                    </th>
                    {/* Numeric columns are right-aligned so the digits line
                        up; the header follows the data. */}
                    <th scope="col" className={`${cell} text-right`}>
                      {t("columns.applications")}
                    </th>
                    <th scope="col" className={`${cell} text-right`}>
                      {t("columns.claims")}
                    </th>
                    <th scope="col" className={cell}>
                      {t("columns.joined")}
                    </th>
                    <th scope="col" className={cell}>
                      {t("columns.note")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((user) => {
                    const contact = resolveUserContact(user);
                    const name =
                      [user.firstName, user.lastName]
                        .filter(Boolean)
                        .join(" ") || null;
                    return (
                      <tr key={user.id}>
                        {/* The row's header cell, so a screen reader reads
                            "Олена Коваль, Взятих дітей, 2" rather than a bare
                            number. */}
                        <th scope="row" className={`${cell} font-medium`}>
                          {name ?? t("unnamed")}
                        </th>
                        <td className={cell}>
                          {contact === null
                            ? "—"
                            : contact.method === "telegram"
                              ? `@${contact.value}`
                              : contact.value}
                        </td>
                        {/* Roles as text, never colour alone. A person can hold
                            both, and none is a real state — someone who signed
                            in and did nothing yet. */}
                        <td className={cell}>
                          {user.role.length > 0
                            ? user.role.map((role) => tRoles(role)).join(", ")
                            : t("noRole")}
                        </td>
                        <td className={`${cell} text-right tabular-nums`}>
                          {user.applicationCount}
                        </td>
                        <td className={`${cell} text-right tabular-nums`}>
                          {user.claimCount}
                        </td>
                        <td className={`${cell} whitespace-nowrap`}>
                          {format.dateTime(user.createdAt, "short")}
                        </td>
                        <td className={cell}>
                          <div className="flex flex-col items-start gap-1">
                            {user.note ? (
                              <p className="max-w-80 whitespace-pre-wrap">
                                {user.note}
                              </p>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {/* The link names the PERSON, not just the action:
                                seven identical "Змінити" links in a column tell
                                a screen-reader user nothing about which is
                                which. */}
                            <Link
                              href={userNoteHref(user.id, view)}
                              className="text-primary text-xs font-semibold underline underline-offset-4"
                              aria-label={t("note.editFor", {
                                name: name ?? t("unnamed"),
                              })}
                            >
                              {user.note ? t("note.edit") : t("note.add")}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pageCount > 1 ? (
          <nav aria-label={t("pager")} className="flex items-center gap-4">
            {page > 1 ? (
              <Link
                href={usersHref(view, page - 1)}
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
                href={usersHref(view, page + 1)}
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
