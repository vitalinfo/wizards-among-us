import Image from "next/image";

import { Blob } from "@/components/landing/Blob";
import { cn } from "@/lib/utils";

// The dead-end artwork: the status code in the display face, sitting on the
// same cream blob the hero uses, with the brand heart over its shoulder.
//
// The code is TEXT, not an exported glyph — in the design it is set in Caveat
// like every other heading, which is the whole reason one page can serve both
// 404 and 500. Nothing here is announced: the code is repeated in the heading
// copy, and a screen reader reading "404" out of a picture adds nothing.
//
// The code is IN THE FLOW, centred by the grid. It was absolutely positioned
// at first, which cannot work: the offsets it needs are fractions of two
// different things, so any fixed value is right at exactly one window size.
// The two are corrected with margins instead, in units that scale on their
// own, and the result needs no breakpoint of its own at all.
//
//   me = 0.35em + 6.34cqw
//     0.06em cancels the TRAILING letter-spacing. CSS adds the spacing after
//     the last glyph as well as between them, so at -0.06em the advance box
//     is narrower than the ink and centring it pushes the digits right.
//     The em figure is Vital's, tuned by eye on top of that.
//     6.34cqw is twice the offset the blob itself asks for: the shape is
//     lopsided, so its bounding box and the middle of the yellow are not the
//     same point. Solved by iterating until the gap between the ink and the
//     outline is equal on all four sides — ink centre (0.4683, 0.4982).
//
//   mb = 0.107em cancels Caveat's line box, which carries a deep descender
//     the digits never use and so parks the ink above centre.
//
// Both land the ink at 0.4683 of the blob at either breakpoint, on one rule.
//
// The heart's offsets are percentages OF THE BLOB, measured off the design's
// renders: 89.3%/10% and 13.9% wide on the wide frame, 81.1%/2% and 16.3% on
// the phone, where it overhangs the blob's right edge on the former only.
export function ErrorArt({
  code,
  className,
}: {
  // "404", "500" — the status, as the design draws it.
  code: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "@container relative isolate grid aspect-[328/300] place-items-center lg:aspect-[690/687]",
        className,
      )}
    >
      <Blob className="text-cream absolute inset-0 -z-10 size-full" />
      <span className="font-display text-primary me-[calc(0.35em_+_6.34cqw)] mb-[0.107em] text-[60cqw] leading-none font-bold tracking-[-0.06em] lg:text-[56.7cqw]">
        {code}
      </span>
      <Image
        src="/heart.svg"
        alt=""
        width={84}
        height={93}
        className="absolute top-[2%] left-[81.1%] w-[16.3%] lg:top-[10%] lg:left-[89.3%] lg:w-[13.9%]"
      />
    </div>
  );
}
