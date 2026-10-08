import type { ReactNode } from "react";

import { BrandMark } from "@/components/site/BrandMark";
import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

import { InitiativeCtas } from "./InitiativeCtas";

// The band that closes an initiative's argument: the heart, one line in the
// display face, and the action again. Same shape as the partners page's
// sign-off, which is deliberate — both are the last word on their page.
//
// «Батькам» and «Волонтерам» reuse the band with ONE action instead of the
// pair, so the actions are either derived from the campaign (`intakeOpen`, the
// initiative pages) or supplied (`cta`) — never both, and never neither.
type QuoteProps = { children: ReactNode; className?: string } & (
  { intakeOpen: boolean; cta?: never } | { cta: ReactNode; intakeOpen?: never }
);

export function InitiativeQuote({
  children,
  intakeOpen,
  cta,
  className,
}: QuoteProps) {
  return (
    <section className={cn(SITE_CONTAINER, "py-15 lg:py-25", className)}>
      <div className="mx-auto flex flex-col items-center text-center lg:max-w-[min(81.67vw,1568px)]">
        <BrandMark
          width={84}
          height={93}
          className="h-[62px] w-auto lg:h-[93px]"
        />

        <p className="font-display mt-10 text-[28px] leading-8 font-bold tracking-[-0.06em] lg:mt-15 lg:text-[min(3.854vw,74px)] lg:leading-[min(3.646vw,70px)]">
          {children}
        </p>

        {cta ?? (
          <InitiativeCtas
            intakeOpen={intakeOpen ?? false}
            className="mt-10 lg:mx-auto lg:mt-15"
          />
        )}
      </div>
    </section>
  );
}
