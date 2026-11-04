import { getTranslations } from "next-intl/server";
import { NextResponse, type NextRequest } from "next/server";

import { moderationFilterInput } from "@/features/applications/adminQueries";
import { UTF8_BOM } from "@/features/applications/csv";
import {
  listForQueueExport,
  queueExportCsv,
} from "@/features/applications/export";
import {
  moderationCampaignScope,
  parseModerationQuery,
} from "@/features/applications/moderationFilter";
import { recordAuditLog } from "@/features/audit/log";
import { listCampaigns } from "@/features/campaigns/adminQueries";
import { requestOrigin } from "@/lib/auth/requestOrigin";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

// The moderation queue, under the filter in the url, as a CSV — the same query
// string /admin/applications was opened with, parsed the same way, so the file
// is the list on screen (every page of it). Admin only, one campaign at a time,
// and every download is audit-logged.
export async function GET(request: NextRequest) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const campaigns = await listCampaigns();
  const query = parseModerationQuery(
    Object.fromEntries(request.nextUrl.searchParams),
    moderationCampaignScope(campaigns),
  );
  // «Усі кампанії» is refused rather than exported: a file spanning campaigns
  // would put every archived family into one spreadsheet. The page offers no
  // link for it; this is the server saying the same.
  const campaign = campaigns.find((c) => c.id === query.campaign);
  if (!campaign) {
    return NextResponse.json({ error: "campaign_required" }, { status: 400 });
  }

  const [tColumns, tRegions, rows] = await Promise.all([
    getTranslations("admin.applications.export.columns"),
    getTranslations("regions"),
    listForQueueExport(moderationFilterInput(query)),
  ]);
  // Not request.url: behind Heroku's router that is the dyno's own address,
  // and these links are opened from a spreadsheet.
  const origin = requestOrigin(request.headers);
  const csv = queueExportCsv(rows, {
    heading: (column) => tColumns(column),
    regionLabel: (region) => tRegions(region),
    photoUrl: (applicationId, fileId) =>
      `${origin}/api/applications/${applicationId}/files/${fileId}`,
  });

  await recordAuditLog({
    actor,
    action: "campaign.applications_exported",
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
