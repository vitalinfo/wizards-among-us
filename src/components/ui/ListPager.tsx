import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { CaretDownIcon, ChevronRightIcon } from "@/components/icons";
import { PAGE_SIZES, type PageSize } from "@/lib/pageSize";
import { cn } from "@/lib/utils";

import { MenuDetails } from "./MenuDetails";

// The pager under a cabinet list — «Записів на сторінці: 10 ▾ · 1–10 з 57 · ‹ ›»
// (Figma 139:4543, 130:2506, 142:6503). The admin lists keep the older Pager
// (Vital): their range and «Сторінка 2 з 6» are what a moderator works by.
//
// Links throughout, like the tabs above the list: every page and every size
// is a url, so it works with no client JavaScript and survives a reload. The
// size picker is a <details> rather than a <select> for the same reason as
// the phone tabs — a select cannot navigate without a script.
//
// The phone draws only the range and the arrows; the size picker is from lg.
export async function ListPager({
  label,
  page,
  pageCount,
  total,
  from,
  to,
  per,
  hrefFor,
  sizeHref,
}: {
  // What this pages through — the <nav>'s name.
  label: string;
  page: number;
  pageCount: number;
  total: number;
  // The 1-based range on this page, for «1–10 з 57».
  from: number;
  to: number;
  per: PageSize;
  hrefFor: (page: number) => string;
  // A size starts again from page 1: the page you were on may not exist at
  // the new size.
  sizeHref: (per: PageSize) => string;
}) {
  const t = await getTranslations("common.listPager");

  if (total === 0) {
    return null;
  }

  const focus =
    "focus-visible:outline-ring rounded focus-visible:outline-2 focus-visible:outline-offset-2";

  // 24px targets around the design's 18px chevrons (WCAG 2.5.8). At either
  // end the arrow stays, dimmed and out of the accessibility tree, so the
  // row does not shift; the range already says where you are.
  const arrow = (target: number, direction: "previous" | "next") => {
    const icon = (
      <ChevronRightIcon
        aria-hidden="true"
        className={cn("size-[18px]", direction === "previous" && "rotate-180")}
      />
    );
    const box =
      "text-foreground inline-flex size-6 items-center justify-center";
    return target >= 1 && target <= pageCount ? (
      <Link
        href={hrefFor(target)}
        rel={direction === "previous" ? "prev" : "next"}
        aria-label={t(direction)}
        className={cn(box, focus, "hover:text-primary transition-colors")}
      >
        {icon}
      </Link>
    ) : (
      <span aria-hidden="true" className={cn(box, "opacity-30")}>
        {icon}
      </span>
    );
  };

  return (
    <nav
      aria-label={label}
      className="text-muted-foreground mt-6 flex items-center justify-end gap-[18px] text-sm leading-[18px] font-light lg:mt-8"
    >
      <MenuDetails className="group relative hidden lg:block">
        {/* The label is inside the summary, so the control is announced as
            «Записів на сторінці: 10» rather than a bare number. */}
        <summary
          className={cn(
            focus,
            "flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden",
          )}
        >
          {t("perPage")}
          <span className="group-hover:text-primary flex items-center gap-1 transition-colors">
            {per}
            <CaretDownIcon
              aria-hidden="true"
              className="size-4 transition-transform group-open:rotate-180"
            />
          </span>
        </summary>
        {/* Upward: the pager is the last thing on the page, and a menu that
            opened down would hang below it. */}
        <ul className="border-divider bg-surface absolute right-0 bottom-full z-20 mb-2 flex w-max flex-col gap-1 rounded-2xl border p-1 font-normal shadow-lg">
          {PAGE_SIZES.map((size) => (
            <li key={size}>
              <Link
                href={sizeHref(size)}
                aria-current={size === per ? "true" : undefined}
                className={cn(
                  focus,
                  "flex h-9 min-w-12 items-center justify-center rounded-full px-3 transition-colors",
                  size === per
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-primary",
                )}
              >
                {size}
              </Link>
            </li>
          ))}
        </ul>
      </MenuDetails>

      <p>{t("range", { from, to, total })}</p>

      <div className="flex items-center gap-2.5">
        {arrow(page - 1, "previous")}
        {arrow(page + 1, "next")}
      </div>
    </nav>
  );
}
