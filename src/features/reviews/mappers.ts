// A published review as the public «Відгуки» page may show it.
//
// The parent's FIRST name, the rating, the text and the date — and the
// family's photo with the gift only when they ticked `social_media_consent`
// («…на публікацію фотографій, відгуків та історії моєї дитини на сайті»).
// Without it the review still appears, as text alone (Vital, 2026-11-27).
//
// Nothing about the child: not their name (Vital, same day — the design drew
// «Олена, дитина Меліса»), not their age or town. This is a page anyone can
// open without signing in.
export type PublicReview = {
  id: string;
  rating: number;
  body: string | null;
  authorFirstName: string | null;
  createdAt: Date;
  // The photo's version (its updated_at), for the url — a turned photo is a
  // new url. Null means no photo is shown, for whatever reason.
  photoVersion: number | null;
};

export function toPublicReview(row: {
  id: string;
  rating: number;
  body: string | null;
  authorFirstName: string | null;
  createdAt: Date;
  // Tri-state in the schema: null is "never answered", which is not a yes.
  socialMediaConsent: boolean | null;
  photo: { version: number } | null;
}): PublicReview {
  return {
    id: row.id,
    rating: row.rating,
    body: row.body,
    authorFirstName: row.authorFirstName,
    createdAt: row.createdAt,
    photoVersion:
      row.socialMediaConsent === true && row.photo ? row.photo.version : null,
  };
}

// Where the page reads a review's photo from. The version is ignored by the
// route; it only makes a turned photo a new url.
export function publicReviewPhotoHref(review: {
  id: string;
  photoVersion: number;
}): string {
  return `/reviews/${review.id}/photo?v=${review.photoVersion}`;
}

// Whether a review's gift photo may go in the site gallery: the family ticked
// `social_media_consent` (null is "never answered", not a yes) and there is a
// photo to show. The admin button follows this; setReviewInGallery applies the
// same rule in SQL, which is the one that counts.
export function isGalleryEligible(review: {
  socialMediaConsent: boolean | null;
  hasPhoto: boolean;
}): boolean {
  return review.socialMediaConsent === true && review.hasPhoto;
}
