import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeaderServer } from "@/components/site/SiteHeaderServer";
import { VolunteerInfo } from "@/components/VolunteerInfo";

// Public but noindex (inherits the root layout's robots default — §10).
export default function VolunteerPage() {
  return (
    <>
      <SiteHeaderServer />
      <VolunteerInfo />
      <SiteFooter />
    </>
  );
}
