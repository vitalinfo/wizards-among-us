import type { ReactNode } from "react";

import { SITE_CONTAINER } from "@/components/site/layout";
import type { InitiativeStatus } from "@/features/initiatives/catalog";
import { cn } from "@/lib/utils";

import { InitiativeCtas } from "./InitiativeCtas";
import { InitiativeStatusPill } from "./InitiativeStatusPill";

// The top of an initiative page: the live recruitment state, the name, one
// paragraph, and the two actions. Centred at every width.
//
// The design hardcodes «Відбувається набір» into the pill. It comes from the
// database here, through the same `initiativeStatus` the cards use — so the
// page cannot advertise a campaign the server would refuse.
export function InitiativeHero({
  status,
  title,
  lead,
}: {
  status: InitiativeStatus;
  title: ReactNode;
  lead: string;
}) {
  return (
    <section className={cn(SITE_CONTAINER, "pt-8 pb-12 lg:pt-12 lg:pb-15")}>
      <div className="mx-auto flex max-w-[633px] flex-col items-center gap-8 text-center lg:gap-11">
        <div className="flex flex-col items-center gap-4.5 lg:gap-6">
          <InitiativeStatusPill status={status} />
          {/* 120/80 at -0.06em, the same display setting as every other h1 in
              this design, and in vw from lg for the same reason: a fixed
              120px takes a third line on a laptop. */}
          {/* Capped at the design's 502 of its 633 column — the cap is what
              makes «Чарівний Миколай» break into two lines at the width it
              was drawn at instead of running across the whole block. */}
          <h1 className="font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:max-w-[min(26.15vw,502px)] lg:text-[min(6.25vw,120px)] lg:leading-[min(4.167vw,80px)]">
            {title}
          </h1>
          <p className="text-muted-foreground text-base leading-5 tracking-[-0.03em] lg:max-w-[min(27.03vw,519px)]">
            {lead}
          </p>
        </div>

        <InitiativeCtas
          applyOpen={status === "open"}
          className="items-center"
        />
      </div>
    </section>
  );
}
