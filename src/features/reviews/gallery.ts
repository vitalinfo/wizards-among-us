// The site gallery: family photos with the gift, from reviews an admin put in
// the gallery (reviews.in_gallery) and whose family consented to publication.
// Shown on the landing, /about, the initiative pages, /parent and /volunteer.

// The design's row shows three and a half photos; 20 is several pages of
// paging without loading every photo ever added.
export const GALLERY_SIZE = 20;

const HOUR_MS = 60 * 60 * 1000;

// The seed for the gallery's pick, the same scheme as the «Відгуки» page
// (reviewsOrderSeed): the current hour, so everyone sees the same 20 within
// an hour and a different pick the next. Its own prefix, so the gallery and
// the reviews page do not shuffle into the same order.
export function galleryOrderSeed(now: Date): string {
  return `gallery:${Math.floor(now.getTime() / HOUR_MS)}`;
}

export type GalleryPhoto = {
  reviewId: string;
  // The photo's updated_at, for the url — a turned photo is a new url.
  version: number;
};

// Where the gallery reads a photo from. The version is ignored by the route;
// it only makes a turned photo a new url.
export function galleryPhotoHref(photo: GalleryPhoto): string {
  return `/gallery/${photo.reviewId}/photo?v=${photo.version}`;
}
