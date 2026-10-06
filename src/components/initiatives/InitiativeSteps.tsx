import type { ReactNode } from "react";

import { SectionLabel } from "@/components/landing/SectionLabel";
import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

export type Step = { key: string; emoji: string; title: string; body: string };

// «Ось що відбувається далі, крок за кроком» — the cream band of numbered-ish
// cards every initiative page carries. Same card as the partners page's «як
// долучитися», down to the emoji in a tinted disc, because the designer drew
// them as one component.
//
// The emoji IS the design's icon here — it draws ✍️ 📄 🪄 🎁 ❤️ rather than
// commissioning a set — so there is nothing to add to components/icons.
export function InitiativeSteps({
  label,
  title,
  subtitle,
  steps,
}: {
  label: string;
  title: ReactNode;
  subtitle: string;
  steps: readonly Step[];
}) {
  return (
    <section className="bg-cream">
      <div className={cn(SITE_CONTAINER, "py-15 lg:py-25")}>
        <div className="mx-auto flex flex-col items-center gap-4.5 text-center lg:max-w-[min(35.99vw,691px)] lg:gap-8">
          <SectionLabel>{label}</SectionLabel>
          <h2 className="font-display text-[32px] leading-9 font-bold tracking-[-0.06em] lg:text-[min(4.17vw,80px)] lg:leading-[min(3.65vw,70px)]">
            {title}
          </h2>
          <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
            {subtitle}
          </p>
        </div>

        {/* A scroller below lg, a row from it — the design lays five 287px
            cards out in a 1531px row inside a 360px frame, which is the same
            horizontal carousel the partners page uses, gutter and all. */}
        <ul
          className={cn(
            "-mx-4 mt-8 flex snap-x snap-mandatory scroll-pl-4 gap-4 overflow-x-auto px-4 pb-[15px]",
            "sm:-mx-6 sm:scroll-pl-6 sm:gap-6 sm:px-6",
            "lg:mx-0 lg:mt-15 lg:grid lg:scroll-pl-0 lg:grid-cols-5 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0",
          )}
        >
          {steps.map((step) => (
            <li
              key={step.key}
              className="bg-surface flex w-[287px] shrink-0 snap-start flex-col gap-6 rounded-3xl px-5 py-8 lg:w-auto"
            >
              {/* Decorative: the heading underneath names the step, and an
                  emoji read aloud ("writing hand") would only get in its way. */}
              <span
                aria-hidden="true"
                className="bg-primary-soft flex size-15 shrink-0 items-center justify-center rounded-full text-[32px] leading-[30px]"
              >
                {step.emoji}
              </span>
              <div className="flex flex-col gap-4.5">
                <h3 className="text-lg leading-[30px] font-semibold tracking-[-0.03em] lg:text-2xl">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em]">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
