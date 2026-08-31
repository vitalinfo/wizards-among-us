import { NextResponse, type NextRequest } from "next/server";

import { UTF8_BOM } from "@/features/applications/csv";
import { exportApplicationsCsv } from "@/features/applications/export";
import { recordAuditLog } from "@/features/audit/log";
import { getCampaignById } from "@/features/campaigns/queries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

// The most dangerous artifact this system produces: a single file describing
// displaced children, including where they live and how to reach them. Admin
// only, one campaign at a time, and every download is audit-logged.
export async function GET(request: NextRequest) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const campaignId = request.nextUrl.searchParams.get("campaignId") ?? "";
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const csv = await exportApplicationsCsv(campaign.id);

  await recordAuditLog({
    actor,
    action: "campaign.exported",
    targetType: "campaign",
    targetId: campaign.id,
  });

  return new NextResponse(UTF8_BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="applications-${campaign.id}.csv"`,
      // Never held by a proxy or a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
