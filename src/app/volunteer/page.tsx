import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { VolunteerInfo } from "@/components/VolunteerInfo";

// Public but noindex (inherits the root layout's robots default — §10).
export default function VolunteerPage() {
  return (
    <>
      <SiteHeader />
      <VolunteerInfo />
      <SiteFooter />
    </>
  );
}
