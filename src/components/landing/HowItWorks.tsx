"use client";

import { useTranslations } from "next-intl";

const STEPS = ["tell", "verify", "choose", "done"] as const;

export function HowItWorks() {
  const t = useTranslations("landing.how");

  return (
    <section
      id="how"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-14 sm:px-8"
    >
      <h2 className="text-2xl font-semibold">{t("title")}</h2>
      <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className="border-border flex flex-col gap-2.5 rounded-lg border p-5.5"
          >
            <span className="bg-primary-tint text-primary-tint-foreground flex size-8 items-center justify-center rounded-full text-[15px] font-bold">
              {i + 1}
            </span>
            <h3 className="text-[17px] font-semibold">
              {t(`steps.${step}.title`)}
            </h3>
            <p className="text-muted-foreground text-[15px] leading-normal">
              {t(`steps.${step}.body`)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
