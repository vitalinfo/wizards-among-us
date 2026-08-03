import { ParentInfo } from "@/components/parent-info";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

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
