import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { Pager } from "@/components/ui/Pager";
import { countAuditLogs, listAuditLogs } from "@/features/audit/adminQueries";
import {
  auditActorHref,
  auditHref,
  auditPageCount,
  auditTargetHref,
  parseAuditQuery,
  splitAuditAction,
  AUDIT_PAGE_SIZE,
} from "@/features/audit/listQuery";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

// The audit trail, read-only.
//
// The plan calls this the main compensating control for having no volunteer
// approval gate (§11): anyone signed in with Telegram can browse approved
// children, and what makes that acceptable is that every view and claim is
// recorded. It has been recorded since Phase 1 — there was simply nowhere to
// read it, which makes a control nobody can consult.
//
// Append-only, and this page never offers a way to change that: no edit, no
// delete, no export. A trail an admin can tidy is not a trail.
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const query = parseAuditQuery(await searchParams);

  // Count before fetching: a stale ?page= would otherwise render an empty table
  // that reads as "nothing has happened".
  const total = await countAuditLogs();
  const pageCount = auditPageCount(total);
  const page = Math.min(query.page, pageCount);
  const offset = (page - 1) * AUDIT_PAGE_SIZE;

  const [t, format, rows] = await Promise.all([
    getTranslations("admin.audit"),
    getFormatter(),
    listAuditLogs({ limit: AUDIT_PAGE_SIZE, offset }),
  ]);

  const cell = "border-border border-b px-3 py-2 align-top";
  const linkClass =
    "text-primary focus-visible:outline-ring rounded break-all underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2";

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
            <table className="w-full min-w-4xl border-collapse text-sm">
              <caption className="sr-only">{t("tableCaption")}</caption>
              <thead>
                <tr className="text-muted-foreground text-left text-xs">
                  <th scope="col" className={cell}>
                    {t("columns.when")}
                  </th>
                  <th scope="col" className={cell}>
                    {t("columns.actor")}
                  </th>
                  <th scope="col" className={cell}>
                    {t("columns.action")}
                  </th>
                  <th scope="col" className={cell}>
                    {t("columns.target")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  // Actions carry an optional ":detail" suffix — the file kind
                  // that was viewed, or the field names an admin edited. Split
                  // so the action itself stays scannable down the column.
                  const [action, detail] = splitAuditAction(row.action);
                  const actorHref = auditActorHref(row.actorType, row.actorId);
                  const targetHref = auditTargetHref(
                    row.targetType,
                    row.targetId,
                  );
                  return (
                    <tr key={row.id}>
                      {/* The row's header cell: a screen reader then reads
                          "02.09.2026 14:31, Дія, application.viewed_full"
                          rather than a bare value. */}
                      <th
                        scope="row"
                        className={`${cell} font-medium whitespace-nowrap`}
                      >
                        {format.dateTime(row.createdAt, "withTime")}
                      </th>
                      <td className={cell}>
                        {/* The label is a SNAPSHOT taken when the row was
                            written, so it stays readable after the actor is
                            deleted — which is when a trail matters most. */}
                        {actorHref ? (
                          <Link href={actorHref} className={linkClass}>
                            {row.actorLabel}
                          </Link>
                        ) : (
                          <span className="break-all">{row.actorLabel}</span>
                        )}
                        <p className="text-muted-foreground text-xs">
                          {t(`actorType.${row.actorType}`)}
                        </p>
                      </td>
                      <td className={cell}>
                        {/* Raw codes, not translated copy. They are the
                            vocabulary of the trail, they are generated (an
                            admin edit appends the field names it changed), and
                            a lookup table would rot silently the first time
                            someone adds an action. */}
                        <code className="font-mono text-xs">{action}</code>
                        {detail ? (
                          <p className="text-muted-foreground font-mono text-xs">
                            {detail}
                          </p>
                        ) : null}
                      </td>
                      <td className={cell}>
                        {row.targetId ? (
                          targetHref ? (
                            <Link
                              href={targetHref}
                              className={`${linkClass} font-mono text-xs`}
                            >
                              {row.targetId}
                            </Link>
                          ) : (
                            <span className="font-mono text-xs break-all">
                              {row.targetId}
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {/* The type on the second line: it qualifies the id
                            above it, and putting it first pushed the value you
                            came to read into the middle of the cell. */}
                        <p className="text-muted-foreground text-xs">
                          {row.targetType}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pager
          label={t("pager.label")}
          page={page}
          pageCount={pageCount}
          total={total}
          from={offset + 1}
          to={offset + rows.length}
          hrefFor={auditHref}
        />
      </main>
    </>
  );
}
