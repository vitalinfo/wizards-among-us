"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { SITE_CONTAINER } from "@/components/site/layout";
import { SITE_NAV } from "@/components/site/nav";
import { SiteLogo } from "@/components/site/SiteLogo";
import { SocialLinks } from "@/components/site/SocialLinks";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  const t = useTranslations("common.footer");
  const tNav = useTranslations("common.nav");
  const brand = useTranslations("common")("brand");

  return (
    <footer id="contacts" className="bg-surface mt-auto scroll-mt-20">
      {/* Same gutter as the header, so the logo and columns line up with the
          nav above. Less room at the very bottom than at the top: the design
          leaves 19px under the copyright row, not a symmetric block. */}
      <div className={cn(SITE_CONTAINER, "pt-12 pb-5")}>
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between lg:gap-16">
          {/* The mark is CENTRED over the paragraph rather than flush left —
              measured off their render: logo centre 232, tagline centre 237.
              On MOBILE the paragraph runs the full width and the logo centres
              on the PAGE; the 273px column is a desktop-only measurement, and
              applying it at every size pulled the logo 34px left of centre. */}
          <div className="flex flex-col gap-4 lg:max-w-[273px]">
            <SiteLogo
              width={265}
              height={196}
              label={brand}
              className="h-auto w-[208px] self-center"
            />
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("tagline")}
            </p>
          </div>

          <nav aria-label={t("menuLabel")} className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">{t("menuLabel")}</h2>
            <ul className="flex flex-col gap-3">
              {SITE_NAV.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="hover:text-primary focus-visible:outline-ring rounded text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {tNav(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">{t("contactsLabel")}</h2>
            <a
              href={`mailto:${SITE.email}`}
              className="hover:text-primary focus-visible:outline-ring w-fit rounded text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {SITE.email}
            </a>
            <SocialLinks
              instagramLabel={t("instagram")}
              telegramLabel={t("telegram")}
            />
          </div>
        </div>

        <div className="border-divider text-muted-foreground mt-12 flex flex-col gap-2 border-t pt-6 text-sm sm:flex-row sm:justify-between">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <Link
            href={SITE.privacyUrl}
            className="hover:text-primary focus-visible:outline-ring rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t("privacy")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
