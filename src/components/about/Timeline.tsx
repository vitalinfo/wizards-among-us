import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

export type Milestone = {
  key: string;
  value: string;
  label: string;
};

// 2014 → 2022 → Сьогодні, the three beats of the founder's story, each in a
// tinted card with a dashed run between them.
//
// An ordered list, because the order IS the meaning — these are not three
// facts, they are a sequence. The dashes are decoration and stay out of the
// accessibility tree; a screen reader hears the three items in order, which is
// what the dashes are drawing.
//
// Last card picked out on the blue canvas: the design separates «Сьогодні»
// from the two dates because it is the only one that has not finished
// happening.
export function Timeline({
  label,
  items,
}: {
  label: string;
  items: readonly Milestone[];
}) {
  return (
    <section className={cn(SITE_CONTAINER, "py-12 lg:py-15")}>
      {/* A column on a phone with the dashes turned on their side, a row from
          lg — which is how the design draws both. The cards are 430 of the
          design's 1920 and the runs between them 148, so the row sits inside
          the container rather than filling it. */}
      <ol
        aria-label={label}
        className="mx-auto flex max-w-[430px] flex-col items-center lg:max-w-none lg:flex-row lg:items-stretch lg:justify-center"
      >
        {items.map((item, i) => (
          <li
            key={item.key}
            className="flex w-full flex-col items-center lg:w-auto lg:flex-row lg:items-stretch"
          >
            {i > 0 ? <Dashes /> : null}
            <div
              className={cn(
                "flex w-full flex-col items-center justify-center gap-3 rounded-3xl px-6 py-8 text-center lg:w-[min(22.4vw,430px)] lg:py-[42px]",
                i === items.length - 1 ? "bg-canvas" : "bg-cream-soft",
              )}
            >
              <span className="text-muted-foreground text-[44px] leading-none tracking-[-0.03em] lg:text-[min(4.17vw,80px)]">
                {item.value}
              </span>
              <span className="text-muted-foreground text-sm leading-5 tracking-[-0.03em] lg:text-base">
                {item.label}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Three dashes, drawn rather than bordered: `border-dashed` leaves the dash
// length to the browser, and the design's run is 18px dashes with 10px
// between them. A dasharray says exactly that.
//
// Two elements rather than one rotated: `preserveAspectRatio="none"` would
// stretch a horizontal run into a 3px-wide box and crush the dashes, and
// rotating keeps the UNROTATED box in the layout, so an 84px-wide run would
// still reserve 84px of column on a phone. One is simply hidden at each width.
function Dashes() {
  const stroke = {
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeDasharray: "18 10",
  };
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 3 46"
        className="text-primary my-4 h-[46px] w-[3px] lg:hidden"
      >
        <line x1="1.5" y1="1.5" x2="1.5" y2="44.5" {...stroke} />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 84 3"
        className="text-primary hidden lg:mx-8 lg:block lg:h-[3px] lg:w-[84px] lg:self-center"
      >
        <line x1="1.5" y1="1.5" x2="82.5" y2="1.5" {...stroke} />
      </svg>
    </>
  );
}
