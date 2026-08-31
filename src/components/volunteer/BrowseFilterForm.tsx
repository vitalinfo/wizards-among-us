import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { AGE_BANDS, type BrowseQuery } from "@/features/claims/browseFilters";
import { regionOptions } from "@/lib/regionOptions";

// A plain GET form: the browser turns it into the query string the page already
// parses, so filtering needs no client JavaScript and every result set stays a
// shareable url.
export async function BrowseFilterForm({
  query,
  anchor,
}: {
  query: BrowseQuery;
  // Applying a filter returns to the results rather than the top of the page.
  // A GET form keeps the fragment from its action (verified in a browser).
  anchor: string;
}) {
  const t = await getTranslations("volunteer.children.filters");
  const tRegions = await getTranslations("regions");
  // Sorted by the Ukrainian label — the enum's slug order reads as random to
  // someone scanning Cyrillic.
  const regions = regionOptions(tRegions);

  const field =
    "border-border bg-surface focus-visible:outline-ring rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <form
      method="get"
      action={`/volunteer/children#${anchor}`}
      className="border-border bg-surface-muted flex flex-wrap items-end gap-3 rounded-lg border p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="region" className="text-xs font-medium">
          {t("region")}
        </label>
        <select
          id="region"
          name="region"
          defaultValue={query.region ?? ""}
          className={field}
        >
          <option value="">{t("anyRegion")}</option>
          {regions.map((region) => (
            <option key={region.value} value={region.value}>
              {region.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="availability" className="text-xs font-medium">
          {t("availability")}
        </label>
        <select
          id="availability"
          name="availability"
          defaultValue={query.availability}
          className={field}
        >
          <option value="all">{t("any")}</option>
          <option value="available">{t("available")}</option>
          <option value="claimed">{t("claimed")}</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="age" className="text-xs font-medium">
          {t("age")}
        </label>
        <select
          id="age"
          name="age"
          defaultValue={query.age ?? ""}
          className={field}
        >
          <option value="">{t("anyAge")}</option>
          {AGE_BANDS.map((band) => (
            <option key={band.key} value={band.key}>
              {t(`ageBands.${band.key}`)}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {t("apply")}
      </button>
      <Link
        href={`/volunteer/children#${anchor}`}
        className="text-primary text-sm font-semibold underline underline-offset-4"
      >
        {t("reset")}
      </Link>
    </form>
  );
}
