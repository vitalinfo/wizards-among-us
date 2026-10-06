"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import type { InitiativeStatus } from "@/features/initiatives/catalog";
import { CtaLink } from "@/components/ui/CtaLink";
import { cn } from "@/lib/utils";

import { Blob } from "./Blob";

const STATUS_TONES: Record<InitiativeStatus, string> = {
  open: "bg-status-open",
  soon: "bg-primary",
  closed: "bg-status-closed",
};

export function InitiativeCard({
  itemKey,
  image,
  status,
  detailsHref,
}: {
  // Copy key under `landing.initiatives.items`.
  itemKey: string;
  image: string;
  status: InitiativeStatus;
  // The initiative's own page. Optional only so the card can still be rendered
  // in a context that has no page behind it — which was the whole card's
  // situation until /initiatives/<slug> existed.
  detailsHref?: string;
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

      {/* Starts BELOW the badge rather than behind it. The design overlaps the
          two — the badge sits over the panel's top-left corner while the
          artwork's only content at that height is a narrow, centred hat — but
          that clearance is a property of the illustration, not of the layout:
          two of the three have wide content up there (stars, a tilted hat) and
          the badge landed on them at every width, the design's own 1920
          included. The offset is the badge's height, so nothing can collide
          whatever the artwork does or however long the label gets. */}
      <Image
        src={image}
        alt={t(`items.${itemKey}.imageAlt`)}
        width={608}
        height={760}
        className="mx-auto mt-[54px] w-[62%] lg:mt-[74px] lg:w-[52%]"
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

        {/* wrap + grow, NOT a breakpoint. The design puts the pair in a row,
            and at the 557px card it drew that fits — our shared pill carries
            88px of padding around its label, so the two need ~448px of inner
            width. Below that they have to stack, and the width where that
            happens depends on the card, the grid and the label, not on a
            number I can pick: a `2xl:flex-row` guess clipped «Детальніше» by
            29px at 1600. Flex wrapping decides it from the real measurements,
            and `grow` makes a wrapped button fill its own row. */}
        <div className="flex flex-wrap gap-3">
          {/* Open: a real link into the application form. Otherwise a real
              DISABLED BUTTON rather than a greyed-out link — a control that
              cannot be used should not be focusable, announced as a link, or
              reachable by keyboard as one. */}
          {status === "open" ? (
            <CtaLink href="/parent" className="grow whitespace-nowrap">
              {t("cta")}
            </CtaLink>
          ) : (
            <button
              type="button"
              disabled
              className="bg-disabled text-disabled-foreground inline-flex h-16 grow items-center justify-center rounded-full px-11 text-base font-medium whitespace-nowrap lg:h-[78px] lg:text-xl"
            >
              {t("cta")}
            </button>
          )}

          {/* «Детальніше» was in the design from the start and was left out
              because there was no page behind it — a button that goes nowhere
              is worse than a missing one. Now there is. */}
          {detailsHref ? (
            <CtaLink
              href={detailsHref}
              variant="outline"
              className="grow whitespace-nowrap"
            >
              {t("details")}
            </CtaLink>
          ) : null}
        </div>
      </div>
    </li>
  );
}
