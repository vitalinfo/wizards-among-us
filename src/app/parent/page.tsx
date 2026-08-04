import { ParentInfo } from "@/components/ParentInfo";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

// Public but noindex (inherits the root layout's robots default — §10).
export default function ParentPage() {
  return (
    <>
      <SiteHeader />
      <ParentInfo />
      <SiteFooter />
    </>
  );
}
