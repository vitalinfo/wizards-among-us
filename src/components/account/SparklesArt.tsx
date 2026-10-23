import { cn } from "@/lib/utils";

// The scatter of gold stars behind the cabinet's empty state.
//
// Drawn rather than exported as an image: it is a dozen copies of one
// four-pointed star at different sizes and positions, so an asset would be a
// 1920-wide PNG of mostly nothing, and a baked one could not reflow when the
// column narrows. Positions are percentages of the box, so the scatter keeps
// its shape at every width.
//
// Entirely decorative, and it says nothing the heading does not — so it stays
// out of the accessibility tree and out of the way of pointer events.
//
// `className` is for the inset: the design starts the field 85px below the
// header rather than flush against it, and the positions below are percentages
// of whatever box this is given.
//
// `wide` marks the four that sit BESIDE the heading, the paragraph or the
// button. The design keeps the scatter clear of the words — on the desktop
// frame that happens for free, because the text column leaves half the width
// empty, but on a phone the heading runs gutter to gutter and the same four
// land on top of it. So they appear only from lg, and the phone keeps the two
// clusters the mobile frame actually draws: one above the heading, one under
// the button.
const STARS = [
  { x: 14, y: 8, size: 26 },
  { x: 33, y: 2, size: 14 },
  { x: 78, y: 6, size: 20 },
  { x: 91, y: 17, size: 30, wide: true },
  { x: 4, y: 29, size: 34, wide: true },
  { x: 95, y: 44, size: 18, wide: true },
  { x: 11, y: 58, size: 22 },
  { x: 24, y: 78, size: 30 },
  { x: 72, y: 72, size: 16, wide: true },
  { x: 86, y: 86, size: 24 },
  { x: 48, y: 94, size: 18 },
] as const;

export function SparklesArt({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "text-accent pointer-events-none absolute inset-0 -z-10",
        className,
      )}
    >
      {STARS.map((star) => (
        <svg
          key={`${star.x}-${star.y}`}
          viewBox="0 0 24 24"
          className={cn("absolute", "wide" in star && "max-lg:hidden")}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
        >
          {/* A four-pointed star with concave sides — the shape the design
              uses throughout, not a five-pointed one. */}
          <path
            fill="currentColor"
            d="M12 0c.7 6.1 5.2 10.6 11.3 11.3L24 12l-.7.7C17.2 13.4 12.7 17.9 12 24c-.7-6.1-5.2-10.6-11.3-11.3L0 12l.7-.7C6.8 10.6 11.3 6.1 12 0Z"
          />
        </svg>
      ))}
    </div>
  );
}
