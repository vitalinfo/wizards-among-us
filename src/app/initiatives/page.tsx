import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InitiativeCard } from "@/components/landing/InitiativeCard";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { SITE_CONTAINER } from "@/components/site/layout";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getCampaignStates } from "@/features/campaigns/queries";
import { INITIATIVES, initiativeStatus } from "@/features/initiatives/catalog";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("initiatives.meta");
  return { title: t("title"), description: t("description") };
}

// Reflect live campaign state per request, and keep the DB out of the build —
// the same reasons the landing page is dynamic. getCampaignStates swallows its
// own failures, so the page renders with every card reading «Набір ще не
// відкрито» rather than 500ing if the database is unreachable.
export const dynamic = "force-dynamic";

// «Ініціативи» in the header and the footer pointed at #initiatives, a section
// of the landing page. This is the page the designer drew for it, and it is
// also what finally gives «Детальніше» on the cards somewhere to go.
//
// Inherits the app-wide noindex, like /contacts and /partners.
export default async function InitiativesPage() {
  const campaigns = await getCampaignStates();
  const t = await getTranslations("landing.initiatives");
  const tPage = await getTranslations("initiatives");
  const tNav = await getTranslations("common.nav");

  return (
    <>
      <SiteHeader />

      <main className={cn(SITE_CONTAINER, "flex-1 pt-3.5 pb-15 lg:pt-6")}>
        <Breadcrumb
          label={tNav("breadcrumb")}
          items={[
            { label: tPage("breadcrumbHome"), href: "/" },
            { label: tNav("initiatives") },
          ]}
        />

        {/* The page's own heading and lead are the landing section's, word for
            word — the designer reuses them, so they stay ONE pair of keys
            rather than a second copy that drifts. No SectionLabel pill here:
            on the landing it labels a section among many, and on a page whose
            whole subject is initiatives it would label the page «Наші
            ініціативи» directly under the breadcrumb that already says so. */}
        <div className="mx-auto mt-8 flex max-w-[681px] flex-col items-center gap-4.5 text-center lg:mt-15 lg:gap-8">
          <h1 className="font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:text-[min(4.17vw,80px)] lg:leading-[min(3.65vw,70px)]">
            {t.rich("title", {
              em: (chunks) => <span className="text-primary">{chunks}</span>,
            })}
          </h1>
          <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
            {t("subtitle")}
          </p>
        </div>

        {/* Same breakpoints as the landing section, for the same reason: at
            1025 three across leaves 290px per card and the design's «Прийняти
            участь» pill does not fit inside it. */}
        <ul
          aria-label={t("region")}
          className="mt-8 grid grid-cols-1 items-stretch gap-6 lg:mt-15 lg:grid-cols-2 xl:grid-cols-3"
        >
          {INITIATIVES.map((item) => (
            <InitiativeCard
              key={item.key}
              itemKey={item.key}
              image={item.image}
              status={initiativeStatus(campaigns, item.campaignType)}
              detailsHref={`/initiatives/${item.slug}`}
            />
          ))}
        </ul>
      </main>

      <SiteFooter />
    </>
  );
}
