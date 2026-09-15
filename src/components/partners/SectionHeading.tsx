import type { ReactNode } from "react";

import { SectionLabel } from "@/components/landing/SectionLabel";
import { cn } from "@/lib/utils";

// The three-part section opener the partners page repeats — pill label,
// display heading, one line of lead-in — centred or left-aligned depending on
// where the section puts it.
//
// Local to this page rather than promoted to landing/: the landing sections
// each lay their opener out slightly differently (the FAQ's sits in a left
// column, «Про проєкт» has no lead-in), and pulling them all onto one shape
// would be a redesign of pages the designer has already signed off.
export function SectionHeading({
  label,
  title,
  subtitle,
  align = "center",
  className,
}: {
  label: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "start";
  className?: string;
}) {
  const centred = align === "center";
  return (
    <div
      className={cn(
        "flex flex-col gap-4.5 lg:gap-8",
        centred ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      <SectionLabel>{label}</SectionLabel>
      <h2
        className={cn(
          "font-display text-[32px] leading-9 font-bold tracking-[-0.06em] lg:text-[min(4.17vw,80px)] lg:leading-[min(3.65vw,70px)]",
          // 681 of the design's 1920. The cap is load-bearing on the centred
          // openers: «Як може долучитися ваша компанія?» is drawn as two
          // lines, and without it the heading runs out to the full container
          // and lands on one.
          centred && "lg:max-w-[min(35.47vw,681px)]",
        )}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className={cn(
            "text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:text-lg",
            centred && "lg:max-w-[min(35.47vw,681px)]",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
