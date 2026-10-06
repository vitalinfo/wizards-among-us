import type { ReactNode } from "react";

import { SectionLabel } from "@/components/landing/SectionLabel";
import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

// A tinted full-width band of prose with no illustration — the school page's
// «Підхід», and whatever the other pages put on one. Everything centred in a
// column the design keeps narrow (762 of 1920), because the point of the band
// is one argument read straight down rather than a layout.
export function InitiativeBand({
  tone,
  label,
  title,
  children,
}: {
  tone: "canvas" | "cream" | "cream-soft";
  label: string;
  title: ReactNode;
  children: ReactNode;
}) {
  const TONES = {
    canvas: "bg-canvas",
    cream: "bg-cream",
    "cream-soft": "bg-cream-soft",
  } as const;

  return (
    <section className={TONES[tone]}>
      <div className={cn(SITE_CONTAINER, "py-15 lg:py-25")}>
        <div className="mx-auto flex flex-col items-center gap-8 text-center lg:max-w-[min(39.69vw,762px)] lg:gap-11">
          <div className="flex flex-col items-center gap-4.5 lg:gap-5">
            <SectionLabel>{label}</SectionLabel>
            <h2 className="font-display text-[32px] leading-9 font-bold tracking-[-0.06em] lg:text-[min(4.17vw,80px)] lg:leading-[min(3.65vw,70px)]">
              {title}
            </h2>
          </div>
          <div className="text-muted-foreground flex flex-col gap-4.5">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
