"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const STATS = [
  { value: "1 240", key: "dreams" },
  { value: "860", key: "wizards" },
  { value: "18", key: "regions" },
] as const;

export function Stats() {
  const t = useTranslations("landing.stats");

  return (
    <section className="bg-surface-muted border-divider border-y">
      <dl className="mx-auto grid w-full max-w-6xl grid-cols-3">
        {STATS.map((stat, i) => (
          <div
            key={stat.key}
            className={cn(
              "flex flex-col gap-1 px-4 py-6 sm:px-8 sm:py-7",
              i > 0 && "border-divider border-l",
            )}
          >
            <dt className="text-primary order-2 text-[13px] sm:text-sm">
              {t(stat.key)}
            </dt>
            <dd className="text-primary order-1 text-2xl font-semibold sm:text-[32px]">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
