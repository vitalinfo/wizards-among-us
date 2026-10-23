import { cn } from "@/lib/utils";

// The gold stars behind the cabinet's empty state (Figma 109:2).
//
// Drawn rather than exported as an image: an asset would be a 1920-wide PNG of
// mostly nothing, and a baked one could not reflow when the column narrows.
//
// The design does not scatter single stars. It places CLUSTERS of three — a
// tall one with two smaller ones tucked to its left — in six spots, and the
// phone frame mixes two of those clusters with four lone stars. Both sets are
// read off the frames and expressed as percentages of the cabinet's content
// area, so the spots keep their relationships at every width.
//
// Entirely decorative, and it says nothing the heading does not — so it stays
// out of the accessibility tree and out of the way of pointer events.

// A cluster's three stars as [x, y, width, height] in px from its top-left,
// transcribed from the frames rather than derived from one of them: the two
// desktop sizes are not quite scales of each other (the larger one carries a
// proportionally bigger tall star), and the star itself is taller than it is
// wide, which no square glyph gives you for free.
const CLUSTERS = {
  sm: [
    [0, 0, 13, 20],
    [18, 1, 29, 46],
    [10, 30, 12, 19],
  ],
  lg: [
    [0, 1, 21, 28],
    [23, 0, 48, 71],
    [14, 46, 20, 29],
  ],
  phone: [
    [0, 0, 9, 13],
    [13, 0, 21, 32],
    [8, 22, 6, 12],
  ],
} as const;

// The phone's lone stars, all one size.
const LONE = [14, 23] as const;

type Spot = {
  // Percentages of the content area, from the design frames: x against the
  // 1386 between the sidebar and the right gutter (328 of the 360 phone
  // frame), y against the height below the header.
  x: number;
  y: number;
  cluster?: keyof typeof CLUSTERS;
};

// Six clusters, (1240,191) through (1508,871) of the 1920×1080 frame.
const DESKTOP: readonly Spot[] = [
  { x: 58.2, y: 9.6, cluster: "sm" },
  { x: 8.4, y: 31.7, cluster: "lg" },
  { x: 86.2, y: 46.3, cluster: "lg" },
  { x: 12.6, y: 67.6, cluster: "sm" },
  { x: 38.4, y: 78.5, cluster: "lg" },
  { x: 77.5, y: 87.5, cluster: "sm" },
];

// The phone draws two clusters and four lone stars, in two groups: one above
// the heading, one well below the button. Nothing beside the words, because
// there the heading runs gutter to gutter.
const MOBILE: readonly Spot[] = [
  { x: 45.7, y: 0, cluster: "phone" },
  { x: 11.6, y: 8.8 },
  { x: 89, y: 13.3 },
  { x: 50.6, y: 79.2 },
  { x: 10.1, y: 85.9, cluster: "phone" },
  { x: 86, y: 90.1 },
];

export function SparklesArt() {
  return (
    <div
      aria-hidden="true"
      className="text-accent pointer-events-none absolute inset-0 -z-10"
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
        const at = `${spot.x}-${spot.y}`;
        if (!spot.cluster) {
          return (
            <Star
              key={at}
              left={`${spot.x}%`}
              top={`${spot.y}%`}
              width={LONE[0]}
              height={LONE[1]}
            />
          );
        }
        return CLUSTERS[spot.cluster].map(([x, y, width, height]) => (
          <Star
            key={`${at}-${x}-${y}`}
            left={`calc(${spot.x}% + ${x}px)`}
            top={`calc(${spot.y}% + ${y}px)`}
            width={width}
            height={height}
          />
        ));
      })}
    </div>
  );
}

function Star({
  left,
  top,
  width,
  height,
}: {
  left: string;
  top: string;
  width: number;
  height: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      // The glyph is stretched vertically in the design, so the box must not
      // preserve the path's own square ratio.
      preserveAspectRatio="none"
      className="absolute"
      style={{ left, top, width, height }}
    >
      {/* A four-pointed star with concave sides — the shape the design uses
          throughout, not a five-pointed one. */}
      <path
        fill="currentColor"
        d="M12 0c.7 6.1 5.2 10.6 11.3 11.3L24 12l-.7.7C17.2 13.4 12.7 17.9 12 24c-.7-6.1-5.2-10.6-11.3-11.3L0 12l.7-.7C6.8 10.6 11.3 6.1 12 0Z"
      />
    </svg>
  );
}
