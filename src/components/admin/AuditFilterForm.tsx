import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { ChevronRightIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/buttonStyles";
import { ACTOR_TYPES } from "@/db/enums";

import {
  auditDetailLabel,
  groupAuditActions,
} from "@/features/audit/actionLabel";
import {
  auditHref,
  isDefaultAuditQuery,
  type AuditQuery,
} from "@/features/audit/listQuery";

// Mirrors isUuid, so the browser refuses a malformed id instead of the server
// silently dropping it.
const UUID_PATTERN =
  "\\s*[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\s*";

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
  const groups = groupAuditActions(
    t,
    query.action && !actions.includes(query.action)
      ? [query.action, ...actions]
      : actions,
  );

  // The reasons a notification can fail, named by their copy — the same
  // vocabulary the log rows read in. A reason from the url without copy still
  // shows as selected, by its code, for the same reason as an action.
  const reasons = Object.keys(
    t.raw("actionDetails.notification") as Record<string, string>,
  );
  const reasonOptions = (
    query.reason && !reasons.includes(query.reason)
      ? [query.reason, ...reasons]
      : reasons
  ).map((reason) => ({
    reason,
    label: auditDetailLabel(t, "notification.failed", reason),
  }));

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
      <div className="flex min-w-0 flex-col gap-1 sm:min-w-40 sm:flex-1">
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
            className={`${field} w-full appearance-none truncate pr-9 pl-3`}
          >
            <option value="">{t("filter.allActions")}</option>
            {groups.map((group) => (
              <optgroup key={group.entity} label={group.label}>
                {group.options.map(({ action, label }) => (
                  <option key={action} value={action}>
                    {label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronRightIcon
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 rotate-90"
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1 sm:min-w-40 sm:flex-1">
        <label htmlFor="reason" className="text-xs font-medium">
          {t("filter.reason")}
        </label>
        <div className="relative">
          <select
            id="reason"
            name="reason"
            defaultValue={query.reason ?? ""}
            className={`${field} w-full appearance-none truncate pr-9 pl-3`}
          >
            <option value="">{t("filter.anyReason")}</option>
            {reasonOptions.map(({ reason, label }) => (
              <option key={reason} value={reason}>
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

      {/* One row from sm up: the two selects share what is left and shrink
          (their labels truncate), the id field is exactly one uuid wide — 36ch
          is exact in a monospace font, plus padding and border. On a phone it
          is a row of its own: beside anything else a uuid shows four
          characters. */}
      <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:flex-none">
        <label htmlFor="target" className="text-xs font-medium">
          {t("filter.targetId")}
        </label>
        <input
          type="text"
          id="target"
          name="target"
          defaultValue={query.targetId ?? ""}
          pattern={UUID_PATTERN}
          autoComplete="off"
          spellCheck={false}
          className={`${field} w-full min-w-0 px-3 font-mono sm:w-[calc(36ch+1.5rem+2px)]`}
        />
      </div>

      {/* WHO acted, on a row of its own with the buttons — one line from sm
          up: the type and the buttons keep their size, and the id field gives
          up width (never more than one uuid) when the row runs short. */}
      <div className="flex w-full flex-wrap items-end gap-3 sm:flex-nowrap">
        <div className="flex w-full min-w-0 flex-col gap-1 sm:w-44 sm:shrink-0">
          <label htmlFor="actorType" className="text-xs font-medium">
            {t("filter.actorType")}
          </label>
          <div className="relative">
            <select
              id="actorType"
              name="actorType"
              defaultValue={query.actorType ?? ""}
              className={`${field} w-full appearance-none truncate pr-9 pl-3`}
            >
              <option value="">{t("filter.anyActor")}</option>
              {ACTOR_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`filter.actorTypes.${type}`)}
                </option>
              ))}
            </select>
            <ChevronRightIcon
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 rotate-90"
            />
          </div>
        </div>

        {/* Also set by the admins list and the actor links, so narrowing by
            action stays inside that one person's log. */}
        <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:flex-initial">
          <label htmlFor="actor" className="text-xs font-medium">
            {t("filter.actorId")}
          </label>
          <input
            type="text"
            id="actor"
            name="actor"
            defaultValue={query.actorId ?? ""}
            pattern={UUID_PATTERN}
            autoComplete="off"
            spellCheck={false}
            className={`${field} w-full max-w-full min-w-0 px-3 font-mono sm:w-[calc(36ch+1.5rem+2px)]`}
          />
        </div>

        <div className="flex shrink-0 items-center gap-3">
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
      </div>
    </form>
  );
}
