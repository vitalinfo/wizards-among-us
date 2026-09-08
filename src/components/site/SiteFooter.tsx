"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { InstagramIcon, TelegramIcon } from "@/components/icons";
import { SITE_NAV } from "@/components/site/nav";
import { SiteLogo } from "@/components/site/SiteLogo";
import { SITE } from "@/lib/site";

// Filled by default, outlined on hover — the design's resting state is a solid
// blue disc with a white glyph.
const SOCIAL =
  "bg-primary text-primary-foreground border-primary hover:bg-surface hover:text-primary focus-visible:outline-ring inline-flex size-12 items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

export function SiteFooter() {
  const t = useTranslations("common.footer");
  const tNav = useTranslations("common.nav");
  const brand = useTranslations("common")("brand");

  return (
    <footer id="contacts" className="bg-surface mt-auto scroll-mt-20">
      {/* Same gutter as the header, so the logo and columns line up with the
          nav above. Less room at the very bottom than at the top: the design
          leaves 19px under the copyright row, not a symmetric block. */}
      <div className="mx-auto w-full max-w-[1920px] px-4 pt-12 pb-5 sm:px-6 lg:px-[5.2%]">
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
            <div className="flex items-center gap-3">
              {/* Each is labelled by the NETWORK, not by the icon: «Instagram»
                  is what a screen-reader user needs to hear, and the glyph
                  itself carries no accessible name. */}
              <a
                href={SITE.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("instagram")}
                className={SOCIAL}
              >
                <InstagramIcon className="size-5" />
              </a>
              <a
                href={SITE.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("telegram")}
                className={SOCIAL}
              >
                <TelegramIcon className="size-5" />
              </a>
            </div>
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
