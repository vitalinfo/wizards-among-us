import { cn } from "@/lib/utils";

// «1 — 2 — 3 — 4 — 5» over the application form (Figma 147:7166).
//
// An ordered list, with `aria-current="step"` on the one the parent is on: the
// filled circle says it to the eye, the attribute to a screen reader. Every
// step's name is in the list at every width; a phone just shows the current
// one under the row instead of under each circle, as drawn.
//
// The connector after a step is solid up to the step you are on and faint
// after it — the design's 44% of the foreground.
export function FormStepper({
  label,
  steps,
  current,
}: {
  label: string;
  steps: readonly string[];
  current: number;
}) {
  return (
    <nav aria-label={label}>
      <ol className="flex justify-center lg:gap-[44px]">
        {steps.map((name, index) => {
          const active = index === current;
          return (
            <li
              key={name}
              aria-current={active ? "step" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-4 lg:w-[178px] lg:flex-none",
                // The connector, from this circle towards the next one.
                index < steps.length - 1 &&
                  "after:absolute after:top-[21px] after:right-[calc(-50%+27px)] after:left-[calc(50%+27px)] after:h-px lg:after:top-[30px] lg:after:right-auto lg:after:left-full lg:after:w-[44px]",
                index < steps.length - 1 &&
                  (index <= current
                    ? "after:bg-foreground"
                    : "after:bg-foreground/44"),
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "font-display flex size-[42px] items-center justify-center rounded-full text-[28px] leading-none font-bold tracking-[-0.06em] lg:size-[60px] lg:text-[36px]",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground bg-surface-idle",
                )}
              >
                {/* Caveat's digits do not sit in the middle of their own
                    box: measured at 36px, the ink is ~5px right of the
                    advance's centre (it overhangs the right edge) and ~2px
                    low (ascent 35 against descent 11). Centring the box left
                    the number visibly off, so the ink is nudged back — in em,
                    so the phone's 28px digit gets the same correction. */}
                <span className="relative -top-[0.05em] -left-[0.14em]">
                  {index + 1}
                </span>
              </span>
              <span
                className={cn(
                  "sr-only text-center text-base leading-5 tracking-[-0.03em] lg:not-sr-only",
                  active ? "text-primary" : "text-foreground",
                )}
              >
                {name}
              </span>
            </li>
          );
        })}
      </ol>
      {/* The phone's single label. A repeat of the current item's name, so
          hidden from assistive tech, which already has it in the list. */}
      <p
        aria-hidden="true"
        className="text-primary mt-4 text-center text-base leading-5 tracking-[-0.03em] lg:hidden"
      >
        {steps[current]}
      </p>
    </nav>
  );
}
