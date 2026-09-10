import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ContactRoutes, TeamNote } from "@/components/contacts";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { SITE_CONTAINER } from "@/components/site/layout";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SocialLinks } from "@/components/site/SocialLinks";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contacts.meta");
  return { title: t("title"), description: t("description") };
}

// Public, static, and carrying no personal data — but it INHERITS the root
// layout's `noindex` rather than opting back in, because the §10 crawler
// policy says only `/` is indexable and widening that is not a layout
// decision. Worth Vital's call: a contacts page nobody can find in a search
// is half a contacts page.
export default async function ContactsPage() {
  const t = await getTranslations("contacts");
  const tNav = await getTranslations("common.nav");
  const tFooter = await getTranslations("common.footer");

  return (
    <>
      <SiteHeader />

      {/* 14px under the header on a phone, 24px from lg — the design's own
          gaps, measured from the bottom of each header row. */}
      <main
        className={cn(
          SITE_CONTAINER,
          "flex-1 pt-3.5 pb-15 lg:pt-6 lg:pb-[min(6.875vw,132px)]",
        )}
      >
        <Breadcrumb
          label={tNav("breadcrumb")}
          items={[
            { label: t("breadcrumbHome"), href: "/" },
            { label: tNav("contacts") },
          ]}
        />

        {/* Two columns from lg, capped at 1543 rather than run to the full
            1720 content box: the design leaves 177px of empty gutter to the
            RIGHT of the cards, and a 1fr/529 split inside that cap puts the
            card column's left edge at the design's x=1114 exactly. */}
        <div className="mt-8 grid gap-10 lg:mt-15 lg:max-w-[1543px] lg:grid-cols-[minmax(0,1fr)_529px] lg:gap-x-10">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            {/* 120/80 at the width the design was drawn at, 48/36 on a phone,
                both at -0.06em — the same display setting as the landing
                hero. In vw from lg because the column beside it is a fixed
                529px: at 1024, where lg starts, a literal 120px heading has
                about 350px to wrap into. */}
            <h1 className="font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:max-w-[min(31.04vw,596px)] lg:text-[min(6.25vw,120px)] lg:leading-[min(4.167vw,80px)]">
              {t.rich("title", {
                em: (chunks) => <span className="text-primary">{chunks}</span>,
              })}
            </h1>

            <p className="text-muted-foreground mt-3.5 text-base leading-5 tracking-[-0.03em] lg:mt-8 lg:max-w-[min(26.15vw,502px)]">
              {t("subtitle")}
            </p>

            <div className="mt-8 flex flex-col items-center lg:mt-15 lg:items-start">
              <a
                href={`mailto:${SITE.email}`}
                className="hover:text-primary focus-visible:outline-ring rounded text-2xl leading-[22px] font-semibold tracking-[-0.08em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {SITE.email}
              </a>
              <SocialLinks
                instagramLabel={tFooter("instagram")}
                telegramLabel={tFooter("telegram")}
                size={56}
                className="mt-6 lg:mt-8"
              />
            </div>
          </div>

          {/* 15px lower than the heading, which is where the design puts it —
              it optically levels the first card's label with the cap-height
              of «Ми». */}
          <ContactRoutes className="lg:mt-[15px]" />
        </div>

        {/* The design insets this block from the content box — 1568 of 1720 —
            and the inset is load-bearing: it is what keeps the note to three
            balanced lines instead of two long ones. Proportional, so the
            inset survives at widths other than the drawn one. */}
        <TeamNote className="mx-auto mt-16 lg:mt-[min(9.375vw,180px)] lg:max-w-[min(81.67vw,1568px)]" />
      </main>

      <SiteFooter />
    </>
  );
}
