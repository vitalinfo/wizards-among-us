import Link from "next/link";

import { ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

import { MenuDetails } from "./MenuDetails";

// The tab strip above a cabinet list — «Всі | Активні | Завершені» on «Мої
// підопічні» (Figma 130:2506), one tab per status on «Мої заявки» (139:4543).
// Both draw the same control, so both use this.
//
// LINKS, not buttons: each tab is a url, so it survives a reload, can be shared
// and needs no client JavaScript — the same reason the pager and the browse
// filters are links. `aria-current` is what says which one you are on; the
// filled pill is the redundant visual cue.
//
// Plain, not async: the labels come in translated, so a page's spec can render
// it inside the page's tree. (Its phone dropdown is the one client part.)
export function FilterTabs({
  label,
  tabs,
  current,
}: {
  // What the tabs filter — the <nav>'s name.
  label: string;
  tabs: readonly { key: string; label: string; href: string }[];
  current: string;
}) {
  const pill =
    "focus-visible:outline-ring inline-flex h-9 items-center rounded-full px-3 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";
  const links = tabs.map((tab) => {
    const active = tab.key === current;
    return (
      <li key={tab.key}>
        <Link
          href={tab.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            pill,
            active
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-primary",
          )}
        >
          {tab.label}
        </Link>
      </li>
    );
  });
  const currentLabel = tabs.find((tab) => tab.key === current)?.label;

  return (
    <nav aria-label={label}>
      {/* Every pill from lg. */}
      <ul className="border-divider bg-surface hidden w-fit items-center gap-2 rounded-full border p-1 lg:flex">
        {links}
      </ul>

      {/* One pill that opens the rest on a phone, which is what both designs
          draw — the strip does not fit a 328px screen. A <details> rather
          than a <select>: a select cannot navigate without JavaScript, and
          these are links. MenuDetails closes it when one is chosen — the
          page stays mounted when only the query string changes, so a bare
          <details> stayed open over the list it had just filtered. */}
      <MenuDetails className="group relative w-fit lg:hidden">
        <summary
          className={cn(
            pill,
            "bg-primary text-primary-foreground focus-visible:outline-ring cursor-pointer list-none gap-2 [&::-webkit-details-marker]:hidden",
          )}
        >
          {currentLabel}
          <ChevronRightIcon
            aria-hidden="true"
            className="size-4 rotate-90 transition-transform group-open:-rotate-90"
          />
        </summary>
        {/* OVER the list, not above it: in the flow this pushed every card
            down by the height of the menu, so opening the filter moved the
            thing you were about to read. Absolute, with a shadow, because it
            now sits on top of cards rather than between them. */}
        <ul className="border-divider bg-surface absolute top-full left-0 z-20 mt-2 flex w-max flex-col gap-1 rounded-2xl border p-1 shadow-lg">
          {links}
        </ul>
      </MenuDetails>
    </nav>
  );
}
