import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { ChevronRightIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/buttonStyles";

import { APPLICATION_STATUSES } from "@/db/enums";
import {
  DEFAULT_MODERATION_FILTER,
  isDefaultModerationQuery,
  MODERATION_SEARCH_MAX_LENGTH,
  moderationQueueHref,
  moderationSearch,
  type ModerationCampaignScope,
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
  campaigns,
  campaignScope,
}: {
  query: ModerationQuery;
  campaigns: readonly { id: string; title: string }[];
  campaignScope: ModerationCampaignScope;
}) {
  const t = await getTranslations("admin.applications.filter");
  const tStatus = await getTranslations("parent.applications.status");

  // No horizontal padding here: the select needs room on the right for its
  // chevron, and appending pr-* after px-* is settled by Tailwind's emit order,
  // not by the order in the string.
  const field =
    "border-border bg-surface focus-visible:outline-ring rounded-md border py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2";
  // iOS Safari gives a native date input an intrinsic width that ignores
  // w-full and min-w-0, so on a phone it ran past its grid column, and an
  // empty one stood taller than the selects. appearance-none hands the box
  // back to CSS; the fixed height is the selects' (20px line + py-2 + border),
  // and iOS would otherwise centre the value. Desktop browsers keep their
  // picker button. Chrome's device mode doesn't reproduce any of this.
  const dateField = `${field} h-[38px] w-full min-w-0 appearance-none px-3 sm:w-auto [&::-webkit-date-and-time-value]:text-left`;

  return (
    // Keyed by the applied query. The controls are uncontrolled (defaultValue),
    // and a client-side navigation — «Скинути», «назад» — re-renders this tree
    // without replacing the DOM, so a new defaultValue alone leaves the old
    // selection on screen. A new key remounts the form with the url's values.
    <form
      key={moderationSearch(query)}
      method="get"
      action="/admin/applications"
      aria-label={t("legend")}
      // On a phone, a two-column grid: the two selects share a row, the two
      // dates the next, the buttons the last. From sm up the controls fit one
      // wrapping row, as before.
      className="border-border bg-surface-muted grid grid-cols-2 items-end gap-3 rounded-lg border p-4 sm:flex sm:flex-wrap"
    >
      {/* Its own full-width row: a name is the one thing here an admin types,
          and squeezed between the selects it would be the narrowest field. */}
      <div className="col-span-2 flex min-w-0 flex-col gap-1 sm:basis-full">
        <label htmlFor="q" className="text-xs font-medium">
          {t("search")}
        </label>
        <input
          type="search"
          id="q"
          name="q"
          defaultValue={query.search}
          placeholder={t("searchPlaceholder")}
          maxLength={MODERATION_SEARCH_MAX_LENGTH}
          className={`${field} w-full px-3`}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="campaign" className="text-xs font-medium">
          {t("campaign")}
        </label>
        <div className="relative">
          <select
            id="campaign"
            name="campaign"
            defaultValue={query.campaign}
            className={`${field} w-full appearance-none truncate pr-9 pl-3 sm:w-auto sm:max-w-64`}
          >
            <option value="all">{t("allCampaigns")}</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.id === campaignScope.activeId
                  ? t("activeCampaign", { title: campaign.title })
                  : campaign.title}
              </option>
            ))}
          </select>
          <ChevronRightIcon
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 rotate-90"
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="status" className="text-xs font-medium">
          {t("status")}
        </label>
        {/* appearance-none plus our own chevron, as in the volunteer browse
            filter: the platform's arrow lands against the border on macOS. */}
        <div className="relative">
          <select
            id="status"
            name="status"
            defaultValue={query.filter}
            className={`${field} w-full appearance-none truncate pr-9 pl-3 sm:w-auto`}
          >
            <option value="all">{t("all")}</option>
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {tStatus(status)}
              </option>
            ))}
          </select>
          <ChevronRightIcon
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 rotate-90"
          />
        </div>
      </div>

      {/* Native date inputs: the browser supplies the picker, the locale format
          and the mobile keyboard, and a hand-rolled one would have to earn all
          three back. They submit YYYY-MM-DD, which is what the url carries. */}
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="from" className="text-xs font-medium">
          {t("submittedFrom")}
        </label>
        <input
          type="date"
          id="from"
          name="from"
          defaultValue={query.submittedFrom ?? ""}
          className={dateField}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="to" className="text-xs font-medium">
          {t("submittedTo")}
        </label>
        <input
          type="date"
          id="to"
          name="to"
          defaultValue={query.submittedTo ?? ""}
          className={dateField}
        />
      </div>

      {/* Kept across «Застосувати»: changing the status of one person's list
          should not silently widen it back to everyone. */}
      {query.parentId ? (
        <input type="hidden" name="parent" value={query.parentId} />
      ) : null}
      {query.claimedBy ? (
        <input type="hidden" name="claimedBy" value={query.claimedBy} />
      ) : null}

      <div className="col-span-2 flex items-center gap-3">
        <button
          type="submit"
          className="bg-primary text-primary-foreground focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {t("apply")}
        </button>

        {/* Only once something is actually narrowed — a reset that resets nothing
          is noise on every page load. Styled as the outline button beside
          «Застосувати»; the vertical padding gives back the border's 1.5px so
          the two stand the same height. */}
        {isDefaultModerationQuery(query, campaignScope) ? null : (
          <Link
            href={moderationQueueHref(DEFAULT_MODERATION_FILTER)}
            className={`${buttonVariants.outline} focus-visible:outline-ring rounded-md px-4 py-[calc(0.5rem-1.5px)] text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2`}
          >
            {t("reset")}
          </Link>
        )}
      </div>
    </form>
  );
}
