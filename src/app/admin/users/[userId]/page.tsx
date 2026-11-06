import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/AdminNav";
import { CountLink } from "@/components/admin/CountLink";
import { UserNoteForm } from "@/components/admin/UserNoteForm";
import { UserRolesForm } from "@/components/admin/UserRolesForm";
import { userApplicationsHref } from "@/features/applications/moderationFilter";
import { getUserForAdmin } from "@/features/users/adminQueries";
import { resolveUserContact } from "@/features/users/contact";
import { parseUsersQuery, usersHref } from "@/features/users/listQuery";
import { getSessionActor } from "@/lib/auth/session";
import { isUuid } from "@/lib/uuid";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

// One person: their roles, and the note about them.
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

  if (!isUuid(userId)) {
    notFound();
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

  const facts: [string, ReactNode][] = [
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
    [
      t("columns.applications"),
      <CountLink
        key="applications"
        count={user.applicationCount}
        href={userApplicationsHref("parent", user.id)}
        label={t("applicationsFor", { name, count: user.applicationCount })}
      />,
    ],
    [
      t("columns.claims"),
      <CountLink
        key="claims"
        count={user.claimCount}
        href={userApplicationsHref("claimedBy", user.id)}
        label={t("claimsFor", { name, count: user.claimCount })}
      />,
    ],
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

        <UserRolesForm
          userId={user.id}
          roles={user.role}
          applicationCount={user.applicationCount}
          claimCount={user.claimCount}
          returnTo={backHref}
        />

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
