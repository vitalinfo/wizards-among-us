import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/buttonStyles";

import {
  isDefaultUsersQuery,
  type UsersQuery,
} from "@/features/users/listQuery";

// A plain GET form, like the moderation filters: the browser builds the query
// string the page already parses, so searching needs no client JavaScript and
// every result set stays a shareable url.
export async function UserSearchForm({ query }: { query: UsersQuery }) {
  const t = await getTranslations("admin.users.search");

  return (
    // Keyed by the applied search: the input is uncontrolled, and «Скинути» is
    // a client-side navigation that re-renders this tree in place, so without
    // a remount the old term would stay in the box over an unfiltered list.
    <form
      key={query.search}
      method="get"
      action="/admin/users"
      role="search"
      className="border-border bg-surface-muted flex flex-col gap-1 rounded-lg border p-4"
    >
      <label htmlFor="q" className="text-xs font-medium">
        {t("label")}
      </label>
      {/* The input and the buttons share a row of their own, with the hint
          below it: aligned to the bottom of a column that also held the hint,
          the buttons lined up with the hint rather than the input. */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          id="q"
          name="q"
          defaultValue={query.search}
          placeholder={t("placeholder")}
          aria-describedby="q-hint"
          className="border-border bg-surface focus-visible:outline-ring min-w-64 flex-1 rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        />

        <button
          type="submit"
          className="bg-primary text-primary-foreground focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {t("submit")}
        </button>

        {/* Only once something is actually searched — a reset that resets
            nothing is noise on every page load. Styled as the outline button
            beside «Знайти»; the vertical padding gives back the border's 1.5px
            so the two stand the same height. */}
        {isDefaultUsersQuery(query) ? null : (
          <Link
            href="/admin/users"
            className={`${buttonVariants.outline} focus-visible:outline-ring rounded-md px-4 py-[calc(0.5rem-1.5px)] text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2`}
          >
            {t("reset")}
          </Link>
        )}
      </div>
      <p id="q-hint" className="text-muted-foreground text-xs">
        {t("hint")}
      </p>
    </form>
  );
}
