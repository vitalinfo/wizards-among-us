import { useTranslations } from "next-intl";

import { SITE_CONTAINER } from "@/components/site/layout";
import { CtaLink } from "@/components/ui/CtaLink";
import { ctaShell } from "@/components/ui/ctaStyles";
import { cn } from "@/lib/utils";

// The top of «Відгуки» (Figma 186:114): the hand-written name, one sentence
// and the volunteer action. The design's «Відгуки» pill above the name is left
// out (Vital, 2026-11-27). The partners hero's type scale — the
// designer drew both at 120/80 in a 749px column.
export function ReviewsHero() {
  const t = useTranslations("reviews.hero");

  return (
    <section className={cn(SITE_CONTAINER, "pt-8 pb-12 lg:pt-11 lg:pb-25")}>
      <div className="mx-auto flex max-w-[749px] flex-col items-center gap-4.5 text-center lg:gap-8">
        <h1 className="font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:text-[min(6.25vw,120px)] lg:leading-[min(4.167vw,80px)]">
          {t.rich("title", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </h1>
        <p className="text-muted-foreground text-base leading-5 tracking-[-0.03em] lg:max-w-[519px]">
          {t("lead")}
        </p>
        <div className={cn(ctaShell, "mt-3.5 lg:mx-auto lg:mt-0")}>
          <CtaLink href="/volunteer" className="w-full">
            {t("cta")}
          </CtaLink>
        </div>
      </div>
    </section>
  );
}
