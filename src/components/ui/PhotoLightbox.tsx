"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";

import { CloseIcon, ExternalLinkIcon } from "@/components/icons";
import { iconButton } from "@/components/ui/buttonStyles";
import { PhotoRotateControls } from "@/components/ui/PhotoRotateControls";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

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
  rotateHref,
  className,
  children,
}: {
  href: string;
  // Offers the quarter-turn buttons, posting to this endpoint. Only pass it
  // where canRotateApplicationFile holds — the route re-checks either way.
  rotateHref?: string;
  // Names the dialog for a screen reader, and captions the photo.
  title: string;
  alt: string;
  // Placement for the trigger itself. A thumbnail that is a flex item in the
  // caller's layout needs the layout classes on the LINK, not on the <img>
  // inside it — the link is what the parent lays out. Appended, so don't pass
  // a radius: the focus ring's own `rounded-md` would fight it (`cn` joins,
  // it does not merge).
  className?: string;
  // The trigger — a thumbnail, or a plain text link.
  children: ReactNode;
}) {
  const t = useTranslations("common.lightbox");
  const dialog = useRef<HTMLDialogElement>(null);
  // Bumped after each turn. The file keeps its URL when its pixels change, so
  // without a new one the browser keeps showing the photo it already has.
  const [turns, setTurns] = useState(0);
  // From the turn's response until the turned photo has actually arrived. The
  // request finishes well before the new image does, and without this the
  // buttons came back while the old photo still showed — a click that seemed
  // to do nothing.
  const [reloading, setReloading] = useState(false);
  const src =
    turns === 0 ? href : `${href}${href.includes("?") ? "&" : "?"}t=${turns}`;

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
        className={cn(
          "focus-visible:outline-primary rounded-md focus-visible:outline-2 focus-visible:outline-offset-2",
          className,
        )}
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
          <div className="border-border flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3">
            <p className="text-sm font-semibold">{title}</p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {rotateHref ? (
                <PhotoRotateControls
                  endpoint={rotateHref}
                  waiting={reloading}
                  onRotated={() => {
                    setReloading(true);
                    setTurns((count) => count + 1);
                  }}
                />
              ) : null}
              {/* Icons, not words: «Відкрити в новій вкладці» alone took
                  most of a phone's width once the turn buttons joined it.
                  The words stay as each control's name and its tooltip. */}
              <Tooltip label={t("openInTab")} side="bottom" align="end">
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("openInTab")}
                  className={iconButton}
                >
                  <ExternalLinkIcon className="size-5" />
                </a>
              </Tooltip>
              <Tooltip label={t("close")} side="bottom" align="end">
                <button
                  type="button"
                  aria-label={t("close")}
                  onClick={() => dialog.current?.close()}
                  className={iconButton}
                >
                  <CloseIcon className="size-5" />
                </button>
              </Tooltip>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- served by an authorized route, not an optimizable static asset */}
          <img
            src={src}
            alt={alt}
            onLoad={() => setReloading(false)}
            onError={() => setReloading(false)}
            className={cn(
              "min-h-0 w-auto flex-1 object-contain p-2 transition-opacity",
              reloading && "opacity-40",
            )}
          />
        </div>
      </dialog>
    </>
  );
}
