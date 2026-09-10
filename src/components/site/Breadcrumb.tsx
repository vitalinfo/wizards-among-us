import Link from "next/link";

import { ChevronRightIcon } from "@/components/icons";

export type Crumb = { label: string; href?: string };

// The trail above a sub-page's heading. An ordered list inside a labelled
// <nav>, which is what a screen reader announces as a breadcrumb; the chevrons
// are punctuation and stay out of the accessibility tree.
//
// The last crumb is the current page: it carries `aria-current="page"` and is
// NOT a link, because a link to where you already are is a dead control.
export function Breadcrumb({
  items,
  label,
  className,
}: {
  items: readonly Crumb[];
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex items-center gap-3.5 text-sm tracking-[-0.03em]">
        {items.map((item, i) => (
          <li
            key={item.href ?? item.label}
            className="flex items-center gap-3.5"
          >
            {i > 0 ? (
              // Decorative: the list structure already separates the steps.
              <ChevronRightIcon className="text-muted-faint size-3.5 shrink-0" />
            ) : null}
            {item.href ? (
              // --muted-foreground, not the design's 44%-opacity grey: at 14px
              // that grey is 3.4:1 and this is a link, not decoration.
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-primary focus-visible:outline-ring rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
