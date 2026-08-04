"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";

export function Hero({
  activeCampaignTitle,
}: {
  activeCampaignTitle: string | null;
}) {
  const t = useTranslations("landing");

  return (
    <section
      id="about"
      className="bg-surface-muted border-divider scroll-mt-20 border-b"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_440px]">
        <div className="flex flex-col items-start gap-4.5">
          {activeCampaignTitle && (
            <Badge>{t("campaignBadge", { title: activeCampaignTitle })}</Badge>
          )}
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-[44px] sm:leading-[1.1]">
            {t("hero.title")}
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg leading-relaxed text-pretty">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col gap-3 pt-1.5 sm:flex-row">
            <ButtonLink href="/parent">{t("hero.parentCta")}</ButtonLink>
            <ButtonLink href="/volunteer" variant="outlineStrong">
              {t("hero.volunteerCta")}
            </ButtonLink>
          </div>
          <span className="text-muted-foreground text-[13px]">
            {t("hero.privacyNote")}
          </span>
        </div>

        {/* Brand logo lockup «Чарівники Поруч». */}
        <div className="flex items-center justify-center">
          <Image
            src="/logo.png"
            alt={t("hero.imageAlt")}
            width={440}
            height={440}
            priority
            className="h-44 w-auto lg:h-[340px]"
          />
        </div>
      </div>
    </section>
  );
}
