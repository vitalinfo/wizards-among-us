import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/site/BrandMark";
import { cn } from "@/lib/utils";

// «Ми — невелика команда… не колл-центр» — the one piece of copy on this page
// that sets an expectation rather than offering a route, so it reads in the
// display face at the size the design gives it.
//
// The design DROPS this block from the 360px frame. Kept here at a phone size
// instead: most of this product is read on a phone, and the people most likely
// to worry about a slow reply are the ones on it. If that was deliberate
// rather than an omission, the fix is one `hidden lg:flex`.
export function TeamNote({ className }: { className?: string }) {
  const t = useTranslations("contacts");

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      {/* The logotype's heart on its own — the same asset the other sub-pages
          use above a heading, at the design's 84x93 from lg. */}
      <BrandMark
        width={84}
        height={93}
        className="h-[62px] w-auto lg:h-[93px]"
      />

      {/* Sized in vw from lg for the reason every other display heading here
          is: three balanced lines at 1920 become five ragged ones on a laptop
          if the size stays fixed while the column does not. */}
      {/* Two paragraphs, no space between them: the design breaks the line
          after «трохи часу.» rather than letting it wrap, and that break is
          what makes the block three balanced lines instead of a ragged four.
          Two sentences, so two <p> — a <br> inside one would read as a single
          run-on sentence to a screen reader. */}
      <div className="font-display mt-10 text-[28px] leading-7 font-bold tracking-[-0.06em] lg:mt-15 lg:text-[min(3.854vw,74px)] lg:leading-[min(3.646vw,70px)]">
        <p>
          {t.rich("note", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </p>
        <p>{t("noteThanks")}</p>
      </div>
    </div>
  );
}
