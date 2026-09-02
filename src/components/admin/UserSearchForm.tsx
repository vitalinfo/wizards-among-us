import { getTranslations } from "next-intl/server";
import Link from "next/link";

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
    <form
      method="get"
      action="/admin/users"
      role="search"
      className="border-border bg-surface-muted flex flex-wrap items-end gap-3 rounded-lg border p-4"
    >
      <div className="flex min-w-64 flex-1 flex-col gap-1">
        <label htmlFor="q" className="text-xs font-medium">
          {t("label")}
        </label>
        <input
          type="search"
          id="q"
          name="q"
          defaultValue={query.search}
          placeholder={t("placeholder")}
          aria-describedby="q-hint"
          className="border-border bg-surface focus-visible:outline-ring rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        <p id="q-hint" className="text-muted-foreground text-xs">
          {t("hint")}
        </p>
      </div>

      <button
        type="submit"
        className="bg-primary text-primary-foreground focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {t("submit")}
      </button>

      {/* Only once something is actually searched — a reset that resets nothing
          is noise on every page load. */}
      {isDefaultUsersQuery(query) ? null : (
        <Link
          href="/admin/users"
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {t("reset")}
        </Link>
      )}
    </form>
  );
}
