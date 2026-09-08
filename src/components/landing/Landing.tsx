import type { CampaignStates } from "@/features/campaigns/queries";
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
}: {
  // Which initiatives exist as campaigns, and which one is running.
  campaigns: CampaignStates;
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
      <Initiatives campaigns={campaigns} />
      <Faq />
      <Gallery />
    </main>
  );
}
