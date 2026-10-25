import type { CSSProperties } from "react";

import { PhotoLightbox } from "@/components/ui/PhotoLightbox";

// A photo on the full application card, opening over the page. The <img>
// carries an EMPTY alt on purpose: the link around it is already named by the
// lightbox («Відкрити …»), and a second description of the same thing would be
// read twice. The bytes come from the authorized route, which re-checks who is
// asking and logs every read.
export function ApplicationPhoto({
  applicationId,
  fileId,
  title,
  alt,
  height,
  mobileHeight = 261,
}: {
  applicationId: string;
  fileId: string;
  title: string;
  alt: string;
  height: number;
  // The design gives the two portraits 261 on a phone, side by side, and the
  // family photo 443 across the full width.
  mobileHeight?: number;
}) {
  return (
    <PhotoLightbox
      href={`/api/applications/${applicationId}/files/${fileId}`}
      title={title}
      alt={alt}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- authorized, logged, never optimized */}
      <img
        src={`/api/applications/${applicationId}/files/${fileId}`}
        alt=""
        width={306}
        height={height}
        loading="lazy"
        decoding="async"
        className="h-[var(--photo-h-sm)] w-full rounded-2xl object-cover lg:h-[var(--photo-h)]"
        style={
          {
            "--photo-h-sm": `${mobileHeight}px`,
            "--photo-h": `${height}px`,
          } as CSSProperties
        }
      />
    </PhotoLightbox>
  );
}
