import type { ResolvedSettings } from "@/features/campaigns/authz";
import type { CampaignStates } from "@/features/campaigns/queries";
import type { PublicFaq } from "@/features/faqs/queries";
import { SITE } from "@/lib/site";
import { yearsSince } from "@/lib/years";

import { About } from "./About";
import { Faq } from "./Faq";
import { ForFamilies } from "./ForFamilies";
import { Gallery } from "./Gallery";
import { FounderQuote } from "./FounderQuote";
import { ForVolunteers } from "./ForVolunteers";
import { Hero } from "./Hero";
import { Initiatives } from "./Initiatives";
import { Manifesto } from "./Manifesto";
import { Stats } from "./Stats";

// Composer for the public landing page. A thin server component that arranges
// the sections; each section is its own (client) component.
export function Landing({
  campaigns,
  settings,
  faqs,
}: {
  // Which initiatives exist as campaigns, and which one is running.
  campaigns: CampaignStates;
  // The global applications kill switch — the initiative pills read it too,
  // because «Відбувається набір» has to mean a parent can actually apply.
  settings: ResolvedSettings;
  // The active FAQ entries, in display order. Admin-managed, so they are data
  // loaded by the page rather than copy in messages/uk.json.
  faqs: readonly PublicFaq[];
}) {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <Stats years={yearsSince(SITE.foundedYear)} since={SITE.foundedYear} />
      <About />
      <ForFamilies />
      <Manifesto namespace="families" href="/parent" />
      <ForVolunteers />
      <Manifesto namespace="volunteers" href="/volunteer" />
      <FounderQuote />
      <Initiatives campaigns={campaigns} settings={settings} />
      <Faq items={faqs} />
      <Gallery />
    </main>
  );
}
