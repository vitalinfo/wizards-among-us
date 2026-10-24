"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";

// The phone menu's <details>, closed again when the person goes somewhere.
//
// A bare <details> stays open across a client-side navigation: the account
// layout persists between its pages, so the panel would sit over the page the
// person just chose. Two triggers, because neither covers the other:
// - a tapped link closes it at once, including the link to the page you are
//   already on, where the path never changes;
// - a changed path closes it after anything that navigates WITHOUT a link —
//   «Подати заявку» is a form, and lands on the new draft by redirect.
//
// The element is still a <details>, so it opens and closes with no JavaScript;
// this only adds the closing a script can do.
export function AccountMenu({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) {
      ref.current.open = false;
    }
  }, [pathname]);

  const closeOnLink = (event: MouseEvent<HTMLDetailsElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest("a[href]") &&
      ref.current
    ) {
      ref.current.open = false;
    }
  };

  return (
    <details ref={ref} className={className} onClick={closeOnLink}>
      {children}
    </details>
  );
}
