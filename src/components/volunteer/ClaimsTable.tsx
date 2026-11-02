import { getTranslations } from "next-intl/server";
import Link from "next/link";

import {
  ChildIcon,
  EyeIcon,
  ProcessedIcon,
  UnprocessedIcon,
} from "@/components/icons";
import { Tooltip } from "@/components/ui/Tooltip";
import { ClaimStatusBadge } from "@/components/volunteer/ClaimStatusBadge";
import { claimDialogHref, type ClaimsQuery } from "@/features/claims/claimTabs";
import type { MyClaimRow } from "@/features/claims/queries";
import { cn } from "@/lib/utils";

// The children this volunteer holds (Figma 130:2506).
//
// A real <table> from lg, because that is what the design draws and what the
// data is: four columns with headers, so a screen reader announces «Заявка,
// Софійка» rather than four unlabelled cells.
//
// Below lg it is NOT a squeezed table — the design draws separate cards, with
// the status on top, no avatar, and the details link at the foot. Two markups
// rather than one responsive one: a four-column table at 328px is unreadable
// however it is restyled, and the card reorders its parts rather than just
// stacking them.
export async function ClaimsTable({
  rows,
  query,
}: {
  rows: readonly MyClaimRow[];
  // The list's tab, page and size, so the confirmation returns to this view.
  query: ClaimsQuery;
}) {
  const t = await getTranslations("volunteer.claims");
  const tCard = await getTranslations("volunteer.children.card");

  const head = "px-6 py-[23px] align-middle font-medium";
  const cell = "px-6 py-8 align-middle";

  const name = (row: MyClaimRow) => row.childName ?? t("noName");
  const state = (row: MyClaimRow) =>
    row.status === "fulfilled"
      ? ("completed" as const)
      : row.status === "processed"
        ? ("processed" as const)
        : ("active" as const);

  // The optional «Опрацьовано» mark: set on a claimed child, taken off a
  // processed one — each behind a confirmation drawn over the list. The icon
  // and the label both name the ACTION: the check marks it processed, the
  // half-filled circle takes the mark off.
  //
  // Both icons' labels hang left, flush with their right edge: they sit at the
  // right of the card and of the table, whose box clips, and «Позначити як
  // опрацьовану» centred would run past either.
  const toggle = (row: MyClaimRow) =>
    row.status === "claimed" || row.status === "processed" ? (
      <Tooltip
        label={t(
          row.status === "claimed" ? "markProcessed" : "unmarkProcessed",
        )}
        align="end"
      >
        <Link
          href={claimDialogHref(
            query,
            row.status === "claimed" ? "process" : "unprocess",
            row.applicationId,
          )}
          aria-label={t(
            row.status === "claimed"
              ? "markProcessedFor"
              : "unmarkProcessedFor",
            { name: name(row) },
          )}
          className="text-foreground hover:text-primary focus-visible:outline-ring inline-flex items-center rounded focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {row.status === "claimed" ? (
            <ProcessedIcon className="size-6" />
          ) : (
            <UnprocessedIcon className="size-6" />
          )}
        </Link>
      </Tooltip>
    ) : null;

  const details = (row: MyClaimRow) => (
    <Tooltip label={t("viewShort")} align="end">
      <Link
        href={`/account/volunteer/claims/${row.applicationId}`}
        aria-label={t("view", { name: name(row) })}
        className="text-foreground hover:text-primary focus-visible:outline-ring inline-flex items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <EyeIcon className="size-6" />
      </Link>
    </Tooltip>
  );

  return (
    <>
      {/* The table, from lg. */}
      <div className="border-divider bg-surface hidden overflow-hidden rounded-[20px] border lg:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{t("tableCaption")}</caption>
          <thead>
            <tr className="bg-surface-muted text-muted-foreground">
              <th scope="col" className={head}>
                {t("columns.application")}
              </th>
              <th scope="col" className={head}>
                {t("columns.initiative")}
              </th>
              <th scope="col" className={head}>
                {t("columns.status")}
              </th>
              <th scope="col" className={`${head} text-right`}>
                {t("columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.applicationId} className="border-divider border-t">
                <td className={cell}>
                  <div className="flex items-center gap-6">
                    <Avatar gender={row.childGender} />
                    <span className="flex flex-col gap-1">
                      <span className="font-semibold">{name(row)}</span>
                      {row.childAge !== null ? (
                        <span className="text-muted-foreground">
                          {tCard("age", { age: row.childAge })}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </td>
                <td className={cell}>{row.campaignTitle}</td>
                <td className={cell}>
                  <ClaimStatusBadge state={state(row)} />
                </td>
                <td className={cell}>
                  <div className="flex items-center justify-end gap-6">
                    {toggle(row)}
                    {details(row)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* The cards, below lg. */}
      <ul className="flex flex-col gap-4 lg:hidden">
        {rows.map((row) => (
          <li
            key={row.applicationId}
            className="border-divider bg-surface flex items-center justify-between gap-4 rounded-2xl border p-5"
          >
            {/* items-start inside the column, or the status pill stretches to
                its width: an inline-flex child of a flex column is stretched by
                the default align-items. */}
            <div className="flex min-w-0 flex-col items-start gap-3">
              <ClaimStatusBadge state={state(row)} />
              <p className="text-lg font-semibold">{name(row)}</p>
              {row.childAge !== null ? (
                <p className="text-muted-foreground text-sm">
                  {tCard("age", { age: row.childAge })}
                </p>
              ) : null}
              <p className="text-sm">
                <span className="text-muted-foreground">
                  {t("columns.initiative")}:{" "}
                </span>
                {row.campaignTitle}
              </p>
            </div>
            {/* On the right of the card and centred against the whole of it
                (Vital), rather than sitting under the text. */}
            <div className="flex shrink-0 items-center gap-4">
              {toggle(row)}
              {details(row)}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

// The child's disc. Decorative — the name is beside it — so the gender it is
// tinted by is not information anyone depends on this to read: pink for a
// girl, blue for a boy, and the neutral blue for an application recorded before
// the column existed.
//
// Both fills are the design's, flattened from its 8% alpha the way globals.css
// flattens every other alpha fill: an alpha sits differently on every backdrop
// and these always sit on the surface.
function Avatar({ gender }: { gender: MyClaimRow["childGender"] }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-full",
        gender === "girl"
          ? "bg-[#ffebfb] text-[#ff00c8]"
          : "bg-[#f1f7ff] text-[#4f9bff]",
      )}
    >
      <ChildIcon className="size-6" />
    </span>
  );
}
