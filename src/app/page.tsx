import type { Metadata } from "next";

import { Landing } from "@/components/landing";
import { manifestoHrefs } from "@/components/landing/manifestoHrefs";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getCampaignStates } from "@/features/campaigns/queries";
import { listActiveFaqs } from "@/features/faqs/queries";
import { getResolvedSettings } from "@/features/settings/queries";
import { getSessionActor } from "@/lib/auth/session";

// The landing page is the ONLY indexable route (§10 crawler policy) — override
// the app-wide noindex default set in the root layout.
export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

// Reflect live campaign state per request; also keeps the DB out of the build
// (CI prerenders with no database). The manifesto buttons read the session
// too, so this page could not be cached in any case.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Independent reads — one round trip each, so run them together. All four
  // swallow their own failures: the landing renders even with no database.
  const [campaigns, settings, faqs, actor] = await Promise.all([
    getCampaignStates(),
    getResolvedSettings(),
    listActiveFaqs(),
    currentActor(),
  ]);

  return (
    <>
      <SiteHeader />
      <Landing
        campaigns={campaigns}
        settings={settings}
        faqs={faqs}
        manifestoHrefs={manifestoHrefs(actor)}
      />
      <SiteFooter />
    </>
  );
}

// The session lookup is the one read here that throws on a dead database, and
// this is the one page that renders without one. A visitor we cannot identify
// is treated as signed out: the buttons then point at /login, which is where
// they would have been sent anyway.
async function currentActor() {
  try {
    return await getSessionActor();
  } catch (error) {
    console.error("HomePage getSessionActor failed:", error);
    return null;
  }
}
