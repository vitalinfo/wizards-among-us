import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { VolunteerInfo } from "@/components/volunteer-info";

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
