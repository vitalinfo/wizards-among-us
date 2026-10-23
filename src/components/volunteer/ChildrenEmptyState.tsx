import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { ctaVariants } from "@/components/ui/ctaStyles";
import { cn } from "@/lib/utils";

// «Тут поки що немає історій родин» (Figma 118:420). Shown when the list has
// nothing in it — either because no family has been approved yet, or because a
// filter excluded everyone.
//
// The CTA goes to «Мої підопічні» rather than clearing the filters, which is
// what the design draws: if there is nothing here, the useful thing is the
// children this volunteer already has. When a FILTER is what emptied the list,
// the page says so above instead — a volunteer who just picked an oblast needs
// to know the oblast is the reason, not that the initiative is empty.
export async function ChildrenEmptyState({ filtered }: { filtered: boolean }) {
  const t = await getTranslations("volunteer.children.emptyState");

  return (
    <div className="flex flex-col items-center py-16 text-center lg:py-24">
      <h2 className="font-display max-w-[320px] text-[40px] leading-10 font-bold tracking-[-0.03em] lg:max-w-[560px] lg:text-[64px] lg:leading-[64px]">
        {t.rich(filtered ? "filteredTitle" : "title", {
          em: (chunks) => <span className="text-primary">{chunks}</span>,
        })}
      </h2>
      <p className="text-muted-foreground mt-6 max-w-[320px] text-sm leading-5 tracking-[-0.03em] lg:max-w-[600px] lg:text-base">
        {t(filtered ? "filteredBody" : "body")}
      </p>
      <Link
        href="/account/volunteer/claims"
        className={cn(
          ctaVariants.accent,
          "focus-visible:outline-ring mt-8 inline-flex h-14 items-center justify-center rounded-full px-8 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:mt-10",
        )}
      >
        {t("cta")}
      </Link>
    </div>
  );
}
