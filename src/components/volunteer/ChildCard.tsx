import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { BrowseRow } from "@/features/claims/queries";

// One browsable child, as a full-width row — the same shape as the parent's
// application list, so the two sides of the product read alike.
//
// Renders ONLY what BrowseRow carries (the projection from toBrowseCard), so
// there is no path by which the delivery address or the family's contact could
// reach this markup.
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

  const place = (
    region: BrowseRow["currentRegion"],
    town: string | null,
  ): string | null => {
    if (!region) {
      return town ? t("town", { town }) : null;
    }
    return town
      ? `${tRegions(region)} (${t("town", { town })})`
      : tRegions(region);
  };

  const from = place(row.homeRegion, row.homeTown);
  const to = place(row.currentRegion, row.currentTown);

  return (
    <li className="border-border bg-surface flex flex-col gap-4 rounded-lg border p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-2">
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

        {/* The journey: where the family came from → where they are now. */}
        {from || to ? (
          <p className="text-muted-foreground text-sm">
            {from}
            {from && to ? <span aria-label={t("movedTo")}> → </span> : null}
            {to}
          </p>
        ) : null}

        {row.familyStory ? (
          <p className="text-body text-sm leading-relaxed whitespace-pre-wrap">
            {row.familyStory}
          </p>
        ) : null}

        {row.giftDescription ? (
          <p className="text-body text-sm font-medium">{row.giftDescription}</p>
        ) : null}

        {row.giftPrice ? (
          <p className="text-muted-foreground text-sm">
            {t("price", { price: Number(row.giftPrice) })}
          </p>
        ) : null}
      </div>

      {claimHref ? (
        <Link
          href={claimHref}
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring shrink-0 rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {t("claimCta")}
        </Link>
      ) : null}
    </li>
  );
}
