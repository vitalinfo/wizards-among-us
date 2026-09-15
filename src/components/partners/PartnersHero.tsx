import Image from "next/image";
import { useTranslations } from "next-intl";

import { SITE_CONTAINER } from "@/components/site/layout";

import { BecomePartnerCta } from "./BecomePartnerCta";
import { cn } from "@/lib/utils";

export function PartnersHero() {
  const tHero = useTranslations("partners.hero");

  return (
    // overflow-hidden because the banner is WIDER than the viewport on a
    // phone — see the note on it below.
    <section className="overflow-hidden">
      <div className={cn(SITE_CONTAINER, "pt-8 pb-12 lg:pt-11 lg:pb-25")}>
        <div className="mx-auto flex max-w-[749px] flex-col items-center gap-8 text-center">
          {/* In vw from lg for the reason the landing hero's heading is: this
              one wraps to two lines at the width it was drawn at, and a fixed
              120px takes four on a laptop. */}
          <h1 className="font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:text-[min(6.25vw,120px)] lg:leading-[min(4.167vw,80px)]">
            {tHero.rich("title", {
              em: (chunks) => <span className="text-primary">{chunks}</span>,
            })}
          </h1>

          {/* 517 of the 749 in the design — the paragraphs are deliberately
              narrower than the heading above them. */}
          <div className="text-muted-foreground flex flex-col gap-3 text-base leading-5 tracking-[-0.03em] lg:max-w-[519px]">
            <p>
              {tHero.rich("lead", {
                b: (chunks) => <b className="font-semibold">{chunks}</b>,
              })}
            </p>
            <p>{tHero("body")}</p>
          </div>

          <BecomePartnerCta />
        </div>
      </div>

      {/* Full-bleed, edge to edge — the one element on this page that ignores
          the container.

          ONE crop, two widths. From lg it is the viewport's width, as the
          design draws it at 1920x910. On a phone the design keeps the SAME
          2.11 aspect but blows it up to 822px inside a 360px frame and lets it
          bleed off both sides — otherwise the wizard, composed for a
          1920-wide stage, shrinks to a thumbnail. 228.3vw is that 822/360, and
          -64.2vw re-centres it.

          Priority: it is the LCP candidate on a page whose first screen is
          otherwise type. */}
      <Image
        src="/partners-banner.webp"
        alt={tHero("imageAlt")}
        width={2560}
        height={1213}
        priority
        sizes="(min-width: 1024px) 100vw, 229vw"
        className="ml-[-64.2vw] h-auto w-[228.3vw] max-w-none lg:ml-0 lg:w-full"
      />
    </section>
  );
}
