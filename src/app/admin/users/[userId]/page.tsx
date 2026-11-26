import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/AdminNav";
import { CountLink } from "@/components/admin/CountLink";
import { UserBanSection } from "@/components/admin/UserBanSection";
import { UserNoteForm } from "@/components/admin/UserNoteForm";
import { UserRolesForm } from "@/components/admin/UserRolesForm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { userApplicationsHref } from "@/features/applications/moderationFilter";
import { auditUserLogHref } from "@/features/audit/listQuery";
import { getUserForAdmin } from "@/features/users/adminQueries";
import { resolveUserContact } from "@/features/users/contact";
import {
  parseUsersQuery,
  userHref,
  usersHref,
} from "@/features/users/listQuery";
import { getSessionActor } from "@/lib/auth/session";
import { isUuid } from "@/lib/uuid";
import { isAdmin } from "@/lib/authz";
import { setUserBanAction } from "../actions";

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
  // confirmBan=1 raises the ban/unban prompt (ConfirmModal) over the page.
  searchParams: Promise<{ q?: string; page?: string; confirmBan?: string }>;
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

  // This page's own url, list view intact: where the ban prompt is raised from
  // and where both of its outcomes come back to, at the ban section.
  const selfHref = userHref(user.id, query);
  const banned = user.bannedAt !== null;
  const confirmBan = rawQuery.confirmBan === "1";
  const banAnchor = `${selfHref}#ban`;
  const banConfirmHref = `${selfHref}${selfHref.includes("?") ? "&" : "?"}confirmBan=1#ban`;

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
      {/* Behind an open prompt the page is inert: Tab must not walk into the
          controls under the overlay (see ConfirmModal). */}
      <main
        inert={confirmBan}
        className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6"
      >
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

        {/* Everything this person did, as the audit trail recorded it. */}
        <Link
          href={auditUserLogHref(user.id)}
          className="text-primary self-start text-sm font-semibold underline underline-offset-4"
        >
          {t("log")}
        </Link>

        <UserRolesForm
          userId={user.id}
          roles={user.role}
          applicationCount={user.applicationCount}
          claimCount={user.claimCount}
          returnTo={backHref}
        />

        <UserBanSection
          bannedSince={
            user.bannedAt ? format.dateTime(user.bannedAt, "short") : null
          }
          applicationCount={user.applicationCount}
          claimCount={user.claimCount}
          confirmHref={banConfirmHref}
        />

        <UserNoteForm
          userId={user.id}
          note={user.note}
          returnTo={backHref}
          cancelLabel={t("note.cancel")}
        />
      </main>

      {confirmBan ? (
        <ConfirmModal
          // !banned is bound from what this page showed, so confirming does
          // what the prompt said even if another admin got there first.
          action={setUserBanAction.bind(null, user.id, !banned, banAnchor)}
          title={banned ? t("ban.confirmUnbanTitle") : t("ban.confirmBanTitle")}
          message={
            banned
              ? t("ban.confirmUnbanMessage", { name })
              : t("ban.confirmBanMessage", { name })
          }
          confirmLabel={banned ? t("ban.unban") : t("ban.ban")}
          cancelHref={banAnchor}
        />
      ) : null}
    </>
  );
}
