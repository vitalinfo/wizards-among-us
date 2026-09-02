import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { UserNoteForm } from "@/components/admin/UserNoteForm";
import { getUserForAdmin } from "@/features/users/adminQueries";
import { resolveUserContact } from "@/features/users/contact";
import { parseUsersQuery, usersHref } from "@/features/users/listQuery";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

// One person, and the note about them.
//
// A page rather than a textarea in every table row: fifty rows meant fifty
// forms, fifty submit buttons and fifty tab stops between one row and the next,
// for a field an admin edits perhaps twice a week.
export default async function AdminUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const [{ userId }, rawQuery] = await Promise.all([params, searchParams]);
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const user = await getUserForAdmin(userId);
  if (!user) {
    notFound();
  }

  const [t, tRoles, format] = await Promise.all([
    getTranslations("admin.users"),
    getTranslations("admin.users.roles"),
    getFormatter(),
  ]);

  // The search and page ride along, so saving returns to the list the admin was
  // actually looking at rather than resetting it.
  const query = parseUsersQuery(rawQuery);
  const backHref = usersHref(query);

  const contact = resolveUserContact(user);
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || t("unnamed");

  const facts: [string, string][] = [
    [
      t("columns.contact"),
      contact === null
        ? "—"
        : contact.method === "telegram"
          ? `@${contact.value}`
          : contact.value,
    ],
    [
      t("columns.role"),
      user.role.length > 0
        ? user.role.map((role) => tRoles(role)).join(", ")
        : t("noRole"),
    ],
    [t("columns.applications"), String(user.applicationCount)],
    [t("columns.claims"), String(user.claimCount)],
    [t("columns.joined"), format.dateTime(user.createdAt, "short")],
  ];

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
        <Link
          href={backHref}
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {t("backCta")}
        </Link>

        <div>
          <h1 className="text-3xl font-semibold">{name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("note.intro")}
          </p>
        </div>

        <dl className="border-border bg-surface rounded-lg border p-4 text-sm">
          {facts.map(([label, value]) => (
            <div
              key={label}
              className="border-border flex flex-wrap justify-between gap-4 border-b py-1.5 last:border-b-0"
            >
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <UserNoteForm
          userId={user.id}
          note={user.note}
          returnTo={backHref}
          cancelLabel={t("note.cancel")}
        />
      </main>
    </>
  );
}
