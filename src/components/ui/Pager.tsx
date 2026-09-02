import { getTranslations } from "next-intl/server";
import Link from "next/link";

// The pager for every paged list: the moderation queue, the volunteer browse
// list, and the people list.
//
// Extracted on the THIRD copy. The first two had drifted only in whitespace;
// the third (mine) arrived with different copy, different markup and a
// different message shape, which is the point at which "one more inline nav"
// stops being cheaper than a component.
//
// Links, not buttons: each page is addressable and it works with no client JS,
// like the rest of these surfaces.
export async function Pager({
  label,
  page,
  pageCount,
  total,
  from,
  to,
  hrefFor,
}: {
  // What this is a pager FOR — «Сторінки черги» vs «Сторінки списку». The only
  // copy that differs between the three.
  label: string;
  page: number;
  pageCount: number;
  total: number;
  // The 1-based range on this page, for «Показано 1–24 з 57».
  from: number;
  to: number;
  hrefFor: (page: number) => string;
}) {
  const t = await getTranslations("common.pager");

  // Nothing to page through and nothing to count.
  if (total === 0) {
    return null;
  }

  const link =
    "border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-3 py-1.5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <nav
      aria-label={label}
      className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      {/* Shown even on a single page: "57 results" is the answer to the
          question that brought the admin here, and it is not paging
          information. */}
      <p className="text-muted-foreground">{t("range", { from, to, total })}</p>

      {pageCount > 1 ? (
        <div className="flex items-center gap-3">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} rel="prev" className={link}>
              {t("previous")}
            </Link>
          ) : null}
          <span className="text-muted-foreground">
            {t("position", { page, pageCount })}
          </span>
          {page < pageCount ? (
            <Link href={hrefFor(page + 1)} rel="next" className={link}>
              {t("next")}
            </Link>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
