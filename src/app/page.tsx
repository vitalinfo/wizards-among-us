import type { Metadata } from "next";

import { Landing } from "@/components/landing";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getActiveCampaign } from "@/features/campaigns/queries";
import { listPublishedReviews } from "@/features/reviews/queries";

// The landing page is the ONLY indexable route (§10 crawler policy) — override
// the app-wide noindex default set in the root layout.
export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

// Reflect live campaign state per request; also keeps the DB out of the build
// (CI prerenders with no database).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [campaign, reviews] = await Promise.all([
    getActiveCampaign(),
    listPublishedReviews(),
  ]);

  return (
    <>
      <SiteHeader />
      <Landing
        activeCampaignTitle={campaign?.title ?? null}
        reviews={reviews}
      />
      <SiteFooter />
    </>
  );
}
