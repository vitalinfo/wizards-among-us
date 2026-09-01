import type { PublishedReview } from "@/features/reviews/queries";

import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { Reviews } from "./Reviews";
import { Stats } from "./Stats";

// Composer for the public landing page. A thin server component that arranges
// the sections; each section is its own (client) component.
export function Landing({
  activeCampaignTitle,
  reviews,
}: {
  // Title of the active campaign, or null when none is running (badge hidden).
  activeCampaignTitle: string | null;
  // Admin-published reviews; the section hides itself when there are none.
  reviews: PublishedReview[];
}) {
  return (
    <main className="flex flex-1 flex-col">
      <Hero activeCampaignTitle={activeCampaignTitle} />
      <HowItWorks />
      <Stats />
      <Reviews reviews={reviews} />
    </main>
  );
}
