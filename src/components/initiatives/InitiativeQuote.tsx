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
// pair, and «Про нас» uses it twice with a single link and with NO action at
// all — one of its bands closes a chapter rather than asking for anything. So
// the actions are derived from the campaign (`intakeOpen`, the initiative
// pages), supplied (`cta`), or absent — never two of those at once.
//
// `note` is the paragraph under the display line, which only «Про нас» draws.
type QuoteProps = {
  children: ReactNode;
  note?: ReactNode;
  // The size of the display line. The design draws it at 74/70 everywhere —
  // smaller than the 80 it gives a section heading — and «Про нас» takes the
  // section-heading size instead (Vital), because on that page these two
  // lines ARE the section rather than a sign-off under one.
  titleClassName?: string;
  className?: string;
} & (
  | { intakeOpen: boolean; cta?: never }
  | { cta: ReactNode; intakeOpen?: never }
  | { intakeOpen?: never; cta?: never }
);

export function InitiativeQuote({
  children,
  note,
  titleClassName,
  intakeOpen,
  cta,
  className,
}: QuoteProps) {
  return (
    <section className={cn(SITE_CONTAINER, "py-15 lg:py-25", className)}>
      <div className="mx-auto flex flex-col items-center text-center lg:max-w-[min(81.67vw,1568px)]">
        <BrandMark className="h-[62px] w-auto lg:h-[93px]" />

        {/* A heading, not a paragraph. This line titles the band it sits in
            — it is the band's whole argument — and as a <p> it was invisible
            to anyone navigating by heading, who went from the section above
            straight to the gallery below. */}
        <h2
          className={cn(
            "font-display mt-10 text-[28px] leading-8 font-bold tracking-[-0.06em] lg:mt-15",
            titleClassName ??
              "lg:text-[min(3.854vw,74px)] lg:leading-[min(3.646vw,70px)]",
          )}
        >
          {children}
        </h2>

        {/* Capped, and NOT at the band's own width: the display line above
            runs to 1568 because it is four words in a 74px face, and the same
            column turned a 190-character sentence into two lines across the
            whole page. 660 holds the longest line the design draws here with
            room to spare. */}
        {note ? (
          <div className="text-muted-foreground mt-4.5 flex flex-col gap-2 text-base leading-[22px] tracking-[-0.03em] lg:mt-8 lg:max-w-[min(34.4vw,660px)] lg:text-lg">
            {note}
          </div>
        ) : null}

        {cta ??
          (intakeOpen === undefined ? null : (
            <InitiativeCtas
              intakeOpen={intakeOpen}
              className="mt-10 lg:mx-auto lg:mt-15"
            />
          ))}
      </div>
    </section>
  );
}
