"use client";

import { useTranslations } from "next-intl";

import { ShieldIcon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";

const STEPS = ["fill", "review", "match"] as const;

export function ParentInfo() {
  const t = useTranslations("parent");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-10 sm:px-8">
      <div className="flex flex-col gap-3">
        <Badge className="self-start">{t("badge")}</Badge>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          {t("intro")}
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-start gap-3">
            <span className="bg-primary-tint text-primary-tint-foreground mt-0.5 flex size-6.5 shrink-0 items-center justify-center rounded-full text-[13px] font-bold">
              {i + 1}
            </span>
            <span className="text-base leading-normal">
              {t(`steps.${step}`)}
            </span>
          </li>
        ))}
      </ol>

      <div className="border-border bg-surface-muted flex flex-col gap-2.5 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <ShieldIcon className="text-primary size-[18px]" />
          <span className="text-[15px] font-semibold">
            {t("privacyCard.title")}
          </span>
        </div>
        <p className="text-body text-[15px] leading-normal">
          {t("privacyCard.body")}
        </p>
      </div>

      {/* Both lead to «Мої анкети», which is where an application is started
          and listed. That page requires a session and redirects to /login, so
          the signed-out case is handled in one place rather than duplicated in
          every entry point. */}
      <div className="flex flex-col gap-2.5">
        <ButtonLink href="/parent/applications" className="w-full">
          {t("applyCta")}
        </ButtonLink>
        <ButtonLink
          href="/parent/applications"
          variant="outline"
          className="w-full"
        >
          {t("myApplicationsCta")}
        </ButtonLink>
      </div>
      <span className="text-muted-foreground text-center text-[13px] leading-normal">
        {t("loginNote")}
      </span>
    </main>
  );
}
