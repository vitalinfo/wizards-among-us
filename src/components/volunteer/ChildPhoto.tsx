import { PhotoLightbox } from "@/components/ui/PhotoLightbox";
import { cn } from "@/lib/utils";

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
//
// Wrapped in the lightbox, like the claim card's photos: 257px of handwriting
// is not readable, and the letter is one of the things a volunteer chooses on.
// The trigger is still a real link to the file, so the photo stays reachable
// with no JavaScript. The card's own sizing lives here with the dimensions it
// has to match; `className` is placement only, and lands on the LINK, which is
// what the card lays out.
export function ChildPhoto({
  applicationId,
  fileId,
  title,
  alt,
  className,
}: {
  applicationId: string;
  fileId: string;
  // Names the overlay, and the link that opens it.
  title: string;
  // Names WHAT this is, never the child — see the card for the wording. It
  // describes the full-size photo in the overlay; the thumbnail's alt is empty
  // on purpose, because the link around it is already named «{title} —
  // відкрити» and a second description of the same letter would be read twice.
  alt: string;
  className?: string;
}) {
  const href = `/api/applications/${applicationId}/files/${fileId}`;

  return (
    <PhotoLightbox
      href={href}
      title={title}
      alt={alt}
      className={cn("block", className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- authorized, logged, never optimized; see above */}
      <img
        src={href}
        alt=""
        width={257}
        height={346}
        loading="lazy"
        decoding="async"
        className="h-[275px] w-full rounded-xl object-cover lg:h-[346px]"
      />
    </PhotoLightbox>
  );
}
