import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { ChevronRightIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/buttonStyles";

import { auditActionLabel } from "@/features/audit/actionLabel";
import {
  auditHref,
  isDefaultAuditQuery,
  type AuditQuery,
} from "@/features/audit/listQuery";

// A plain GET form, like the moderation filters: the browser builds the query
// string the page already parses, so filtering needs no client JavaScript and
// every filtered view stays a shareable url.
export async function AuditFilterForm({
  query,
  actions,
}: {
  query: AuditQuery;
  actions: readonly string[];
}) {
  const t = await getTranslations("admin.audit");

  // An action from the url that nothing has logged yet still has to show as
  // selected — otherwise the select reads «Усі дії» over a filtered list.
  // Sorted by what the admin reads, not by the code: the codes' order is
  // meaningless once each shows as its label.
  const options = (
    query.action && !actions.includes(query.action)
      ? [query.action, ...actions]
      : actions
  )
    .map((action) => ({ action, label: auditActionLabel(t, action) }))
    .sort((a, b) => a.label.localeCompare(b.label, "uk"));

  const field =
    "border-border bg-surface focus-visible:outline-ring rounded-md border py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    // Keyed by the applied query: the controls are uncontrolled, and «Скинути»
    // is a client-side navigation that re-renders this tree in place, so
    // without a remount the old values would stay on screen.
    <form
      key={auditHref(query)}
      method="get"
      action="/admin/audit"
      aria-label={t("filter.legend")}
      className="border-border bg-surface-muted flex flex-wrap items-end gap-3 rounded-lg border p-4"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="action" className="text-xs font-medium">
          {t("filter.action")}
        </label>
        {/* appearance-none plus our own chevron, as in the moderation filter:
            the platform's arrow lands against the border on macOS. */}
        <div className="relative">
          <select
            id="action"
            name="action"
            defaultValue={query.action ?? ""}
            className={`${field} w-full appearance-none truncate pr-9 pl-3 sm:w-auto sm:max-w-80`}
          >
            <option value="">{t("filter.allActions")}</option>
            {options.map(({ action, label }) => (
              <option key={action} value={action}>
                {label}
              </option>
            ))}
          </select>
          <ChevronRightIcon
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 rotate-90"
          />
        </div>
      </div>

      {/* A row of its own on a phone: beside the buttons a uuid shows four
          characters. */}
      <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:flex-1">
        <label htmlFor="target" className="text-xs font-medium">
          {t("filter.targetId")}
        </label>
        {/* pattern mirrors isUuid, so the browser refuses a malformed id
            instead of the server silently dropping it. */}
        <input
          type="text"
          id="target"
          name="target"
          defaultValue={query.targetId ?? ""}
          pattern="\s*[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\s*"
          autoComplete="off"
          spellCheck={false}
          className={`${field} w-full min-w-0 px-3 font-mono sm:min-w-80`}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="bg-primary text-primary-foreground focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {t("filter.apply")}
        </button>

        {/* Only once something is actually narrowed — a reset that resets
            nothing is noise on every page load. */}
        {isDefaultAuditQuery(query) ? null : (
          <Link
            href="/admin/audit"
            className={`${buttonVariants.outline} focus-visible:outline-ring rounded-md px-4 py-[calc(0.5rem-1.5px)] text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2`}
          >
            {t("filter.reset")}
          </Link>
        )}
      </div>
    </form>
  );
}
