import { useTranslations } from "next-intl";

import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

import { SectionHeading } from "./SectionHeading";

// The four routes in, in the design's order. The emoji IS the design's icon
// here — it draws 👥 🎁 🏷️ 🤝 in tinted discs rather than commissioning a set,
// so there is nothing to add to src/components/icons.
const WAYS = [
  { key: "team", emoji: "👥" },
  { key: "initiative", emoji: "🎁" },
  { key: "goods", emoji: "🏷️" },
  { key: "idea", emoji: "🤝" },
] as const;

export function WaysToHelp() {
  const t = useTranslations("partners.ways");

  return (
    // Solid cream, the warm counterweight to the blue canvas the partner list
    // sits on.
    <section className="bg-cream">
      <div className={cn(SITE_CONTAINER, "py-15 lg:py-25")}>
        <SectionHeading
          label={t("label")}
          title={t("title")}
          subtitle={t("subtitle")}
        />

        {/* The same scroller as the partner list below lg — the design lays
            these four out in a row 1179px wide inside a 360px frame, and that
            IS the intent here (Vital), not the accident it was on the landing
            page's «Наші ініціативи». Four columns from lg. */}
        <ul className="-mx-4 mt-8 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-[15px] sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-20 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0">
          {WAYS.map(({ key, emoji }) => (
            <li
              key={key}
              className="bg-surface flex w-[287px] shrink-0 snap-start flex-col gap-6 rounded-3xl px-5 py-8 lg:w-auto"
            >
              {/* Decorative: the heading underneath names the route, and an
                  emoji read aloud ("busts in silhouette") would only get in
                  the way of it. */}
              <span
                aria-hidden="true"
                className="bg-primary-soft flex size-15 shrink-0 items-center justify-center rounded-full text-[32px] leading-[30px]"
              >
                {emoji}
              </span>
              <div className="flex flex-col gap-4.5">
                <h3 className="text-lg leading-[30px] font-semibold tracking-[-0.03em] lg:text-2xl">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em]">
                  {t(`items.${key}.description`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
