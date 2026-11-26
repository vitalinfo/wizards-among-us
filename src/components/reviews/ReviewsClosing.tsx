import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/site/BrandMark";
import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

// The sign-off (Figma 186:305): the heart and one hand-written paragraph.
// Same shape as the partners page's closing.
//
// The design's «Поділитися історією» button is left out for now (Vital,
// 2026-11-27).
export function ReviewsClosing() {
  const t = useTranslations("reviews.closing");

  return (
    <section className={cn(SITE_CONTAINER, "pt-15 pb-20 lg:pt-25 lg:pb-30")}>
      <div className="mx-auto flex flex-col items-center text-center lg:max-w-[min(81.67vw,1568px)]">
        <BrandMark className="h-[49px] w-auto lg:h-[93px]" />

        <p className="font-display mt-6 text-[37px] leading-[34px] font-bold tracking-[-0.06em] lg:mt-15 lg:text-[min(3.854vw,74px)] lg:leading-[min(3.646vw,70px)]">
          {t.rich("text", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </p>
      </div>
    </section>
  );
}
