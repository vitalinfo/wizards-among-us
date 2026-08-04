import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { Reviews } from "./Reviews";
import { Stats } from "./Stats";

// Composer for the public landing page. A thin server component that arranges
// the sections; each section is its own (client) component.
export function Landing({
  activeCampaignTitle,
}: {
  // Title of the active campaign, or null when none is running (badge hidden).
  activeCampaignTitle: string | null;
}) {
  return (
    <main className="flex flex-1 flex-col">
      <Hero activeCampaignTitle={activeCampaignTitle} />
      <HowItWorks />
      <Stats />
      <Reviews />
    </main>
  );
}
