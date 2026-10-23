import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { EyeIcon } from "@/components/icons";
import { ClaimStatusBadge } from "@/components/volunteer/ClaimStatusBadge";
import type { MyClaimRow } from "@/features/claims/queries";

// The children this volunteer holds (Figma 130:2506).
//
// A real <table>: it is tabular data with column headers, and a screen reader
// announces «Заявка, Софійка» when the row is read because the header cells say
// so. A grid of divs would need five aria attributes to say the same thing and
// would still read worse.
//
// Below lg the same rows become cards — the design stacks them, and a four
// column table at 328px is unreadable either way. One markup, two layouts:
// `block lg:table-*` on the structural elements.
export async function ClaimsTable({ rows }: { rows: readonly MyClaimRow[] }) {
  const t = await getTranslations("volunteer.claims");
  const tCard = await getTranslations("volunteer.children.card");

  // 112 for a row and 66 for the header, as drawn: the row is a 48px avatar
  // with 32 above and below it, and the header a 20px line with 23.
  const head = "px-6 py-[23px] align-middle font-medium";
  const cell = "px-6 py-8 align-middle";

  return (
    <div className="border-divider bg-surface overflow-hidden rounded-2xl border lg:rounded-[20px]">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{t("tableCaption")}</caption>
        <thead>
          {/* Hidden visually on a phone, where each row is a card and the
              labels sit beside the values instead. Still in the markup, so the
              column headers remain available to a screen reader. */}
          <tr className="bg-surface-muted text-muted-foreground max-lg:sr-only">
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
            <tr
              key={row.applicationId}
              className="border-divider border-t max-lg:grid max-lg:gap-3 max-lg:px-4 max-lg:py-5"
            >
              <td className={`${cell} max-lg:p-0`}>
                <div className="flex items-center gap-4">
                  {/* The avatar is decorative: the child's name is right
                      beside it, in the cell the header calls «Заявка». */}
                  <span
                    aria-hidden="true"
                    className="bg-primary-tint flex size-12 shrink-0 items-center justify-center rounded-full text-xl"
                  >
                    🧒
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="font-semibold">
                      {t("childName", { name: row.childName ?? t("noName") })}
                    </span>
                    {row.childAge !== null ? (
                      <span className="text-muted-foreground">
                        {tCard("age", { age: row.childAge })}
                      </span>
                    ) : null}
                  </span>
                </div>
              </td>
              <td className={`${cell} max-lg:p-0`}>
                <span className="text-muted-foreground lg:hidden">
                  {t("columns.initiative")}:{" "}
                </span>
                {row.campaignTitle}
              </td>
              <td className={`${cell} max-lg:p-0`}>
                <ClaimStatusBadge
                  state={row.status === "fulfilled" ? "completed" : "active"}
                />
              </td>
              <td className={`${cell} text-right max-lg:p-0 max-lg:text-left`}>
                {/* An eye alone from lg, as drawn, with the child's name in
                    its accessible name — «Переглянути» on twenty rows tells a
                    screen-reader user nothing about which row they are on. */}
                <Link
                  href={`/account/volunteer/claims/${row.applicationId}`}
                  aria-label={t("view", {
                    name: row.childName ?? t("noName"),
                  })}
                  className="text-muted-foreground hover:text-primary focus-visible:outline-ring inline-flex items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span aria-hidden="true" className="lg:hidden">
                    {t("viewShort")}
                  </span>
                  <EyeIcon className="size-6" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
