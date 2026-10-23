import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { ChevronRightIcon } from "@/components/icons";

import { CLAIM_TABS, claimsHref } from "@/features/claims/claimTabs";
import type { ClaimTab } from "@/features/claims/queries";
import { cn } from "@/lib/utils";

// «Всі | Активні | Завершені» (Figma 130:2506).
//
// LINKS, not buttons: each tab is a url, so it survives a reload, can be shared
// and needs no client JavaScript — the same reason the pager and the browse
// filters are links. `aria-current` is what says which one you are on; the
// filled pill is the redundant visual cue.
export async function ClaimTabs({ current }: { current: ClaimTab }) {
  const t = await getTranslations("volunteer.claims.tabs");

  const pill =
    "focus-visible:outline-ring inline-flex h-9 items-center rounded-full px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";
  const links = CLAIM_TABS.map((tab) => {
    const active = tab === current;
    return (
      <li key={tab}>
        <Link
          href={claimsHref({ tab })}
          aria-current={active ? "page" : undefined}
          className={cn(
            pill,
            active
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-primary",
          )}
        >
          {t(tab)}
        </Link>
      </li>
    );
  });

  return (
    <nav aria-label={t("label")}>
      {/* Three pills from lg. */}
      <ul className="border-divider bg-surface hidden w-fit items-center gap-2 rounded-full border p-1 lg:flex">
        {links}
      </ul>

      {/* One pill that opens the other two on a phone, which is what the
          design draws — three pills and a 328px screen do not fit. A <details>
          rather than a <select>: a select cannot navigate without JavaScript,
          and these are links. */}
      <details className="group w-fit lg:hidden">
        <summary
          className={cn(
            pill,
            "bg-primary text-primary-foreground focus-visible:outline-ring cursor-pointer list-none gap-2 [&::-webkit-details-marker]:hidden",
          )}
        >
          {t(current)}
          <ChevronRightIcon
            aria-hidden="true"
            className="size-4 rotate-90 transition-transform group-open:-rotate-90"
          />
        </summary>
        <ul className="border-divider bg-surface mt-2 flex w-fit flex-col gap-1 rounded-2xl border p-1">
          {links}
        </ul>
      </details>
    </nav>
  );
}
