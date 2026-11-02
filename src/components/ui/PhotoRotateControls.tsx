"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RotateIcon } from "@/components/icons";
import { iconButton } from "@/components/ui/buttonStyles";
import { Tooltip } from "@/components/ui/Tooltip";

// The two quarter-turn buttons in the photo overlay. Its own component so the
// router is only needed where turning is offered: PhotoLightbox also opens
// photos for volunteers, who never get these.
//
// A client island on purpose, unlike the destructive controls: a turn is
// undone by the opposite button, so a dead button before hydration costs a
// moment, not a family's photo.
export function PhotoRotateControls({
  endpoint,
  waiting = false,
  onRotated,
}: {
  // POST /api/applications/:id/files/:fileId/rotate
  endpoint: string;
  // The turn is done but the overlay is still loading the turned photo. A
  // second click now would turn a photo the person has not seen yet.
  waiting?: boolean;
  // Lets the overlay reload its own <img>, which the refresh cannot reach: the
  // photo's URL does not change when its pixels do.
  onRotated: () => void;
}) {
  const t = useTranslations("common.lightbox");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const pending = busy || waiting;

  const turn = async (direction: "left" | "right") => {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      onRotated();
      // Thumbnails elsewhere on the page carry the file's version in their URL,
      // so a refresh is what turns them too.
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="group" aria-label={t("rotate")} className="flex items-center">
      {failed ? (
        <p role="alert" className="text-danger mr-2 text-sm font-medium">
          {t("rotateFailed")}
        </p>
      ) : null}
      {pending ? (
        <p role="status" className="sr-only">
          {t("rotating")}
        </p>
      ) : null}
      <Tooltip label={t("rotateLeft")} side="bottom">
        <button
          type="button"
          aria-label={t("rotateLeft")}
          disabled={pending}
          onClick={() => void turn("left")}
          className={iconButton}
        >
          <RotateIcon className="size-5 -scale-x-100" />
        </button>
      </Tooltip>
      <Tooltip label={t("rotateRight")} side="bottom" className="ml-2">
        <button
          type="button"
          aria-label={t("rotateRight")}
          disabled={pending}
          onClick={() => void turn("right")}
          className={iconButton}
        >
          <RotateIcon className="size-5" />
        </button>
      </Tooltip>
    </div>
  );
}
