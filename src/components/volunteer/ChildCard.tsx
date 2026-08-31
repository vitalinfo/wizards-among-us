import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { BrowseRow } from "@/features/claims/queries";

// One browsable child. Renders ONLY what BrowseRow carries — the redacted
// projection from toBrowseCard — so there is no path by which an address or a
// contact could reach this markup (child-data invariant, tier 1).
export async function ChildCard({
  row,
  claimHref,
}: {
  row: BrowseRow;
  // null when this volunteer can't claim it (already taken).
  claimHref: string | null;
}) {
  const t = await getTranslations("volunteer.children");
  const tRegions = await getTranslations("regions");
  const tAge = await getTranslations("parent.applications");

  return (
    <li className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{row.childFirstName ?? t("noName")}</h3>
        {row.childAge !== null ? (
          <span className="text-muted-foreground text-sm">
            {tAge("ageSuffix", { age: row.childAge })}
          </span>
        ) : null}
        {/* Status by text, not colour alone. */}
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            row.claimed
              ? "bg-surface-muted text-muted-foreground border-border"
              : "bg-primary/10 text-primary border-primary/30"
          }`}
        >
          {row.claimed ? t("claimed") : t("available")}
        </span>
      </div>

      {row.currentRegion ? (
        <p className="text-muted-foreground text-sm">
          {tRegions(row.currentRegion)}
        </p>
      ) : null}

      {row.giftDescription ? (
        <p className="text-body text-sm">{row.giftDescription}</p>
      ) : null}

      {row.giftPrice ? (
        <p className="text-sm font-medium">
          {t("price", { price: Number(row.giftPrice) })}
        </p>
      ) : null}

      {claimHref ? (
        <Link
          href={claimHref}
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring mt-1 w-fit rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {t("claimCta")}
        </Link>
      ) : null}
    </li>
  );
}
