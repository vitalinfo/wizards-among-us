import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import { ApplicationStatusBadge } from "@/components/ui/ApplicationStatusBadge";
import type { FamilyApplicationRow } from "@/features/applications/adminQueries";

// Rows are ruled ABOVE, not below: the table sits in a field row that already
// draws its own bottom border, and a second line under the last child doubles it.
const HEAD = "border-border border-b py-1.5 pr-3 font-normal last:pr-0";
const CELL = "border-border border-t py-2 pr-3 align-middle last:pr-0";

// The parent's other applications in this campaign, folded behind a <details>
// so the common single-child family sees nothing extra and a family with
// several children is one click away. A native <details>: it opens with no
// JavaScript and the browser supplies the expanded state.
export function FamilyApplications({
  items,
  hrefSearch,
}: {
  items: readonly FamilyApplicationRow[];
  // The queue view the admin came from, carried onto each link so «До черги»
  // from the sibling still returns to it.
  hrefSearch: string;
}) {
  const t = useTranslations("admin.applications.familyApplications");
  const format = useFormatter();

  return (
    <details>
      <summary className="text-primary focus-visible:outline-ring cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">
        {t("summary", { count: items.length })}
      </summary>
      {/* A real table: three columns of the same kind of fact per child. The
          wrapper scrolls rather than squeezing a long name off a phone. */}
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{t("caption")}</caption>
          <thead>
            <tr className="text-muted-foreground text-left text-xs">
              <th scope="col" className={HEAD}>
                {t("columns.child")}
              </th>
              <th scope="col" className={HEAD}>
                {t("columns.status")}
              </th>
              <th scope="col" className={HEAD}>
                {t("columns.createdAt")}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <th scope="row" className={`${CELL} text-left font-medium`}>
                  <Link
                    href={`/admin/applications/${item.id}${hrefSearch ? `?${hrefSearch}` : ""}`}
                    className="text-primary font-semibold underline underline-offset-4"
                  >
                    {item.childName ?? t("unnamed")}
                  </Link>
                </th>
                <td className={CELL}>
                  <ApplicationStatusBadge status={item.status} />
                </td>
                <td className={`${CELL} whitespace-nowrap`}>
                  {format.dateTime(item.createdAt, "short")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
