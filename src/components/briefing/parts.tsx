import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// The shapes every briefing is built from — shared across campaign types, and
// across the two SCREENS that brief someone before they commit: the volunteer's
// «Погодження» (Figma 118:1806) and the parent's «Перед заповненням анкети»
// (147:7166). The two frames draw the same component down to the pixel — a 44px
// disc, 14px to a 1016px text column, 20px between rows — so they share these
// primitives rather than each carrying its own copy of the numbers. Moved up out
// of `volunteer/claimBriefing/` when the second screen arrived.
//
// The `lg` numbers ARE the design's: a 44px disc 14px from its text, 16/20px
// body, 12px between paragraphs inside a block. The design draws these screens
// at 1920 only, so the phone column is that ruleset scaled down rather than a
// second frame; if a mobile briefing ever appears, the non-`lg` half is the part
// to re-measure.
//
// The three text weights are load-bearing, not decoration. A block's own
// statement is medium (or semibold) in the foreground colour; anything that
// explains it underneath a heading drops to regular and the muted colour.
// Flattening them to one weight is most of why this page stopped looking like
// the design.

// One point in a briefing: an emoji in a tinted disc, and the words beside it.
// The emoji is decorative — each block says in text what it is about, so an
// icon repeated into the accessibility tree would only add noise.
//
// The disc is `--canvas` (#e8f2ff), which is the fill the design actually uses
// here — not `--primary-tint`, the lighter blue that belongs to step numbers
// and badges.
export function Block({
  emoji,
  align = "start",
  children,
}: {
  emoji: string;
  // Some blocks are centred against their disc in the design rather than hung
  // from its top; pass "center" for those.
  align?: "start" | "center";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 lg:gap-[14px]",
        // Centring is near enough to top-aligned on the three-line desktop
        // block the design centres; on a phone the same block runs to seven
        // lines and the disc would float in the middle of them.
        align === "center" ? "items-start lg:items-center" : "items-start",
      )}
    >
      <span
        aria-hidden="true"
        className="bg-canvas flex size-9 shrink-0 items-center justify-center rounded-full text-base leading-5 lg:size-11"
      >
        {emoji}
      </span>
      {/* 12px between paragraphs, which is the gap the design sets on this
          column — the blocks that want no gap wrap their lines in a div of
          their own instead of fighting it.
          The 1016px cap is the design's measure, and it is what decides where
          the long paragraphs break: left to fill the 1058px the container
          leaves, the longest block stops wrapping where the design wraps it.
          The column is also at least as tall as the disc and centres what is in
          it, which is what squares a one-line block against its emoji — a 20px
          line hung from the top of a 44px disc sits visibly high. A taller
          block grows past the minimum and the centring stops meaning anything,
          which is how the design has it: every text column there is
          `justify-center` with the disc hung from the top. */}
      <div className="flex min-h-9 min-w-0 flex-1 flex-col justify-center gap-3 text-base leading-5 tracking-[-0.03em] lg:min-h-11 lg:max-w-[1016px]">
        {children}
      </div>
    </div>
  );
}

// A block's own statement, in the foreground colour.
export function Lead({ children }: { children: ReactNode }) {
  return <p className="font-medium">{children}</p>;
}

// The heading a block carries when it names a topic rather than making a point.
export function Heading({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <p className={cn("font-extrabold", className)}>{children}</p>;
}

// Everything written underneath a heading, or the options under «Ви можете:» —
// regular weight, muted colour. The wrapper exists because some of these are a
// paragraph plus a list that belong to one another.
export function Note({ children }: { children: ReactNode }) {
  return <div className="text-muted-foreground font-normal">{children}</div>;
}

export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-6">{children}</ul>;
}

// The headline every briefing opens with. Shared because it is the design's
// masthead, not a campaign's words — the words themselves come from the
// campaign's own namespace.
export function BriefingTitle({
  title,
  subtitle,
}: {
  title: ReactNode;
  subtitle: ReactNode;
}) {
  return (
    <>
      {/* Caveat at 70px on a 44px line: the design stacks the two lines
          tightly enough that they nearly touch, and a line-height near 1 opens
          a gap the design does not draw.
          The phone line is 34px, not the 26px that scaling 44/70 would give.
          Every briefing title runs to two lines at 375px — «Перед заповненням
          анкети» wraps there, «Перед тим як стати Чарівником» has a typed break
          — and at 26px Caveat's descenders land ON the line below: the «р» of
          «заповненням» strikes «анкети». 34px is the tightest that clears
          them. */}
      <h1 className="font-display text-center text-[40px] leading-[34px] font-bold tracking-[-0.03em] lg:text-[70px] lg:leading-[44px]">
        {title}
      </h1>
      {/* The subtitle reads as the third line of the same text block, but it
          cannot be spaced like one. A 44px line box holds 71px of Caveat, so
          the title's ink hangs ~10px BELOW its own box and the «з» of
          «заповненням» lands on «будь ласка» — Figma does not draw it that way
          (147:7320 keeps 10px of clear air between the two ink bands). 20px of
          margin buys that 10px back at lg, and 12px does at the 40px phone
          size. A line that happens to end without a descender then reads 10px
          airier than drawn, which is the right way round to be wrong. */}
      <p className="text-muted-foreground mt-3 text-center text-lg leading-[26px] font-medium tracking-[-0.03em] lg:mt-5 lg:text-2xl lg:leading-[44px]">
        {subtitle}
      </p>
    </>
  );
}

// The column the blocks sit in, so every briefing spaces them alike — 20px
// between rows in both frames.
//
// `ul` for a briefing whose blocks are a LIST: the parent's ten parallel points
// are one, and «list, 10 items» tells a parent up front how much there is to
// read. The volunteer's blocks are not — each says a different kind of thing,
// three of them under their own heading — so that one stays a plain column.
// Pass `as="ul"` and wrap each Block in an `<li>`.
export function BriefingBlocks({
  as: Tag = "div",
  children,
}: {
  as?: "div" | "ul";
  children: ReactNode;
}) {
  return <Tag className="mt-6 flex flex-col gap-5 lg:mt-4">{children}</Tag>;
}
