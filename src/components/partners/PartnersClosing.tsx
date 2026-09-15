import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/site/BrandMark";
import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

import { BecomePartnerCta } from "./BecomePartnerCta";

// The sign-off: the heart, one hand-written paragraph, and the action one last
// time. Same shape as the contacts page's team note, which is deliberate —
// both are the last thing on their page and both speak in the display face.
export function PartnersClosing() {
  const t = useTranslations("partners");

  return (
    <section className={cn(SITE_CONTAINER, "pt-15 pb-20 lg:pt-25 lg:pb-30")}>
      <div className="mx-auto flex flex-col items-center text-center lg:max-w-[min(81.67vw,1568px)]">
        <BrandMark
          width={84}
          height={93}
          className="h-[62px] w-auto lg:h-[93px]"
        />

        <p className="font-display mt-10 text-[28px] leading-7 font-bold tracking-[-0.06em] lg:mt-15 lg:text-[min(3.854vw,74px)] lg:leading-[min(3.646vw,70px)]">
          {t.rich("closing", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </p>

        <BecomePartnerCta className="mt-10 lg:mt-15" />
      </div>
    </section>
  );
}
