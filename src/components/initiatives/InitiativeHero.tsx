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
  titleClassName,
  chips,
}: {
  status: InitiativeStatus;
  title: ReactNode;
  lead: string;
  // The display line-height differs per page: «Чарівний Миколай» is drawn at
  // 120/80 and «Шкільний Чарівник» at 120/90, because the second is two long
  // words and needs the room.
  titleClassName?: string;
  // The two tilted figure cards the school and family heroes flank the title
  // with. Absent on «Чарівний Миколай», which puts its figures in a row of
  // their own below.
  chips?: ReactNode;
}) {
  return (
    <section className="relative">
      <div className={cn(SITE_CONTAINER, "pt-8 pb-12 lg:pt-12 lg:pb-15")}>
        <div className="mx-auto flex max-w-[633px] flex-col items-center gap-8 text-center lg:gap-11">
          <div className="flex flex-col items-center gap-4.5 lg:gap-6">
            <InitiativeStatusPill status={status} />
            {/* Capped at the design's 502 of its 633 column — the cap is what
                makes the name break into two lines at the width it was drawn
                at instead of running across the whole block. In vw from lg
                for the usual reason: a fixed 120px takes a third line on a
                laptop. */}
            <h1
              className={cn(
                "font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:max-w-[min(26.15vw,502px)] lg:text-[min(6.25vw,120px)] lg:leading-[min(4.167vw,80px)]",
                titleClassName,
              )}
            >
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

        {/* In the flow below the actions on a narrow screen, flanking the
            title from 2xl. Not from lg: at 1024 the chips and the 633px
            heading column both want the middle of the page and the chips
            would land on the words. 9.43% is the design's 181 over its 1920. */}
        {chips ? (
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center 2xl:pointer-events-none 2xl:absolute 2xl:inset-x-0 2xl:top-[113px] 2xl:mt-0 2xl:justify-between 2xl:px-[9.43%]">
            {chips}
          </div>
        ) : null}
      </div>
    </section>
  );
}
