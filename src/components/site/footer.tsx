"use client";

import { useTranslations } from "next-intl";

import { SITE } from "@/lib/site";

export function SiteFooter() {
  const t = useTranslations("common.footer");
  const brand = useTranslations("common")("brand");

  return (
    <footer
      id="contacts"
      className="bg-footer text-footer-foreground mt-auto scroll-mt-20"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-10 sm:flex-row sm:justify-between sm:px-8">
        <div className="flex max-w-md flex-col gap-2">
          <span className="text-base font-semibold">{brand}</span>
          <span className="text-footer-muted text-sm leading-relaxed">
            {t("tagline")}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-footer-muted text-[13px]">
            {t("contactsLabel")}
          </span>
          <a
            href={SITE.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit text-[15px] underline-offset-2 hover:underline"
          >
            {t("telegram")}
          </a>
          <a
            href={`mailto:${SITE.email}`}
            className="w-fit text-[15px] underline-offset-2 hover:underline"
          >
            {SITE.email}
          </a>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-footer-muted text-[13px]">
            {t("docsLabel")}
          </span>
          {/* Real policy pages are added in a later phase. */}
          <span className="text-[15px]">{t("privacy")}</span>
          <span className="text-[15px]">{t("dataProcessing")}</span>
        </div>
      </div>
    </footer>
  );
}
