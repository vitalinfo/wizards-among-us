import type { Metadata } from "next";

import { Landing } from "@/components/landing";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getCampaignStates } from "@/features/campaigns/queries";
import { listActiveFaqs } from "@/features/faqs/queries";

// The landing page is the ONLY indexable route (§10 crawler policy) — override
// the app-wide noindex default set in the root layout.
export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

// Reflect live campaign state per request; also keeps the DB out of the build
// (CI prerenders with no database).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Independent reads — one round trip each, so run them together. Both
  // swallow their own failures: the landing renders even with no database.
  const [campaigns, faqs] = await Promise.all([
    getCampaignStates(),
    listActiveFaqs(),
  ]);

  return (
    <>
      <SiteHeader />
      <Landing campaigns={campaigns} faqs={faqs} />
      <SiteFooter />
    </>
  );
}
