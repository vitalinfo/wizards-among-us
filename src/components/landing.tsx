"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

const STEPS = ["submit", "match", "deliver"] as const;

export function Landing() {
  const t = useTranslations("landing");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-16 px-6 py-16">
      <section className="flex flex-col gap-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="text-foreground/80 mx-auto max-w-2xl text-lg text-balance">
          {t("subtitle")}
        </p>
        <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/parent"
            className="rounded-full bg-[#c2410c] px-6 py-3 font-medium text-white transition-colors hover:bg-[#9a3412]"
          >
            {t("parentCta")}
          </Link>
          <Link
            href="/volunteer"
            className="border-foreground/20 hover:bg-foreground/5 rounded-full border px-6 py-3 font-medium transition-colors"
          >
            {t("volunteerCta")}
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-center text-2xl font-semibold">
          {t("howItWorksTitle")}
        </h2>
        <ol className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step}
              className="border-foreground/10 flex flex-col gap-2 rounded-2xl border p-6"
            >
              <span className="text-foreground/50 text-sm font-semibold">
                {index + 1}
              </span>
              <h3 className="font-semibold">{t(`steps.${step}.title`)}</h3>
              <p className="text-foreground/75 text-sm">
                {t(`steps.${step}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-foreground/60 text-center text-sm">
        {t("footerNote")}
      </p>
    </main>
  );
}
