"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

// A short label shown beside an icon-only control on hover and on keyboard
// focus — what the pencil or the eye DOES, for someone who cannot guess it
// from the glyph.
//
// The control keeps its own aria-label, which stays its accessible name (it
// is the fuller one: «Редагувати заявку: Софійка», where the bubble says
// «Редагувати»). So the bubble is aria-hidden: announced as well, a screen
// reader would read the action twice. Its text has to be contained in that
// name, so what a sighted voice-control user reads is what they can say
// (WCAG 2.5.3).
//
// Showing it is CSS — hover (which Tailwind only applies where the device can
// hover, so a tap on a phone never sticks one open) and :focus-visible, not
// :focus, so a mouse click doesn't leave it up. That works with no script.
// The script adds the one thing CSS can't: Escape hides it (WCAG 1.4.13),
// until the pointer or focus comes back to the control.
export function Tooltip({
  label,
  side = "top",
  align = "center",
  className,
  children,
}: {
  label: string;
  // Below when the control sits at the top of the page, and flush with one of
  // its edges when the control sits by an edge of the page or of a box that
  // clips — centred, a long label would stick out past it.
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  className?: string;
  children: ReactNode;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDismissed(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const show = () => setDismissed(false);

  return (
    <span
      className={cn("group/tooltip relative inline-flex", className)}
      onMouseEnter={show}
      onFocus={show}
    >
      {children}
      {dismissed ? null : (
        // The padding, not a margin, spaces it off the control: the gap is
        // then part of the hover area, so the pointer can cross to the bubble
        // without it vanishing on the way (WCAG 1.4.13, hoverable).
        <span
          aria-hidden="true"
          className={cn(
            "invisible absolute z-30 group-hover/tooltip:visible group-has-focus-visible/tooltip:visible",
            side === "top" ? "bottom-full pb-2" : "top-full pt-2",
            align === "start"
              ? "left-0"
              : align === "end"
                ? "right-0"
                : "left-1/2 -translate-x-1/2",
          )}
        >
          <span className="bg-foreground text-background block rounded-md px-2.5 py-1.5 text-sm leading-4 font-medium whitespace-nowrap shadow-md">
            {label}
          </span>
        </span>
      )}
    </span>
  );
}
