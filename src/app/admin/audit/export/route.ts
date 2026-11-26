import { getTranslations } from "next-intl/server";
import { NextResponse, type NextRequest } from "next/server";

import { UTF8_BOM } from "@/features/applications/csv";
import { listAllAuditLogs } from "@/features/audit/adminQueries";
import { auditLogsToCsv } from "@/features/audit/csv";
import { findAuditExportSubject } from "@/features/audit/exportSubject";
import { parseAuditQuery } from "@/features/audit/listQuery";
import { recordAuditLog } from "@/features/audit/log";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

// One actor's activity as CSV — what the audit page shows for ?actor=<id>, an
// admin or a user, with the same action/target filters, unpaged.
//
// Only one actor's, never the whole trail: the rest of it is every volunteer's
// IP address beside every child they opened. An id that names nobody, or a
// type that is not theirs, is a 404 (findAuditExportSubject).
//
// Read-only, so it cannot tidy the trail — and the download is itself recorded,
// against the actor whose activity was taken.
export async function GET(request: NextRequest) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const query = parseAuditQuery(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  const subject = await findAuditExportSubject(query);
  if (!subject) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [t, rows] = await Promise.all([
    getTranslations("admin.audit"),
    listAllAuditLogs({
      action: query.action,
      reason: query.reason,
      targetId: query.targetId,
      actorType: query.actorType,
      actorId: subject.id,
    }),
  ]);
  const csv = auditLogsToCsv(t, rows);

  await recordAuditLog({
    actor,
    action: `${subject.type}.audit_exported`,
    targetType: subject.type,
    targetId: subject.id,
  });

  return new NextResponse(UTF8_BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-${subject.type}-${subject.id}.csv"`,
      // Never held by a proxy or a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
