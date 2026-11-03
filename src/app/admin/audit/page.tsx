import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { AuditFilterForm } from "@/components/admin/AuditFilterForm";
import { Pager } from "@/components/ui/Pager";
import { auditActionLabel } from "@/features/audit/actionLabel";
import {
  countAuditLogs,
  listAuditActions,
  listAuditLogs,
} from "@/features/audit/adminQueries";
import {
  auditActorHref,
  auditHref,
  auditPageCount,
  auditTargetHref,
  isDefaultAuditQuery,
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
  searchParams: Promise<{ action?: string; target?: string; page?: string }>;
}) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const query = parseAuditQuery(await searchParams);

  // Count before fetching: a stale ?page= would otherwise render an empty table
  // that reads as "nothing has happened".
  const total = await countAuditLogs(query);
  const pageCount = auditPageCount(total);
  const page = Math.min(query.page, pageCount);
  const offset = (page - 1) * AUDIT_PAGE_SIZE;

  const [t, format, rows, actions] = await Promise.all([
    getTranslations("admin.audit"),
    getFormatter(),
    listAuditLogs({ filter: query, limit: AUDIT_PAGE_SIZE, offset }),
    listAuditActions(),
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

        <AuditFilterForm query={query} actions={actions} />

        {rows.length === 0 ? (
          <p className="text-muted-foreground">
            {isDefaultAuditQuery(query) ? t("empty") : t("emptyFiltered")}
          </p>
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
                    {t("columns.ip")}
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
                  // that was viewed, or the field names an admin edited. The
                  // label belongs to the action without it.
                  const [action] = splitAuditAction(row.action);
                  const label = auditActionLabel(t, action);
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
                        {/* Empty for rows written before the address was
                            recorded, and for writes outside a request. */}
                        {row.ip ? (
                          <span className="font-mono text-xs break-all">
                            {row.ip}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className={cell}>
                        {/* The readable name, and under it the raw value as
                            stored — the codes are the trail's vocabulary, and
                            the detail (file kind, edited fields) has no copy.
                            A code without a label shows as itself. */}
                        {label === action ? (
                          <code className="font-mono text-xs break-all">
                            {row.action}
                          </code>
                        ) : (
                          <>
                            <span>{label}</span>
                            <p className="text-muted-foreground font-mono text-xs break-all">
                              {row.action}
                            </p>
                          </>
                        )}
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
          hrefFor={(target) => auditHref(query, target)}
        />
      </main>
    </>
  );
}
