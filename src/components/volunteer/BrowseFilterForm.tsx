import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { UKRAINE_REGIONS } from "@/db/enums";
import type { BrowseQuery } from "@/features/claims/browseFilters";

// A plain GET form: the browser turns it into the query string the page already
// parses, so filtering needs no client JavaScript and every result set stays a
// shareable url.
export async function BrowseFilterForm({ query }: { query: BrowseQuery }) {
  const t = await getTranslations("volunteer.children.filters");
  const tRegions = await getTranslations("regions");

  const field =
    "border-border bg-surface focus-visible:outline-ring rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <form
      method="get"
      action="/volunteer/children"
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
          {UKRAINE_REGIONS.map((region) => (
            <option key={region} value={region}>
              {tRegions(region)}
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
        <label htmlFor="minAge" className="text-xs font-medium">
          {t("minAge")}
        </label>
        <input
          id="minAge"
          name="minAge"
          type="number"
          min={0}
          max={18}
          inputMode="numeric"
          defaultValue={query.minAge ?? ""}
          className={`${field} w-24`}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="maxAge" className="text-xs font-medium">
          {t("maxAge")}
        </label>
        <input
          id="maxAge"
          name="maxAge"
          type="number"
          min={0}
          max={18}
          inputMode="numeric"
          defaultValue={query.maxAge ?? ""}
          className={`${field} w-24`}
        />
      </div>

      <button
        type="submit"
        className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {t("apply")}
      </button>
      <Link
        href="/volunteer/children"
        className="text-primary text-sm font-semibold underline underline-offset-4"
      >
        {t("reset")}
      </Link>
    </form>
  );
}
