import { getTranslations } from "next-intl/server";

import { FilterTabs } from "@/components/ui/FilterTabs";
import { CLAIM_TABS, claimsHref } from "@/features/claims/claimTabs";
import type { ClaimTab } from "@/features/claims/queries";
import type { PageSize } from "@/lib/pageSize";

// «Всі | Активні | Завершені» (Figma 130:2506), on the shared tab strip. A tab
// keeps the page size and starts again from page 1.
export async function ClaimTabs({
  current,
  per,
}: {
  current: ClaimTab;
  per?: PageSize;
}) {
  const t = await getTranslations("volunteer.claims.tabs");

  return (
    <FilterTabs
      label={t("label")}
      current={current}
      tabs={CLAIM_TABS.map((tab) => ({
        key: tab,
        label: t(tab),
        href: claimsHref({ tab, per }),
      }))}
    />
  );
}
