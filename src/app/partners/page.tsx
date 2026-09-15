import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  PartnersClosing,
  PartnersHero,
  PartnersList,
  PartnershipResults,
  WaysToHelp,
} from "@/components/partners";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { SITE_CONTAINER } from "@/components/site/layout";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("partners.meta");
  return { title: t("title"), description: t("description") };
}

// The route «Партнерам» in the header and the footer has pointed at for two
// PRs, and the contacts page's third card with it. Until now all three landed
// on the 404.
//
// Inherits the app-wide `noindex`, like /contacts — only `/` is indexable
// under the §10 crawler policy, and widening that is not a page's decision to
// make. This one has a stronger case than most: it exists to be found by a
// company that has never heard of us.
export default async function PartnersPage() {
  const t = await getTranslations("partners");
  const tNav = await getTranslations("common.nav");

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <Breadcrumb
          label={tNav("breadcrumb")}
          items={[
            { label: t("breadcrumbHome"), href: "/" },
            { label: tNav("partners") },
          ]}
          className={cn(SITE_CONTAINER, "pt-3.5 lg:pt-6")}
        />

        <PartnersHero />
        <PartnersList />
        <PartnershipResults />
        <WaysToHelp />
        <PartnersClosing />
      </main>

      <SiteFooter />
    </>
  );
}
