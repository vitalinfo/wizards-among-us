"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { SITE_CONTAINER } from "@/components/site/layout";
import { CtaLink } from "@/components/ui/CtaLink";
import { cn } from "@/lib/utils";

// The two full-width statements between the bands: the brand heart, one large
// hand-written paragraph, one call to action. They are what the page is
// actually arguing, so they sit on white with nothing else on the line.
export function Manifesto({
  namespace,
  href,
}: {
  // Copy namespace under `landing.manifesto` — "families" or "volunteers".
  namespace: string;
  href: string;
}) {
  const t = useTranslations(`landing.manifesto.${namespace}`);

  return (
    <section className={cn(SITE_CONTAINER, "py-15 lg:py-25")}>
      <div className="mx-auto flex max-w-[1568px] flex-col items-center gap-6 text-center lg:gap-15">
        <Image
          src="/heart.svg"
          alt=""
          aria-hidden="true"
          width={84}
          height={93}
          className="h-[49px] w-auto lg:h-[93px]"
        />
        {/* Caveat at 74px. Two spans of colour: the product's own name in
            blue, and one clause greyed back to --muted-faint. That token is
            large-text-only and this is 37px bold at its smallest, so it
            qualifies at every breakpoint here. */}
        <p className="font-display text-[37px] leading-[34px] font-bold tracking-[-0.06em] lg:text-[74px] lg:leading-[70px]">
          {t.rich("body", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
            dim: (chunks) => <span className="text-muted-faint">{chunks}</span>,
          })}
        </p>
        <CtaLink href={href} className="w-full max-w-[268px] lg:w-auto">
          {t("cta")}
        </CtaLink>
      </div>
    </section>
  );
}
