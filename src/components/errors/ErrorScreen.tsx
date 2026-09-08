import type { ReactNode } from "react";

import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

import { ErrorArt } from "./ErrorArt";

// The shared dead-end page: every 404 and every caught error looks like the
// same product, and like the rest of the site rather than a browser default.
// Presentational only — callers supply the copy (already translated), the
// status code and the actions, and compose the header and footer around it the
// way every other page does.
//
// The composition is the hero's, mirrored: copy on the left of the wide frame,
// artwork on the right, both stacked and centred on a phone.
export function ErrorScreen({
  code,
  title,
  body,
  children,
}: {
  code: string;
  title: string;
  body: string;
  children?: ReactNode; // action(s): a link home, and on an error a retry
}) {
  return (
    <main
      className={cn(
        SITE_CONTAINER,
        // isolate + overflow-hidden: the artwork is absolutely placed from lg
        // and the heart overhangs the blob, so neither may leak a horizontal
        // scrollbar onto a narrow screen.
        "relative isolate flex-1 overflow-hidden pt-8 pb-15 lg:pt-[min(10.78vw,207px)] lg:pb-[min(12.24vw,235px)]",
      )}
    >
      <div className="flex flex-col items-center text-center lg:max-w-[45.5%] lg:items-start lg:text-left">
        {/* Sized in vw from lg for the reason the hero's heading is: the
            artwork beside it is placed against the viewport, so a fixed 120px
            would wrap to a third line on a laptop and push the copy out of
            proportion with the picture. */}
        <h1 className="font-display text-[48px] leading-9 font-bold tracking-[-0.06em] lg:text-[min(6.25vw,120px)] lg:leading-[min(5.208vw,100px)]">
          {title}
        </h1>

        <p className="text-muted-foreground mt-3.5 text-base leading-5 tracking-[-0.03em] lg:mt-8 lg:max-w-[420px]">
          {body}
        </p>

        {children ? (
          <div className="mt-8 flex w-full max-w-[271px] flex-col gap-3 lg:mt-8 lg:max-w-none lg:flex-row">
            {children}
          </div>
        ) : null}

        {/* One element, placed two ways — in the flow under the copy on a
            phone, pinned to the section from lg. left 53.5% and 35.9vw are
            the design's 1027 and 690 over 1920; 14px puts its top where the
            design has it, just under the header.

            CAPPED at 689, because the two halves of that measure different
            things: the offset is a fraction of the container, which stops at
            1920, while vw keeps counting. Past that width the picture went on
            growing from a fixed left edge — 919px wide on a 2560 display,
            its centre 115px right of where it belongs and its right edge
            clipped by the section. */}
        <ErrorArt
          code={code}
          className="mt-11 w-full lg:absolute lg:top-[14px] lg:left-[53.5%] lg:mt-0 lg:w-[min(35.9vw,689px)]"
        />
      </div>
    </main>
  );
}
