import type { Metadata } from "next";

import { Landing } from "@/components/landing";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

// The landing page is the ONLY indexable route (§10 crawler policy) — override
// the app-wide noindex default set in the root layout.
export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <Landing />
      <SiteFooter />
    </>
  );
}
