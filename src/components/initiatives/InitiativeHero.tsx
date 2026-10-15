import type { ReactNode } from "react";

import { SITE_CONTAINER } from "@/components/site/layout";
import type { InitiativeStatus } from "@/features/initiatives/catalog";
import { cn } from "@/lib/utils";

import { InitiativeCtas } from "./InitiativeCtas";
import { InitiativeStatusPill } from "./InitiativeStatusPill";

// The top of an initiative page: the live recruitment state, the name, one
// paragraph, and the two actions.
//
// Two shapes, because the designer drew two. «Чарівний Миколай» and «Шкільний
// Чарівник» centre the column in the page; «Чарівник для родини» sets it left
// with an illustration beside it. `align` and `art` are the difference.
//
// The design hardcodes a status into the pill on every page. It comes from the
// database here, through the same `initiativeStatus` the cards use — so the
// page cannot advertise a campaign the server would refuse.
export function InitiativeHero({
  status,
  title,
  lead,
  titleClassName,
  titleWidthClassName = "lg:max-w-[min(26.15vw,502px)]",
  chips,
  align = "center",
  art,
}: {
  status: InitiativeStatus;
  title: ReactNode;
  lead: string;
  // The display line-height differs per page: «Чарівний Миколай» is drawn at
  // 120/80 and «Шкільний Чарівник» at 120/90, because the second is two long
  // words and needs the room.
  //
  // Anything in here that the h1 below ALSO sets lands on the element twice —
  // `cn` joins, it does not merge — and which one wins is then the order the
  // two arbitrary utilities happen to take in the stylesheet, not the order
  // they are passed in. That is why the width cap is its own prop: passed
  // through here it was simply ignored on /initiatives/family.
  titleClassName?: string;
  // The measure the name breaks in, per page, because it is measured from
  // where each one BREAKS. The default is the design's 502, which is what
  // «Чарівний Миколай» and «Шкільний Чарівник» are drawn in.
  titleWidthClassName?: string;
  // Tilted figure cards. School flanks the title with two; family sets one
  // beside its illustration. In the flow on a narrow screen either way.
  chips?: ReactNode;
  align?: "center" | "start";
  // The illustration beside the copy, on the family page only.
  art?: ReactNode;
}) {
  const centred = align === "center";

  const copy = (
    <div
      className={cn(
        "flex flex-col gap-8 lg:gap-11",
        centred
          ? "mx-auto max-w-[633px] items-center text-center"
          : "items-start text-left lg:max-w-[612px]",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-4.5 lg:gap-6",
          centred ? "items-center" : "items-start",
        )}
      >
        <InitiativeStatusPill status={status} />
        {/* The cap is what makes the name break into the lines it is drawn in
            instead of running across the whole block. In vw from lg for the
            usual reason: a fixed 120px takes a third line on a laptop. */}
        <h1
          className={cn(
            "font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:text-[min(6.25vw,120px)] lg:leading-[min(4.167vw,80px)]",
            titleWidthClassName,
            titleClassName,
          )}
        >
          {title}
        </h1>
        <p
          className={cn(
            "text-muted-foreground text-base leading-5 tracking-[-0.03em]",
            centred
              ? "lg:max-w-[min(27.03vw,519px)]"
              : "lg:max-w-[min(26.15vw,502px)]",
          )}
        >
          {lead}
        </p>
      </div>

      <InitiativeCtas
        intakeOpen={status === "open"}
        className={centred ? "lg:mx-auto" : undefined}
      />
    </div>
  );

  return (
    <section className="relative">
      <div className={cn(SITE_CONTAINER, "pt-8 pb-12 lg:pt-12 lg:pb-15")}>
        {art ? (
          // Copy left, illustration right from lg; stacked on a phone, copy
          // first — the illustration carries none of the argument.
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-6">
            {copy}
            <div className="relative">{art}</div>
          </div>
        ) : (
          copy
        )}

        {/* In the flow on a narrow screen, placed from 2xl. Not from lg: at
            1024 the chips and the heading column both want the middle of the
            page and the chips would land on the words. 9.43% is the design's
            181 over its 1920. */}
        {chips && centred ? (
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center 2xl:pointer-events-none 2xl:absolute 2xl:inset-x-0 2xl:top-[113px] 2xl:mt-0 2xl:justify-between 2xl:px-[9.43%]">
            {chips}
          </div>
        ) : null}
        {chips && !centred ? (
          <div className="mt-8 flex flex-col gap-4 sm:flex-row 2xl:pointer-events-none 2xl:absolute 2xl:top-[36%] 2xl:left-[46%] 2xl:mt-0">
            {chips}
          </div>
        ) : null}
      </div>
    </section>
  );
}
