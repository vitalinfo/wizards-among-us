import { PhotoLightbox } from "@/components/ui/PhotoLightbox";

// The family's photo with the gift, opening over the page. Streams through the
// authorized route, which re-checks the admin and logs the read — never a
// direct storage URL. Lazy, so a long queue doesn't fetch (and log) every
// photo on load, only the ones scrolled to.
export function ReviewConfirmationPhoto({
  applicationId,
  photo,
  title,
  alt,
}: {
  applicationId: string;
  photo: { id: string; version: number };
  title: string;
  alt: string;
}) {
  const fileUrl = `/api/applications/${applicationId}/files/${photo.id}`;
  // The version makes a turned photo a new URL, so the thumbnail reloads on
  // the refresh that follows a turn. The route ignores it.
  const href = `${fileUrl}?v=${photo.version}`;
  return (
    <PhotoLightbox
      href={href}
      // Admin-only page, and admins may always turn a photo
      // (canRotateApplicationFile). The route checks again either way.
      rotateHref={`${fileUrl}/rotate`}
      title={title}
      alt={alt}
      className="shrink-0 self-start"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- served by an authorized route, not an optimizable static asset */}
      <img
        src={href}
        alt=""
        width={122}
        height={122}
        loading="lazy"
        decoding="async"
        className="border-border size-[122px] rounded-md border object-cover"
      />
    </PhotoLightbox>
  );
}
