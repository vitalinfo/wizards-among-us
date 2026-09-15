import Image from "next/image";
import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/site/BrandMark";
import { SITE_CONTAINER } from "@/components/site/layout";

import { BecomePartnerCta } from "./BecomePartnerCta";
import { SocialLinks } from "@/components/site/SocialLinks";
import { cn } from "@/lib/utils";

import { SectionHeading } from "./SectionHeading";

export function PartnershipResults() {
  const tRes = useTranslations("partners.results");
  const tFooter = useTranslations("common.footer");

  return (
    <section className={cn(SITE_CONTAINER, "py-15 lg:py-25")}>
      {/* 816 of the design's 1720 for the picture, the rest for the copy —
          near enough half each, so a plain two-column grid rather than a
          fractional one. */}
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-11">
        <Image
          src="/partners-results.webp"
          alt={tRes("imageAlt")}
          width={1632}
          height={2040}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="h-auto w-full rounded-3xl"
        />

        <div className="flex flex-col items-start">
          <SectionHeading
            label={tRes("label")}
            title={tRes("title")}
            align="start"
          />

          <div className="mt-8 flex flex-col gap-4 lg:mt-11">
            {/* The lead is a size up from the body and carries the number the
                whole section exists to say. */}
            <p className="text-lg leading-[26px] font-semibold tracking-[-0.03em] lg:text-2xl lg:leading-[30px]">
              {tRes.rich("lead", {
                em: (chunks) => <span className="text-primary">{chunks}</span>,
              })}
            </p>
            <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em]">
              {tRes("body")}
            </p>
          </div>

          <BecomePartnerCta className="mt-8 lg:mt-11" />

          {/* The design tucks the social pair and the heart into the empty
              foot of this column, which only exists on the wide frame — the
              footer already carries both on a phone. */}
          <div className="mt-auto hidden w-full items-end justify-between pt-16 lg:flex">
            <SocialLinks
              instagramLabel={tFooter("instagram")}
              telegramLabel={tFooter("telegram")}
              size={56}
            />
            <BrandMark width={84} height={93} className="h-[93px] w-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
