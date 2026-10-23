// The photo of the child's letter, on the browse card (Figma 118:420).
//
// A plain <img>, not next/image. The bytes come from the authorized route,
// which checks the file KIND and the child's browsability on every read and
// writes an audit row for each one — the whole reason reads are proxied rather
// than served from a signed url (see the route's own comment). Handing that url
// to the image optimizer would put derived copies of a child's letter in a
// build cache and a CDN, where nothing checks anything and no read is logged.
//
// Sized, not intrinsic: the optimizer is what usually supplies width/height, so
// they are declared here to keep the layout from jumping while it loads.
export function ChildPhoto({
  applicationId,
  fileId,
  alt,
  className,
}: {
  applicationId: string;
  fileId: string;
  // Names WHAT this is, never the child — see the card for the wording.
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- authorized, logged, never optimized; see above
    <img
      src={`/api/applications/${applicationId}/files/${fileId}`}
      alt={alt}
      width={257}
      height={346}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
