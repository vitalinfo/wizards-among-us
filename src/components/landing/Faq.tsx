"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { ArrowRightIcon, CloseIcon } from "@/components/icons";
import { SITE_CONTAINER } from "@/components/site/layout";
import type { PublicFaq } from "@/features/faqs/queries";
import { cn } from "@/lib/utils";

import { SectionLabel } from "./SectionLabel";

// The questions come from the DATABASE (admin-managed at /admin/faqs), not from
// messages/uk.json: the answers state what a volunteer can see and whether we
// take money, and those follow policy rather than releases. Only the section
// heading and lead-in are copy.
//
// No entries means no section — not a heading over an empty box, and
// deliberately no hardcoded fallback (see listActiveFaqs for why a second copy
// of these answers would be a privacy hazard rather than a nicety).
export function Faq({ items }: { items: readonly PublicFaq[] }) {
  const t = useTranslations("landing.faq");

  if (items.length === 0) {
    return null;
  }

  return (
    <section className={cn(SITE_CONTAINER, "relative py-15 lg:py-25")}>
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-[2.56%]">
        <div className="flex flex-col gap-4.5 lg:w-[39.88%] lg:shrink-0 lg:gap-8">
          <div className="flex flex-col items-start gap-4.5 lg:gap-5">
            <SectionLabel>{t("label")}</SectionLabel>
            <h2 className="font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:text-[80px] lg:leading-[70px]">
              {t("title")}
            </h2>
          </div>
          <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:max-w-[446px] lg:text-lg">
            {t("subtitle")}
          </p>

          {/* The brand heart again, mirrored, at the foot of the column. It
              only has room to sit under the copy on the wide frame. */}
          <Image
            src="/heart.svg"
            alt=""
            aria-hidden="true"
            width={84}
            height={93}
            className="mt-auto hidden -scale-x-100 lg:block"
          />
        </div>

        {/* <details>, not a JavaScript accordion. The answers are the page's
            factual claims — what a volunteer can see, whether we take money —
            and they have to open on a phone with a broken bundle as readily as
            anywhere else. The browser gives us the toggling, the keyboard
            handling and the aria-expanded for free. */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {items.map((item) => (
            <details
              key={item.id}
              name="faq"
              className="border-foreground/6 open:bg-cream-soft group rounded-3xl border px-5 py-5 lg:px-8 lg:py-6"
            >
              <summary className="focus-visible:outline-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 [&::-webkit-details-marker]:hidden">
                <span className="text-muted-foreground text-lg leading-[30px] font-semibold tracking-[-0.03em] lg:text-2xl">
                  {item.title}
                </span>
                {/* One control, two faces: a blue disc with an arrow while
                    closed, and the panel's own cream with a cross once open —
                    which is exactly how the design draws the opened row. */}
                <span className="bg-primary text-primary-foreground group-open:bg-cream-soft group-open:text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-full transition-colors lg:size-[73px]">
                  <ArrowRightIcon className="size-6 group-open:hidden" />
                  <CloseIcon className="hidden size-6 group-open:block" />
                </span>
              </summary>
              {/* pre-line: the answer is admin-written in a textarea, so the
                  paragraph breaks they typed have to survive. */}
              <p className="text-muted-foreground mt-3 max-w-[682px] text-base leading-[22px] tracking-[-0.03em] whitespace-pre-line lg:text-lg">
                {item.description}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
