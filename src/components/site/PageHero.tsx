import type { ReactNode } from "react";

import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

// The top of «Батькам» and «Волонтерам»: a name, one paragraph, one action and
// a card, with an illustration beside them from lg.
//
// NOT InitiativeHero. That one is built around a campaign — it leads with the
// recruitment pill and always renders the pair of actions — and these two
// pages have neither. Four of its six parts would have become optional, which
// is the point at which a second component is cheaper to read than a sixth
// prop. The type scale is the landing hero's (120/100 from lg, 48/36 on a
// phone), because that is what the designer drew here.
//
// Centred on a phone, left from lg — the design's, and the one thing that
// differs from the initiative heroes, which stay left at every width.
export function PageHero({
  title,
  titleClassName,
  lead,
  leadClassName,
  cta,
  below,
  art,
}: {
  title: ReactNode;
  // Where the name breaks. The cap is what makes it fall into the two lines
  // the design draws instead of running the width of the column — «Як це
  // працює / для батьків», not «Як це працює для / батьків».
  titleClassName?: string;
  lead: string;
  // Where the sentence breaks. «Батькам» caps it at the design's 502 and takes
  // two lines; «Волонтерам» is a shorter sentence the design keeps on one.
  leadClassName?: string;
  cta: ReactNode;
  // The card under the action: the «Важливо знати» note on one page, the
  // «1000+» figure on the other.
  below?: ReactNode;
  art?: ReactNode;
}) {
  return (
    // overflow-hidden for the reason the landing hero has it: the cream shape
    // behind a cut-out is deliberately wider than the picture, and an <svg> is
    // a replaced element — so the blob ran 13px past a 375px viewport and the
    // document grew sideways to match. Nothing decorative may do that.
    <section
      className={cn(
        SITE_CONTAINER,
        "overflow-hidden pt-8 pb-12 lg:pt-12 lg:pb-15",
      )}
    >
      {/* THREE grid children, not two columns of stacked content, because the
          design's mobile order is copy → illustration → card: the picture sits
          BETWEEN the action and the card on a phone and beside both from lg.
          One column gives that order for free; from lg the art spans both rows
          of the second column and the card lands under the action.

          The landing hero reaches the same arrangement by taking its artwork
          out of the flow and pinning it, which costs a hand-tuned offset and
          leaves the picture free to overlap whatever follows. Here the grid
          holds both, so there is nothing to tune. */}
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-25">
        <div className="flex flex-col items-center gap-8 text-center lg:items-start lg:gap-11 lg:text-left">
          <div className="flex flex-col items-center gap-4.5 lg:items-start lg:gap-6">
            <h1
              className={cn(
                "font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:text-[min(6.25vw,120px)] lg:leading-[min(5.208vw,100px)]",
                titleClassName,
              )}
            >
              {title}
            </h1>
            <p
              className={cn(
                "text-muted-foreground text-base leading-5 tracking-[-0.03em]",
                leadClassName ?? "lg:max-w-[min(26.15vw,502px)]",
              )}
            >
              {lead}
            </p>
          </div>
          {cta}
        </div>

        {/* Auto-placement does the rest: the copy takes row 1 column 1, this
            spans both rows of column 2, and the card falls into row 2 column
            1. The row gap is the design's 100px between the action and the
            card; the column gap stays 24. */}
        {art ? <div className="relative lg:row-span-2">{art}</div> : null}

        {below}
      </div>
    </section>
  );
}
