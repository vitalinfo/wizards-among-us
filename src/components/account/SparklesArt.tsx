import { cn } from "@/lib/utils";

// The gold stars behind the cabinet's empty state (Figma 109:2).
//
// They are the ✨ emoji. The frame's star layers are `text` nodes named ✨, and
// an SVG export of one is a <use> of an embedded PNG — Figma's rasterisation of
// that glyph, not artwork anyone drew. So the honest implementation is the
// character itself: one glyph instead of three paths, the gold comes from the
// emoji font, and it is literally what the design contains. (I had drawn a
// four-pointed star and chased its size and arrangement twice; the emoji draws
// a tall star with two smaller ones, which is what those measurements kept
// describing.)
//
// Positions are percentages of the cabinet's content area, read off both
// frames, so the six spots keep their relationships at every width. Entirely
// decorative — out of the accessibility tree and out of the way of pointer
// events.

// The glyph's ink is 1.03em wide and sits 0.04em above the top of a
// line-height:1 box, so a spot's size is its drawn ink width and `top` carries
// that offset back. Measured, not assumed: canvas metrics give ink 103×103 at
// font-size 100, and the baseline of such a box sits at 0.85em.
const INK = 1.03;
const RISE = 0.04;

type Spot = {
  // x against the 1386 between the sidebar and the right gutter (328 of the
  // 360 phone frame), y against the height below the header.
  x: number;
  y: number;
  // The drawn ink width in px: 72 and 48 on the desktop frame, 33 on the phone.
  ink: number;
};

// Six stars, ink at (1242,194) through (1510,874) of the 1920×1080 frame.
const DESKTOP: readonly Spot[] = [
  { x: 58.3, y: 10, ink: 48 },
  { x: 8.6, y: 32, ink: 72 },
  { x: 86.4, y: 46.5, ink: 72 },
  { x: 12.7, y: 67.9, ink: 48 },
  { x: 38.6, y: 78.7, ink: 72 },
  { x: 77.6, y: 87.9, ink: 48 },
];

// The phone draws the same six, all one size, in two groups: one above the
// heading, one well below the button. Nothing beside the words, because there
// the heading runs gutter to gutter.
const MOBILE: readonly Spot[] = [
  { x: 46.3, y: 0.4, ink: 33 },
  { x: 7.3, y: 8.3, ink: 33 },
  { x: 84.8, y: 12.7, ink: 33 },
  { x: 46.3, y: 78.6, ink: 33 },
  { x: 10.7, y: 86.2, ink: 33 },
  { x: 81.7, y: 89.6, ink: 33 },
];

export function SparklesArt() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 select-none"
    >
      <Field spots={MOBILE} className="lg:hidden" />
      <Field spots={DESKTOP} className="hidden lg:block" />
    </div>
  );
}

function Field({
  spots,
  className,
}: {
  spots: readonly Spot[];
  className: string;
}) {
  return (
    <div className={cn("absolute inset-0", className)}>
      {spots.map((spot) => {
        const size = spot.ink / INK;
        return (
          <span
            key={`${spot.x}-${spot.y}`}
            className="absolute leading-none"
            style={{
              left: `${spot.x}%`,
              top: `calc(${spot.y}% + ${Math.round(size * RISE)}px)`,
              fontSize: `${Math.round(size)}px`,
            }}
          >
            ✨
          </span>
        );
      })}
    </div>
  );
}
