import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { APPLICATION_STATUSES } from "@/db/enums";
import {
  DEFAULT_MODERATION_FILTER,
  isDefaultModerationQuery,
  moderationQueueHref,
  type ModerationQuery,
} from "@/features/applications/moderationFilter";

// A plain GET form, like the volunteer browse filters: the browser builds the
// query string the page already parses, so filtering needs no client
// JavaScript and every filtered queue stays a shareable, bookmarkable url.
//
// It replaces a row of status links. Those could only express one dimension —
// adding a date range to them would have meant a link per combination.
export async function ModerationFilterForm({
  query,
}: {
  query: ModerationQuery;
}) {
  const t = await getTranslations("admin.applications.filter");
  const tStatus = await getTranslations("parent.applications.status");

  const field =
    "border-border bg-surface focus-visible:outline-ring rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <form
      method="get"
      action="/admin/applications"
      aria-label={t("legend")}
      className="border-border bg-surface-muted flex flex-wrap items-end gap-3 rounded-lg border p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-xs font-medium">
          {t("status")}
        </label>
        <select
          id="status"
          name="status"
          defaultValue={query.filter}
          className={field}
        >
          <option value="all">{t("all")}</option>
          {APPLICATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {tStatus(status)}
            </option>
          ))}
        </select>
      </div>

      {/* Native date inputs: the browser supplies the picker, the locale format
          and the mobile keyboard, and a hand-rolled one would have to earn all
          three back. They submit YYYY-MM-DD, which is what the url carries. */}
      <div className="flex flex-col gap-1">
        <label htmlFor="from" className="text-xs font-medium">
          {t("submittedFrom")}
        </label>
        <input
          type="date"
          id="from"
          name="from"
          defaultValue={query.submittedFrom ?? ""}
          className={field}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="to" className="text-xs font-medium">
          {t("submittedTo")}
        </label>
        <input
          type="date"
          id="to"
          name="to"
          defaultValue={query.submittedTo ?? ""}
          className={field}
        />
      </div>

      <button
        type="submit"
        className="bg-primary text-primary-foreground focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {t("apply")}
      </button>

      {/* Only once something is actually narrowed — a reset that resets nothing
          is noise on every page load. */}
      {isDefaultModerationQuery(query) ? null : (
        <Link
          href={moderationQueueHref(DEFAULT_MODERATION_FILTER)}
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {t("reset")}
        </Link>
      )}
    </form>
  );
}
