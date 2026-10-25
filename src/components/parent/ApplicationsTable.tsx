import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ReactNode } from "react";

import { BillListIcon, EditIcon, EyeIcon, TrashIcon } from "@/components/icons";
import { ApplicationStatusPill } from "@/components/parent/ApplicationStatusPill";
import type { ApplicationStatus } from "@/db/enums";
import {
  confirmDeleteHref,
  type ApplicationsQuery,
} from "@/features/applications/applicationTabs";
import type { MyApplicationRow } from "@/features/applications/queries";
import { cn } from "@/lib/utils";

// «Мої заявки» (Figma 139:4543) — the parent's applications in this campaign.
//
// A real <table> from lg, because that is what the design draws and what the
// data is: four columns with headers. Its rows are drawn as separate cards, so
// the table separates its cells (border-spacing) rather than collapsing them,
// and the row's outline is drawn on its first and last cell.
//
// Below lg it is cards, as in «Мої підопічні»: status on top, then the child,
// then the actions — a four-column table at 328px is unreadable however it is
// restyled.
//
// What a row OFFERS is decided by status, and it mirrors the server's rules
// rather than replacing them: the pencil only while the edit lock is open
// (draft, submitted), the bin only on a draft — the confirmation and its
// action both check again.
const EDITABLE: readonly ApplicationStatus[] = ["draft", "submitted"];

export async function ApplicationsTable({
  rows,
  query,
}: {
  rows: readonly MyApplicationRow[];
  // The view the list is on, so the bin's confirmation opens over it and sends
  // the parent back to it.
  query: ApplicationsQuery;
}) {
  const t = await getTranslations("parent.applications");
  const format = await getFormatter();

  const name = (row: MyApplicationRow) => row.childName ?? t("childFallback");
  const base = (row: MyApplicationRow) =>
    `/account/parent/applications/${row.id}`;

  // The one next step a status has: say the gift arrived. («Продовжити» on a
  // draft is drawn too, and held back for now — Vital.)
  const nextStep = (row: MyApplicationRow): ReactNode =>
    row.status === "claimed" ? (
      <Link href={`${base(row)}/confirm`} className={cn(STEP, "text-primary")}>
        {t("confirmReceipt")}
      </Link>
    ) : null;

  const actions = (row: MyApplicationRow) => (
    <>
      {EDITABLE.includes(row.status) ? (
        <Link
          href={base(row)}
          aria-label={t("edit", { name: name(row) })}
          className={ICON}
        >
          <EditIcon className="size-6" />
        </Link>
      ) : null}
      <Link
        href={`${base(row)}/view`}
        aria-label={t("view", { name: name(row) })}
        className={ICON}
      >
        <EyeIcon className="size-6" />
      </Link>
      {row.status === "draft" ? (
        <Link
          href={confirmDeleteHref(query, row.id)}
          aria-label={t("delete", { name: name(row) })}
          className={ICON}
        >
          <TrashIcon className="size-6" />
        </Link>
      ) : null}
    </>
  );

  const submitted = (row: MyApplicationRow) =>
    t("submittedOn", {
      date: row.submittedAt
        ? format.dateTime(row.submittedAt, "short")
        : t("notSubmitted"),
    });

  const head =
    "bg-surface-muted py-[21px] font-normal first:rounded-l-xl last:rounded-r-xl";
  const cell =
    "border-divider border-y py-8 align-middle first:rounded-l-lg first:border-l last:rounded-r-lg last:border-r";

  return (
    <>
      {/* The table, from lg. */}
      <div className="border-divider bg-surface hidden rounded-lg border px-[13px] lg:block">
        <table className="w-full table-fixed border-separate border-spacing-y-2 text-left">
          <caption className="sr-only">{t("tableCaption")}</caption>
          <colgroup>
            <col className="w-[37%]" />
            <col className="w-[27%]" />
            <col />
            <col className="w-[170px]" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={cn(head, "pl-[33px]")}>
                {t("columns.application")}
              </th>
              <th scope="col" className={head}>
                {t("columns.initiative")}
              </th>
              <th scope="col" className={head}>
                {t("columns.status")}
              </th>
              {/* Centred over the icons, as drawn — not right-aligned. */}
              <th scope="col" className={cn(head, "pr-[27px] text-center")}>
                {t("columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={cn(cell, "pl-[21px]")}>
                  <div className="flex items-center gap-6">
                    <Avatar status={row.status} />
                    <span className="flex min-w-0 flex-col gap-2">
                      <span className="text-lg leading-4 font-medium tracking-[-0.06em]">
                        {name(row)}
                      </span>
                      <span className="text-sm font-light tracking-[-0.06em]">
                        {submitted(row)}
                      </span>
                    </span>
                  </div>
                </td>
                <td
                  className={cn(
                    cell,
                    "text-lg leading-4 font-medium tracking-[-0.06em]",
                  )}
                >
                  {row.campaignTitle}
                </td>
                <td className={cell}>
                  {/* Wraps below the 1920 frame: the pill and «Підтвердити
                      отримання» need about 390px together, and the columns
                      before this one keep the design's proportions. */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <ApplicationStatusPill status={row.status} />
                    {nextStep(row)}
                  </div>
                </td>
                <td className={cn(cell, "pr-[27px]")}>
                  <div className="flex items-center justify-end gap-8">
                    {actions(row)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* The cards, below lg. */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {rows.map((row) => (
          <li
            key={row.id}
            className="border-divider bg-surface flex flex-col items-start gap-[18px] rounded-lg border px-[13px] py-5"
          >
            <div className="flex flex-wrap items-center gap-x-[15px] gap-y-2">
              <ApplicationStatusPill status={row.status} />
              {nextStep(row)}
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-lg leading-[19px] font-medium tracking-[-0.06em]">
                {name(row)}
              </p>
              {row.childAge !== null ? (
                <p className="text-sm font-light tracking-[-0.06em]">
                  {t("age", { age: row.childAge })}
                </p>
              ) : null}
              <p className="text-sm font-light tracking-[-0.06em]">
                {t("columns.initiative")}:{" "}
                <span className="font-medium">{row.campaignTitle}</span>
              </p>
            </div>
            <div className="flex items-center gap-8">{actions(row)}</div>
          </li>
        ))}
      </ul>
    </>
  );
}

const STEP =
  "focus-visible:outline-ring rounded text-sm leading-[18px] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 lg:text-base";

const ICON =
  "text-foreground hover:text-primary focus-visible:outline-ring inline-flex rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

// The form in a disc. Decorative — the name is beside it — tinted by where
// the application is: green while it is a draft, yellow while it waits for
// review, violet after. The design's 32% fills, flattened onto white the way
// globals.css flattens every alpha fill.
function Avatar({ status }: { status: ApplicationStatus }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-full",
        status === "draft"
          ? "bg-[#ebf9ec] text-[#95bd98]"
          : status === "submitted"
            ? "bg-[#fffced] text-[#a58d00]"
            : "bg-[#ededff] text-[#8e8ef9]",
      )}
    >
      <BillListIcon className="size-6" />
    </span>
  );
}
