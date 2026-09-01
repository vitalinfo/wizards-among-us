// The photos a volunteer sees once they hold the claim: the child's letter, the
// child holding it, and — after the family confirms — the gift that arrived.
//
// Every one streams through /api/applications/.../files/..., which re-checks
// that this actor still holds the claim and logs the read. Never a direct
// storage url: a signed link can be forwarded and replayed, and these are
// photographs of a child.
//
// Deliberately NOT async: it takes its copy already translated, so the caller
// (ClaimCard, which is async) resolves it once. An async component nested
// inside another cannot be rendered by React Testing Library, which is how
// ClaimCard ended up with no test at all.
export function ClaimPhotos({
  applicationId,
  photos,
}: {
  applicationId: string;
  photos: readonly {
    id: string;
    title: string;
    alt: string;
    openLabel: string;
  }[];
}) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <ul className="mt-3 flex flex-wrap gap-4">
      {photos.map((photo) => (
        <li key={photo.id}>
          <figure className="flex flex-col gap-2">
            <figcaption className="text-sm font-medium">
              {photo.title}
            </figcaption>
            {/* Opens the full-resolution image. A thumbnail is enough to see
                that a letter exists and useless for READING it, which is the
                only reason the volunteer is shown one. */}
            <a
              href={`/api/applications/${applicationId}/files/${photo.id}`}
              target="_blank"
              rel="noreferrer"
              aria-label={photo.openLabel}
              className="focus-visible:outline-primary rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- served by an authorized route, not an optimizable static asset */}
              <img
                src={`/api/applications/${applicationId}/files/${photo.id}`}
                alt={photo.alt}
                className="border-border max-h-80 w-auto rounded-md border"
              />
            </a>
          </figure>
        </li>
      ))}
    </ul>
  );
}
