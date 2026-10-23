import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { ChildIcon, EyeIcon } from "@/components/icons";
import { ClaimStatusBadge } from "@/components/volunteer/ClaimStatusBadge";
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
export async function ClaimsTable({ rows }: { rows: readonly MyClaimRow[] }) {
  const t = await getTranslations("volunteer.claims");
  const tCard = await getTranslations("volunteer.children.card");

  const head = "px-6 py-[23px] align-middle font-medium";
  const cell = "px-6 py-8 align-middle";

  const name = (row: MyClaimRow) => row.childName ?? t("noName");
  const state = (row: MyClaimRow) =>
    row.status === "fulfilled" ? ("completed" as const) : ("active" as const);

  const details = (row: MyClaimRow) => (
    <Link
      href={`/account/volunteer/claims/${row.applicationId}`}
      aria-label={t("view", { name: name(row) })}
      className="text-foreground hover:text-primary focus-visible:outline-ring inline-flex items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <EyeIcon className="size-6" />
    </Link>
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
                <td className={`${cell} text-right`}>{details(row)}</td>
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
            // items-start, or the status pill stretches to the card's width:
            // an inline-flex child of a flex column still gets stretched by the
            // default align-items.
            className="border-divider bg-surface flex flex-col items-start gap-3 rounded-2xl border p-5"
          >
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
            <div className="flex items-center gap-3">{details(row)}</div>
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
