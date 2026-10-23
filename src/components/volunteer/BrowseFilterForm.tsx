import { getTranslations } from "next-intl/server";

import { ChevronRightIcon, CloseIcon, FiltersIcon } from "@/components/icons";
import { AGE_BANDS, type BrowseQuery } from "@/features/claims/browseFilters";
import { displacedFromRegionOptions } from "@/lib/regionOptions";
import { cn } from "@/lib/utils";

// The browse filters (Figma 118:420): a row of two pickers and «Застосувати»
// from lg, and a full-screen sheet behind «Застосувати фільтр» on a phone.
//
// A plain GET form, so filtering needs no client JavaScript and every result
// set stays a shareable url — the same reason the pager is links. The phone
// sheet is a <details>, for the same reason again: it opens, traps nothing, and
// closes with the keyboard because the element does that itself.
//
// Two filters, not three. The design drops the availability picker the first
// version had; a child who already has a charivnyk stays in the list either
// way (Phase 6), and the card says so in words.
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
  // The filter is on home_region — where the family LEFT — so it offers only
  // the oblasts the form can record, not all twenty-five. Sorted by the
  // Ukrainian label; the enum's slug order reads as random in Cyrillic.
  const regions = displacedFromRegionOptions(tRegions);
  const action = `/account/volunteer/children#${anchor}`;

  // appearance-none plus our own chevron. The platform's arrow sits in a
  // different place, at a different size, on every OS — on macOS it lands well
  // inside the field and reads as a stray mark next to the label — and the
  // design draws one small chevron 16px from the right edge.
  const select =
    "border-border bg-surface text-foreground focus-visible:outline-ring h-12 w-full appearance-none rounded-lg border pr-11 pl-4 text-sm tracking-[-0.06em] focus-visible:outline-2 focus-visible:outline-offset-2";
  const apply =
    "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring inline-flex h-12 items-center justify-center rounded-lg px-8 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

  // Both layouts render the same two controls, so the markup is written once
  // and placed twice. They are separate FORMS rather than one form shown twice,
  // because two copies of the same input name in one form would submit both.
  const fields = (
    <>
      <div className="relative w-full lg:w-[386px]">
        <label htmlFor="region" className="sr-only">
          {t("region")}
        </label>
        <select
          id="region"
          name="region"
          defaultValue={query.region ?? ""}
          className={select}
        >
          <option value="">{t("region")}</option>
          {regions.map((region) => (
            <option key={region.value} value={region.value}>
              {region.label}
            </option>
          ))}
        </select>
        <Chevron />
      </div>

      <div className="relative w-full lg:w-[172px]">
        <label htmlFor="age" className="sr-only">
          {t("age")}
        </label>
        <select
          id="age"
          name="age"
          defaultValue={query.age ?? ""}
          className={select}
        >
          <option value="">{t("age")}</option>
          {AGE_BANDS.map((band) => (
            <option key={band.key} value={band.key}>
              {t(`ageBands.${band.key}`)}
            </option>
          ))}
        </select>
        <Chevron />
      </div>
    </>
  );

  return (
    <>
      {/* The row, from lg. */}
      <form
        method="get"
        action={action}
        className="hidden items-center gap-4 lg:flex"
      >
        <FiltersIcon aria-hidden="true" className="text-foreground size-6" />
        {fields}
        <button type="submit" className={apply}>
          {t("apply")}
        </button>
      </form>

      {/* The sheet, below lg. ONE <summary>, which is both the trigger and
          the × — only the first summary in a <details> is the disclosure
          control, so a second one in the panel would render a close button
          that does nothing. Open, it moves itself to the corner the design
          draws it in and swaps its contents, which also swaps its accessible
          name from «Застосувати фільтр» to «Закрити фільтр». */}
      <details className="group lg:hidden">
        <summary className="focus-visible:outline-ring flex w-fit cursor-pointer list-none items-center gap-3 text-sm font-medium tracking-[-0.06em] group-open:fixed group-open:top-4 group-open:right-4 group-open:z-60 group-open:size-10 group-open:justify-center group-open:gap-0 group-open:rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
          <FiltersIcon
            aria-hidden="true"
            className="size-6 group-open:hidden"
          />
          <CloseIcon
            aria-hidden="true"
            className="text-muted-foreground hidden size-6 group-open:block"
          />
          <span className="group-open:hidden">{t("openSheet")}</span>
          <span className="sr-only hidden group-open:inline">
            {t("closeSheet")}
          </span>
        </summary>

        <div className="bg-surface fixed inset-0 z-50 flex flex-col gap-6 overflow-y-auto p-4 pt-20">
          <span className="flex items-center gap-3 text-base font-medium">
            <FiltersIcon aria-hidden="true" className="size-6" />
            {t("sheetTitle")}
          </span>

          <form method="get" action={action} className="flex flex-col gap-4">
            {fields}
            <button type="submit" className={cn(apply, "h-14 rounded-full")}>
              {t("apply")}
            </button>
          </form>
        </div>
      </details>
    </>
  );
}

// The picker's own chevron, 16px from the right edge as drawn. pointer-events
// off, so clicking it still opens the select underneath; aria-hidden, because
// the select already announces itself as a combobox.
function Chevron() {
  return (
    <ChevronRightIcon
      aria-hidden="true"
      className="text-muted-foreground pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 rotate-90"
    />
  );
}
