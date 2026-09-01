import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { VolunteerCta } from "@/components/volunteer/VolunteerCta";
import { VolunteerInfo } from "@/components/VolunteerInfo";

// Public but noindex (inherits the root layout's robots default — §10). Dynamic
// because the CTA depends on the session.
export const dynamic = "force-dynamic";

export default function VolunteerPage() {
  return (
    <>
      <SiteHeader />
      <VolunteerInfo cta={<VolunteerCta />} />
      <SiteFooter />
    </>
  );
}
