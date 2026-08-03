"use client";

import { useTranslations } from "next-intl";

import { CheckIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const POINTS = ["cost", "one", "direct"] as const;

export function VolunteerInfo() {
  const t = useTranslations("volunteer");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-10 sm:px-8">
      {/* Non-identifying illustrative placeholder — swap for a consented photo. */}
      <div
        role="img"
        aria-label={t("imageAlt")}
        className="from-primary-tint to-surface border-border flex h-44 items-center justify-center rounded-lg border bg-gradient-to-br"
      >
        <span
          aria-hidden="true"
          className="text-primary-tint-foreground/70 px-6 text-center text-sm"
        >
          {t("imageAlt")}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <Badge className="self-start">{t("badge")}</Badge>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          {t("intro")}
        </p>
      </div>

      <ul className="flex flex-col gap-2.5">
        {POINTS.map((point) => (
          <li key={point} className="flex items-start gap-2.5">
            <CheckIcon className="text-primary mt-0.5 size-[18px] shrink-0" />
            <span className="text-base leading-normal">
              {t(`points.${point}`)}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-border bg-surface-muted flex flex-col gap-2 rounded-lg border p-4">
        <span className="text-[15px] font-semibold">
          {t("rulesCard.title")}
        </span>
        <p className="text-body text-[15px] leading-normal">
          {t("rulesCard.body")}
        </p>
      </div>

      {/* Auth-gated action — wired to Telegram login in Phase 3. */}
      <Button className="w-full">{t("browseCta")}</Button>
      <span className="text-muted-foreground text-center text-[13px] leading-normal">
        {t("loginNote")}
      </span>
    </main>
  );
}
