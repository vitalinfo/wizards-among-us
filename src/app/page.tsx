import type { Metadata } from "next";

import { Landing } from "@/components/landing";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getActiveCampaign } from "@/db/queries/campaigns";

// The landing page is the ONLY indexable route (§10 crawler policy) — override
// the app-wide noindex default set in the root layout.
export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

// Reflect live campaign state per request; also keeps the DB out of the build
// (CI prerenders with no database).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const campaign = await getActiveCampaign();

  return (
    <>
      <SiteHeader />
      <Landing activeCampaignTitle={campaign?.title ?? null} />
      <SiteFooter />
    </>
  );
}
