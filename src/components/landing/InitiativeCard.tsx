"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { CtaLink } from "@/components/ui/CtaLink";
import { cn } from "@/lib/utils";

import { Blob } from "./Blob";

export type InitiativeStatus = "open" | "soon" | "closed";

const STATUS_TONES: Record<InitiativeStatus, string> = {
  open: "bg-status-open",
  soon: "bg-primary",
  closed: "bg-status-closed",
};

export function InitiativeCard({
  itemKey,
  image,
  status,
}: {
  // Copy key under `landing.initiatives.items`.
  itemKey: string;
  image: string;
  status: InitiativeStatus;
}) {
  const t = useTranslations("landing.initiatives");

  return (
    <li className="bg-surface relative isolate flex flex-col overflow-hidden rounded-3xl shadow-[12px_12px_60px_0_rgba(121,121,121,0.08)]">
      {/* The blob is anchored to the TOP of the card and deliberately wider
          than it — the design lets it run off both edges and the card clips
          it. Its box is the design's inset, as a fraction of a 557x657 card. */}
      <Blob className="text-cream absolute top-[-58.15%] -right-[16.71%] -left-[16.52%] -z-10 h-[105.85%]" />

      <span
        className={cn(
          "absolute top-[18px] left-[18px] rounded-full px-2 py-[9px] text-sm leading-[14px] font-medium text-white lg:top-[26px] lg:left-[26px] lg:px-3 lg:py-3 lg:text-sm lg:leading-5",
          STATUS_TONES[status],
        )}
      >
        {t(`status.${status}`)}
      </span>

      <Image
        src={image}
        alt={t(`items.${itemKey}.imageAlt`)}
        width={608}
        height={760}
        className="mx-auto mt-2.5 w-[62%] lg:w-[52%]"
      />

      <div className="flex flex-1 flex-col gap-6 px-[18px] pt-2 pb-[18px] lg:px-[26px] lg:pb-[26px]">
        <div className="flex flex-1 flex-col gap-4.5">
          <h3 className="text-muted-foreground text-2xl leading-[30px] font-semibold tracking-[-0.03em]">
            {t(`items.${itemKey}.title`)}
          </h3>
          <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em]">
            {t(`items.${itemKey}.body`)}
          </p>
        </div>

        {/* Open: a real link into the application form. Otherwise a real
            DISABLED BUTTON rather than a greyed-out link — a control that
            cannot be used should not be focusable, announced as a link, or
            reachable by keyboard as one. */}
        {status === "open" ? (
          <CtaLink href="/parent" className="w-full lg:w-auto lg:self-start">
            {t("cta")}
          </CtaLink>
        ) : (
          <button
            type="button"
            disabled
            className="bg-disabled text-disabled-foreground inline-flex h-16 w-full items-center justify-center rounded-full px-11 text-base font-medium lg:h-[78px] lg:w-auto lg:self-start lg:text-xl"
          >
            {t("cta")}
          </button>
        )}
      </div>
    </li>
  );
}
