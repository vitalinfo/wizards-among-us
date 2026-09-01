"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

// The rendered card. A "use client" island purely so it is testable: an async
// server component cannot be rendered by React Testing Library, and next-intl's
// server API resolves to its client build under vitest and throws. Same split
// as SiteHeader / SiteHeaderClient — the server entry resolves what may be
// shown, this renders it.
//
// Everything below the summary is TIER 2 — the family's town, delivery address
// and contact, revealed because this volunteer holds the active claim. Keeping
// it behind a disclosure is not security (it is in the response either way);
// it is so the address of the child you are NOT looking at isn't sitting open
// on a phone screen in a shop.
export function ClaimCardClient({
  childName,
  fulfilled,
  claimedAt,
  fields,
  photos,
  defaultOpen,
}: {
  childName: string | null;
  fulfilled: boolean;
  claimedAt: Date;
  // Already-translated label/value pairs — the server entry resolves them, so
  // this component holds no knowledge of which columns are tier 2.
  fields: readonly (readonly [string, string | null])[];
  // Rendered by the server entry (ClaimPhotos streams each photo through the
  // authorized route), passed through so this island stays about the
  // disclosure and nothing else.
  photos?: ReactNode;
  // Open when this is the volunteer's only child — nobody should have to click
  // to see the one thing on the page.
  defaultOpen: boolean;
}) {
  const t = useTranslations("volunteer.claims");
  const format = useFormatter();

  return (
    <li className="border-border bg-surface rounded-lg border">
      {/* <details>, not a JS toggle: the open/closed state, the keyboard and
          the screen-reader announcement all come from the element, and the
          default is server-rendered, so the page is right before hydration. */}
      <details open={defaultOpen} className="group">
        <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-4 marker:content-none">
          <h2 className="font-semibold">{childName}</h2>
          {/* Status by text, not colour alone. */}
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              fulfilled
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-surface-muted text-muted-foreground border-border"
            }`}
          >
            {fulfilled ? t("fulfilled") : t("inProgress")}
          </span>
          <span className="text-muted-foreground text-xs">
            {t("claimedAt", { date: format.dateTime(claimedAt, "short") })}
          </span>
          {/* The affordance only. aria-hidden because <summary> already
              announces its own expanded state — a visible label saying
              "expand" would be read out too, and contradict it once open. */}
          <span
            aria-hidden="true"
            className="text-muted-foreground ml-auto text-xs group-open:hidden"
          >
            {t("expand")}
          </span>
          <span
            aria-hidden="true"
            className="text-muted-foreground ml-auto hidden text-xs group-open:inline"
          >
            {t("collapse")}
          </span>
        </summary>

        <div className="flex flex-col gap-2 px-4 pb-4">
          <dl className="text-sm">
            {fields.map(([label, value]) => (
              <div
                key={label}
                className="border-border border-b py-1.5 last:border-b-0"
              >
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap">{value ?? "—"}</dd>
              </div>
            ))}
          </dl>

          {photos}

          <p className="text-muted-foreground mt-2 text-xs">
            {fulfilled ? t("thanks") : t("releaseNote")}
          </p>
        </div>
      </details>
    </li>
  );
}
