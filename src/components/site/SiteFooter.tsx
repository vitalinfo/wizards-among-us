"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { InstagramIcon, TelegramIcon } from "@/components/icons";
import { SiteLogo } from "@/components/site/SiteLogo";
import { SITE } from "@/lib/site";

// Same set as the header, and absent for the same reason: «Ініціативи» and
// «Партнерам» are in the design but have no route.
const MENU = [
  { key: "about", href: "/#about" },
  { key: "parents", href: "/parent" },
  { key: "volunteers", href: "/volunteer" },
] as const;

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
      {/* Same gutter as the header, so the logo and columns line up with the nav above. */}
      <div className="mx-auto w-full max-w-[1920px] px-4 py-12 sm:px-6 lg:px-[5.2%]">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between lg:gap-16">
          <div className="flex max-w-sm flex-col gap-4">
            <SiteLogo
              width={265}
              height={196}
              label={brand}
              className="h-auto w-[200px]"
            />
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("tagline")}
            </p>
          </div>

          <nav aria-label={t("menuLabel")} className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">{t("menuLabel")}</h2>
            <ul className="flex flex-col gap-3">
              {MENU.map((item) => (
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
