import { NextResponse, type NextRequest } from "next/server";

import { UTF8_BOM } from "@/features/applications/csv";
import {
  exportApplicationsCsv,
  isExportScope,
} from "@/features/applications/export";
import { recordAuditLog } from "@/features/audit/log";
import { getCampaignById } from "@/features/campaigns/queries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

// The most dangerous artifact this system produces: a single file describing
// displaced children. Admin only, one campaign at a time, and every download is
// audit-logged with the scope that was taken.
export async function GET(request: NextRequest) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const params = request.nextUrl.searchParams;
  const campaignId = params.get("campaignId") ?? "";
  const scopeParam = params.get("scope") ?? "coordination";
  if (!isExportScope(scopeParam)) {
    return NextResponse.json({ error: "invalid_scope" }, { status: 400 });
  }

  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const csv = await exportApplicationsCsv(campaign.id, scopeParam);

  await recordAuditLog({
    actor,
    action: `campaign.exported:${scopeParam}`,
    targetType: "campaign",
    targetId: campaign.id,
  });

  const filename = `${scopeParam}-${campaign.id}.csv`;
  return new NextResponse(UTF8_BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Never held by a proxy or a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
