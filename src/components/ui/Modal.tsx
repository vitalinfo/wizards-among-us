import Link from "next/link";
import type { ReactNode } from "react";

import { CloseIcon } from "@/components/icons";

import { InertOutside } from "./InertOutside";

// The cabinet's modal (Figma 142:5726): a 530px card over a blurred scrim on
// desktop, a full-screen sheet on a phone.
//
// PAGE STATE, like ConfirmModal, and for the same reason: a dialog whose job is
// to stop or to finish something must not depend on hydration. The control
// that opens it is a link to a url the page reads, the page draws this, and ×
// is a link back. The page marks its own content `inert`; InertOutside does the
// same for the layout around it, and moves focus in, where scripts run.
//
// What it gives up against a real <dialog>: closing on Escape, which needs a
// key handler. Closing is the visible × instead.
export function Modal({
  title,
  description,
  closeHref,
  closeLabel,
  children,
}: {
  title: string;
  description?: string;
  closeHref: string;
  // What × does, in words — «Закрити».
  closeLabel: string;
  children: ReactNode;
}) {
  return (
    <div
      data-confirm-overlay
      // The scrim is the design's rgba(65,65,65,.3) with a 3px blur — a
      // one-off, so a literal rather than a token.
      className="bg-surface fixed inset-0 z-50 overflow-y-auto lg:flex lg:items-center lg:justify-center lg:bg-[rgba(65,65,65,0.3)] lg:p-4 lg:backdrop-blur-[3px]"
    >
      <InertOutside />
      {/* tabIndex -1 + autoFocus put focus on the dialog itself, not on its
          first control: Enter must never complete an action nobody read. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
        tabIndex={-1}
        autoFocus
        className="bg-surface relative min-h-full px-4 pt-[88px] pb-10 focus:outline-none lg:min-h-0 lg:w-full lg:max-w-[530px] lg:rounded-xl lg:p-[50px]"
      >
        {/* Where the menu toggle sits on a phone (it is covered), and 24px in
            from the card's corner on desktop. */}
        <Link
          href={closeHref}
          aria-label={closeLabel}
          className="text-muted-foreground hover:text-foreground focus-visible:outline-ring absolute top-[26px] right-4 inline-flex size-10 items-center justify-center rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:top-4 lg:right-4"
        >
          <CloseIcon className="size-6" />
        </Link>

        <h2
          id="modal-title"
          className="pr-10 text-xl leading-[26px] font-semibold lg:text-2xl"
        >
          {title}
        </h2>
        {description ? (
          <p
            id="modal-description"
            className="text-muted-foreground mt-3 text-sm leading-6"
          >
            {description}
          </p>
        ) : null}

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
