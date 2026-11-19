import { getTranslations } from "next-intl/server";
import { NextResponse, type NextRequest } from "next/server";

import { getAdminById } from "@/features/admins/adminQueries";
import { UTF8_BOM } from "@/features/applications/csv";
import { listAllAuditLogs } from "@/features/audit/adminQueries";
import { auditLogsToCsv } from "@/features/audit/csv";
import { parseAuditQuery } from "@/features/audit/listQuery";
import { recordAuditLog } from "@/features/audit/log";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

// One ADMIN's activity as CSV — what the audit page shows for ?actor=<admin>,
// with the same action/target filters, unpaged.
//
// Only an admin's, never the whole trail: the rest of it is every volunteer's
// IP address beside every child they opened, which is a file about people, not
// about an operator's conduct. An actor that isn't an admin is a 404, like a
// missing one.
//
// Read-only, so it cannot tidy the trail — and the download is itself recorded,
// against the admin whose activity was taken.
export async function GET(request: NextRequest) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const query = parseAuditQuery(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  const subject = query.actorId ? await getAdminById(query.actorId) : null;
  if (!subject) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [t, rows] = await Promise.all([
    getTranslations("admin.audit"),
    listAllAuditLogs({
      action: query.action,
      reason: query.reason,
      targetId: query.targetId,
      actorId: subject.id,
    }),
  ]);
  const csv = auditLogsToCsv(t, rows);

  await recordAuditLog({
    actor,
    action: "admin.audit_exported",
    targetType: "admin",
    targetId: subject.id,
  });

  return new NextResponse(UTF8_BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-admin-${subject.id}.csv"`,
      // Never held by a proxy or a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
