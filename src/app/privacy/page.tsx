import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Breadcrumb } from "@/components/site/Breadcrumb";
import { SITE_CONTAINER } from "@/components/site/layout";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

import { POLICY_SECTIONS } from "./sections";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("policy.meta");
  return { title: t("title"), description: t("description") };
}

// One measure for the whole document: 730 of the design's 1920, centred. Legal
// text is read in long stretches and the line length is the only thing holding
// it together.
const COLUMN = "mx-auto max-w-[730px]";

const PROSE =
  "text-muted-foreground text-base leading-[22px] tracking-[-0.03em]";

// «Політика конфіденційності», from Figma 88:2 for the layout and from the
// project's own policy document for every word of the text.
//
// The copy is that document's, checked against it word for word rather than
// read over, and it departs from it in exactly two ways.
//
// LAYOUT: the document puts «Дата останнього оновлення» directly under its
// title; the design puts it under the two opening paragraphs, and that is
// where it sits.
//
// SUBSTANCE: §4.3, §4.4 and §6 as written described a different system from
// the one that exists. They had the letter photo and the shop link on the
// pre-claim browse card and left the family's CURRENT town off it — so a
// parent would have read that the town they live in now reaches only the
// volunteer who chose their child, when any signed-in user browsing sees it.
// Vital's call was that the code is right, so those three sections were
// corrected to match `toBrowseCard`; policyTiers.test.ts now fails if the two
// come apart again.
//
// SPELLING: the document writes the data controller's name «Панчук Олена
// Валеріівна», missing the ї, in both §1.4 and §15. Corrected on Vital's
// instruction — a name was not something to change on my own reading of it.
//
// Nothing else was added, dropped or reworded.
//
// The body of each section is one message holding its own block structure. A
// key per paragraph would have been ~120 keys for a document that is edited as
// a document, by somebody checking it against a legal text rather than against
// this file.
export default async function PrivacyPage() {
  const t = await getTranslations("policy");
  const tInit = await getTranslations("initiatives");
  const tNav = await getTranslations("common.nav");

  // The block vocabulary the policy text is written in. Shared by all fifteen
  // sections, so it is built once.
  const blocks = {
    p: (chunks: ReactNode) => <p className={PROSE}>{chunks}</p>,
    h3: (chunks: ReactNode) => (
      <h3 className="text-foreground mt-6 text-lg leading-[26px] font-semibold tracking-[-0.03em] lg:text-xl">
        {chunks}
      </h3>
    ),
    ul: (chunks: ReactNode) => (
      <ul className="marker:text-muted-faint list-disc pl-5">{chunks}</ul>
    ),
    li: (chunks: ReactNode) => <li className={PROSE}>{chunks}</li>,
    b: (chunks: ReactNode) => <b className="font-semibold">{chunks}</b>,
    br: () => <br />,
    // The address is given twice and is the only way to exercise any of the
    // rights the document describes, so it is a link in both places.
    mail: (chunks: ReactNode) => (
      <a
        href={`mailto:${SITE.email}`}
        className="text-primary hover:text-primary-hover focus-visible:outline-ring rounded underline underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {chunks}
      </a>
    ),
  };

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <Breadcrumb
          label={tNav("breadcrumb")}
          items={[
            { label: tInit("breadcrumbHome"), href: "/" },
            { label: t("breadcrumb") },
          ]}
          className={cn(SITE_CONTAINER, "pt-3.5 lg:pt-6")}
        />

        <section className={cn(SITE_CONTAINER, "pt-8 pb-12 lg:pt-12 lg:pb-15")}>
          <div className="mx-auto flex max-w-[1080px] flex-col items-center text-center">
            <h1 className="font-display text-[40px] leading-10 font-bold tracking-[-0.06em] lg:text-[min(6.25vw,120px)] lg:leading-[min(5.208vw,100px)]">
              {t.rich("title", {
                em: (chunks) => <span className="text-primary">{chunks}</span>,
              })}
            </h1>

            <div className="mt-8 flex max-w-[700px] flex-col gap-4.5 lg:mt-11">
              <p className={PROSE}>{t("intro.first")}</p>
              <p className={PROSE}>{t("intro.second")}</p>
            </div>

            {/* Underlined, as the design draws it — it is the one line on the
                page a returning reader comes back to check. A <time> so the
                date is machine-readable as well as readable. */}
            <p
              className={cn(
                PROSE,
                "mt-8 underline decoration-1 underline-offset-4 lg:mt-11",
              )}
            >
              <time dateTime="2026-10-12">{t("updated")}</time>
            </p>
          </div>
        </section>

        <div className={cn(SITE_CONTAINER, "pb-15 lg:pb-25")}>
          <div className={COLUMN}>
            <p className={PROSE}>{t("lead")}</p>

            {POLICY_SECTIONS.map((key) => (
              <section key={key} className="mt-10 lg:mt-12">
                <h2 className="text-foreground text-[28px] leading-8 font-medium tracking-[-0.03em] lg:text-[40px] lg:leading-[44px]">
                  {t(`sections.${key}.title`)}
                </h2>
                <div className="mt-5 flex flex-col gap-4.5">
                  {t.rich(`sections.${key}.body`, blocks)}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
