"use client";

import { useTranslations } from "next-intl";
import { useRef, type ReactNode } from "react";

// Opens a photo in an overlay instead of a new tab.
//
// The trigger is a real <a href> to the file, so with no JavaScript — or before
// hydration — clicking still opens the photo. That fallback is why this can be
// a client component at all: a lightbox is a viewing convenience, unlike a
// destructive control, which must never sit behind hydration (see ConfirmModal,
// which is server-rendered page state for exactly that reason).
//
// A native <dialog> with showModal(): focus containment, Escape, and inerting
// the page behind it come from the platform. Reimplementing those by hand is
// how custom modals end up unusable with a keyboard.
export function PhotoLightbox({
  href,
  title,
  alt,
  children,
}: {
  href: string;
  // Names the dialog for a screen reader, and captions the photo.
  title: string;
  alt: string;
  // The trigger — a thumbnail, or a plain text link.
  children: ReactNode;
}) {
  const t = useTranslations("common.lightbox");
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        // Named here rather than at each call site. A caller whose trigger is a
        // thumbnail leaves the <img> alt empty (the caption beside it already
        // names the photo), and that left the LINK with no accessible name at
        // all — a tab stop that announces nothing. Caught by the axe sweep.
        aria-label={t("open", { title })}
        onClick={(event) => {
          // Leave the modifier-click and middle-click alone — someone
          // deliberately opening a new tab should still get one.
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.button !== 0 ||
            typeof dialog.current?.showModal !== "function"
          ) {
            return;
          }
          event.preventDefault();
          dialog.current.showModal();
        }}
        className="focus-visible:outline-primary rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {children}
      </a>

      <dialog
        ref={dialog}
        aria-label={title}
        // Clicking the backdrop closes it. The click lands on the <dialog>
        // itself only when it misses the content inside.
        onClick={(event) => {
          if (event.target === dialog.current) {
            dialog.current?.close();
          }
        }}
        className="bg-surface text-foreground m-auto max-h-[90dvh] max-w-[92vw] rounded-lg p-0 backdrop:bg-black/70"
      >
        <div className="flex max-h-[90dvh] flex-col">
          <div className="border-border flex items-center justify-between gap-4 border-b px-4 py-3">
            <p className="text-sm font-semibold">{title}</p>
            <div className="flex items-center gap-3">
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-primary text-sm underline underline-offset-4"
              >
                {t("openInTab")}
              </a>
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                className="border-border rounded-md border px-2.5 py-1 text-sm font-semibold"
              >
                {t("close")}
              </button>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- served by an authorized route, not an optimizable static asset */}
          <img
            src={href}
            alt={alt}
            className="min-h-0 w-auto flex-1 object-contain p-2"
          />
        </div>
      </dialog>
    </>
  );
}
