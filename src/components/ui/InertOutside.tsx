"use client";

import { useEffect, useRef } from "react";

// Marks everything OUTSIDE the confirmation it sits in as `inert`, so Tab and a
// screen reader stay inside the question.
//
// An enhancement, never the safety control. The confirmation itself is page
// state and a plain form (see ConfirmModal) and works if the page merely
// rendered. What this adds is containment the page cannot give on its own when
// the dialog is drawn inside a layout — the cabinet's header and sidebar sit
// outside the page, and a layout cannot see the query string that opened the
// dialog. Without script, Tab can reach them behind the overlay; nothing can be
// confirmed by accident either way.
//
// Walks from the overlay up to <body>, inerting each ancestor's siblings, and
// restores exactly what it changed — an element that was already inert (an
// admin page's own content) stays inert.
//
// It also moves focus INTO the dialog. ConfirmModal's `autoFocus` does that on
// a full page load, but the browser honours it once per document — a dialog
// opened by a client-side navigation (the bin is a link) would otherwise leave
// focus on a control that is now inert. Focus goes back where it was when the
// dialog closes, if that element is still on the page.
export function InertOutside() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const overlay = marker.current?.closest("[data-confirm-overlay]");
    if (!overlay) {
      return;
    }
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const changed: Element[] = [];
    let node: Element | null = overlay;
    while (node && node !== document.body) {
      const parent: Element | null = node.parentElement;
      for (const sibling of parent ? Array.from(parent.children) : []) {
        if (sibling !== node && !sibling.hasAttribute("inert")) {
          sibling.setAttribute("inert", "");
          changed.push(sibling);
        }
      }
      node = parent;
    }
    overlay.querySelector<HTMLElement>('[role="dialog"]')?.focus();

    return () => {
      for (const element of changed) {
        element.removeAttribute("inert");
      }
      if (previous?.isConnected) {
        previous.focus();
      }
    };
  }, []);

  return <span ref={marker} hidden />;
}
