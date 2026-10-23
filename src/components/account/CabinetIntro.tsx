import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { SparklesArt } from "./SparklesArt";

// The front page of a cabinet: a Caveat heading, one paragraph, one action, on
// the ✨ field. Both cabinets draw it with the same type, measure and stars
// (Figma 109:2 for the volunteer, 136:3530 for the parent) — only the words
// and the action differ, so those come in already translated.
//
// Plain, not async, so a page's spec can render it inside the page's tree.
export function CabinetIntro({
  title,
  body,
  bodyWidth = "lg:max-w-[670px]",
  action,
}: {
  title: ReactNode;
  body: string;
  // The paragraph's desktop measure. Each frame breaks its own sentence in
  // its own place, so this is per page — and it is a whole utility rather
  // than a class to append, because two max-widths in one string would be
  // settled by Tailwind's emit order, not by which came last.
  bodyWidth?: string;
  action: ReactNode;
}) {
  return (
    // The star field spans the whole cabinet area, not the text block: the
    // design places its six stars between y=191 and y=920 of a 1080 frame,
    // which is most of the height below the header and well past the button.
    // So the wrapper takes that area and the section keeps its own rhythm.
    <div className="relative isolate h-full overflow-hidden">
      <SparklesArt />

      <section className="flex min-h-[60vh] flex-col items-center justify-center py-12 text-center lg:py-20">
        {/* 106, not the 100 a canvas measurement suggested: canvas measureText
            over-predicts the rendered ink by its side bearings, and at 100 both
            drawn lines came out 34px narrow. Scaled to the widths the browser
            actually paints — 616 and 534 — which is what the design was measured
            from.
            50 on a phone is the same heading scaled by the design's own ratio
            (its mobile line one is 295 of the desktop's 616), not a smaller
            setting. */}
        <h1 className="font-display max-w-[334px] text-[50px] leading-[44px] font-bold tracking-[-0.06em] lg:max-w-[700px] lg:text-[min(5.52vw,106px)] lg:leading-[min(4.84vw,93px)]">
          {title}
        </h1>

        {/* 14/18 on a phone against 16/22 from lg, and no cap of its own below
            lg: the design runs this paragraph to the gutter on both sides (320
            of its 360 frame) and lands it on three lines. Capped at 334 like the
            heading it took four. */}
        <p
          className={cn(
            "text-muted-foreground mt-6 text-sm leading-[18px] tracking-[-0.03em] lg:text-base lg:leading-[22px]",
            bodyWidth,
          )}
        >
          {body}
        </p>

        <div className="mt-8 lg:mt-10">{action}</div>
      </section>
    </div>
  );
}
