import { useTranslations } from "next-intl";
import Link from "next/link";

import { CloseIcon } from "@/components/icons";
import { SITE_CONTAINER } from "@/components/site/layout";
import { SiteLogo } from "@/components/site/SiteLogo";
import { cn } from "@/lib/utils";

// The header of a full-page cabinet screen — the application card, the form,
// its briefing and its success page: the logo on the left and × on the right,
// no sidebar. × is a LINK back to wherever the screen was opened from, so
// leaving works with no script.
export function BarePageHeader({
  closeHref,
  closeLabel,
}: {
  closeHref: string;
  closeLabel: string;
}) {
  const tCommon = useTranslations("common");

  return (
    <header className={cn(SITE_CONTAINER, "py-6")}>
      <div className="flex items-start justify-between gap-4">
        <Link
          href="/"
          aria-label={tCommon("brand")}
          className="focus-visible:outline-ring shrink-0 rounded"
        >
          <SiteLogo width={135} height={135} className="h-14 w-auto lg:h-20" />
        </Link>
        <Link
          href={closeHref}
          aria-label={closeLabel}
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:size-[60px]"
        >
          <CloseIcon className="size-5 lg:size-6" />
        </Link>
      </div>
    </header>
  );
}
