import { useTranslations } from "next-intl";
import Link from "next/link";

import { ChevronRightIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/buttonStyles";
import {
  REVIEW_STATUS_FILTERS,
  reviewsHref,
  type ReviewStatusFilter,
} from "@/features/reviews/listFilter";

// A plain GET form, like the moderation and audit filters: the browser builds
// the query string the page already parses, so filtering needs no client
// JavaScript and every filtered list stays a shareable url.
//
// Not async (useTranslations, not getTranslations) so the page that nests it
// stays renderable in a test — React cannot await a component mid-tree.
export function ReviewFilterForm({ status }: { status: ReviewStatusFilter }) {
  const t = useTranslations("admin.reviews.filter");

  return (
    // Keyed by the applied filter: the select is uncontrolled, and «Скинути»
    // is a client-side navigation that re-renders this tree in place, so
    // without a remount the old value would stay on screen.
    <form
      key={status}
      method="get"
      action="/admin/reviews"
      aria-label={t("legend")}
      className="border-border bg-surface-muted flex flex-wrap items-end gap-3 rounded-lg border p-4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-xs">
        <label htmlFor="status" className="text-xs font-medium">
          {t("status")}
        </label>
        {/* appearance-none plus our own chevron, as in the other filters:
            the platform's arrow lands against the border on macOS. */}
        <div className="relative">
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="border-border bg-surface focus-visible:outline-ring w-full appearance-none truncate rounded-md border py-2 pr-9 pl-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {REVIEW_STATUS_FILTERS.map((option) => (
              <option key={option} value={option}>
                {t(option)}
              </option>
            ))}
          </select>
          <ChevronRightIcon
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 rotate-90"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="bg-primary text-primary-foreground focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {t("apply")}
        </button>

        {/* Only once something is actually narrowed — a reset that resets
            nothing is noise on every page load. */}
        {status === "all" ? null : (
          <Link
            href={reviewsHref("all")}
            className={`${buttonVariants.outline} focus-visible:outline-ring rounded-md px-4 py-[calc(0.5rem-1.5px)] text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2`}
          >
            {t("reset")}
          </Link>
        )}
      </div>
    </form>
  );
}
