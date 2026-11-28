import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  inArray,
  type SQL,
  sql,
} from "drizzle-orm";

import { getDb } from "@/db";
import { applicationFiles, applications, reviews, users } from "@/db/schema";

import {
  ALL_REVIEWS,
  REVIEWS_PAGE_SIZE,
  type ReviewListFilter,
} from "./listFilter";
import { type GalleryPhoto, galleryOrderSeed, GALLERY_SIZE } from "./gallery";
import { type PublicReview, toPublicReview } from "./mappers";

export async function hasReviewed(
  userId: string,
  applicationId: string,
): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(eq(reviews.userId, userId), eq(reviews.applicationId, applicationId)),
    )
    .limit(1);
  return row !== undefined;
}

// The family's review of one application, for the volunteer who fulfilled it
// — published or not. Only the parent's own: the author is matched to the
// application's parent, so no other row can ride in. Newest first, though
// getReviewBlockReason allows only one.
export async function getApplicationReview(
  applicationId: string,
  parentId: string,
): Promise<{ rating: number; body: string | null; createdAt: Date } | null> {
  const [row] = await getDb()
    .select({
      rating: reviews.rating,
      body: reviews.body,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.applicationId, applicationId),
        eq(reviews.userId, parentId),
      ),
    )
    .orderBy(desc(reviews.createdAt), desc(reviews.id))
    .limit(1);
  return row ?? null;
}

// Born UNPUBLISHED (the column default): a review is written by a member of the
// public and appears on the landing page, so an admin decides before anyone
// sees it.
export async function createReview(values: {
  userId: string;
  applicationId: string;
  rating: number;
  body: string | null;
}): Promise<string> {
  const [row] = await getDb()
    .insert(reviews)
    .values(values)
    .returning({ id: reviews.id });
  return row.id;
}

// The public «Відгуки» page (Figma 186:2). The parent's FIRST name only, and
// never the child's (Vital, 2026-11-27) — the design drew «Олена, дитина
// Меліса», and the child's name is deliberately not selected here, so no
// component downstream can print it by accident.
//
// The family's photo with the gift rides along only when the application
// carries `social_media_consent` — see toPublicReview, which is where that
// rule lives.
export async function countPublishedReviews(): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(reviews)
    .where(eq(reviews.isPublished, true));
  return row?.total ?? 0;
}

export async function listPublishedReviews({
  orderSeed,
  limit,
  offset,
}: {
  // reviewsOrderSeed(): the current hour.
  orderSeed: string;
  limit: number;
  offset: number;
}): Promise<PublicReview[]> {
  const rows = await getDb()
    .select({
      id: reviews.id,
      rating: reviews.rating,
      body: reviews.body,
      createdAt: reviews.createdAt,
      authorFirstName: users.firstName,
      applicationId: reviews.applicationId,
      socialMediaConsent: applications.socialMediaConsent,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .leftJoin(applications, eq(applications.id, reviews.applicationId))
    .where(eq(reviews.isPublished, true))
    // Shuffled hourly, like the volunteer browse list, so the same reviews
    // are not always the first ones read. The id breaks a hash tie, so the
    // order stays total and a page boundary never repeats or skips a review.
    .orderBy(
      sql`md5(${orderSeed}::text || ${reviews.id}::text)`,
      asc(reviews.id),
    )
    .limit(limit)
    .offset(offset);

  // Photos are looked up only for the applications that consented: the rest
  // could not show one anyway, and not reading them is the stronger guarantee.
  const photos = await latestConfirmationPhotos(
    rows.flatMap((row) =>
      row.socialMediaConsent === true && row.applicationId
        ? [row.applicationId]
        : [],
    ),
  );

  return rows.map((row) =>
    toPublicReview({
      ...row,
      photo: row.applicationId ? (photos.get(row.applicationId) ?? null) : null,
    }),
  );
}

// Whether a review's gift photo may go in the gallery, as SQL: the
// application consented (null is not a yes) and has a confirmation photo. The
// same rule as isGalleryEligible, which the admin button follows; this is the
// one that counts. Correlated on the outer `reviews` row.
function galleryEligibleWhere() {
  const db = getDb();
  return exists(
    db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.id, reviews.applicationId),
          eq(applications.socialMediaConsent, true),
          exists(
            db
              .select({ id: applicationFiles.id })
              .from(applicationFiles)
              .where(
                and(
                  eq(applicationFiles.applicationId, applications.id),
                  eq(applicationFiles.kind, "confirmation"),
                ),
              ),
          ),
        ),
      ),
  );
}

// `= true` as a literal, not a bound parameter, so it matches the partial
// index's predicate (reviews_in_gallery_idx) under any plan.
const IN_GALLERY = sql`${reviews.inGallery} = true`;

// The object behind a review's photo on a public page — or null, which the
// route turns into a 404. The page's own condition (`visible`: published for
// «Відгуки», in the gallery for the gallery) plus, always, the consent and the
// file kind: never any other kind of file, so a review id cannot become a way
// to read a letter or a certificate.
async function publicReviewPhoto(
  reviewId: string,
  visible: SQL,
): Promise<PublicPhotoObject | null> {
  const [row] = await getDb()
    .select({
      storageKey: applicationFiles.storageKey,
      contentType: applicationFiles.contentType,
      sizeBytes: applicationFiles.sizeBytes,
    })
    .from(reviews)
    .innerJoin(applications, eq(applications.id, reviews.applicationId))
    .innerJoin(
      applicationFiles,
      eq(applicationFiles.applicationId, applications.id),
    )
    .where(
      and(
        eq(reviews.id, reviewId),
        visible,
        eq(applications.socialMediaConsent, true),
        eq(applicationFiles.kind, "confirmation"),
      ),
    )
    // The newest confirmation — the reverse of latestConfirmationPhotos'
    // oldest-first-last-wins, so the page and the route agree on which one.
    .orderBy(desc(applicationFiles.createdAt), desc(applicationFiles.id))
    .limit(1);
  return row ?? null;
}

export type PublicPhotoObject = {
  storageKey: string;
  contentType: string;
  sizeBytes: number;
};

// «Відгуки»: the SAME three conditions the page applies — published,
// consented, a confirmation photo.
export function getPublicReviewPhoto(
  reviewId: string,
): Promise<PublicPhotoObject | null> {
  return publicReviewPhoto(reviewId, eq(reviews.isPublished, true));
}

// The gallery: in the gallery, consented, a confirmation photo. Not
// "published" — the gallery shows the photo alone, never the review's text.
export function getGalleryPhoto(
  reviewId: string,
): Promise<PublicPhotoObject | null> {
  return publicReviewPhoto(reviewId, IN_GALLERY);
}

// The gallery's photos: GALLERY_SIZE of them, picked by the hour's seed.
//
// Resilient like listActiveFaqs: every page that shows the gallery must render
// without a database (CI builds have none), so a failure is an empty list and
// the section renders nothing. Same for a gallery nobody has filled yet.
export async function listGalleryPhotos(
  now: Date = new Date(),
): Promise<GalleryPhoto[]> {
  try {
    const rows = await getDb()
      .select({ id: reviews.id, applicationId: reviews.applicationId })
      .from(reviews)
      // IN_GALLERY for the partial index; the eligibility check again because
      // a family can withdraw consent after the admin added the photo, and
      // the gallery must drop it then, not when someone notices.
      .where(and(IN_GALLERY, galleryEligibleWhere()))
      // As listPublishedReviews: shuffled by the seed, the id breaking a tie.
      .orderBy(
        sql`md5(${galleryOrderSeed(now)}::text || ${reviews.id}::text)`,
        asc(reviews.id),
      )
      .limit(GALLERY_SIZE);

    const photos = await latestConfirmationPhotos(
      rows.flatMap((row) => row.applicationId ?? []),
    );
    return rows.flatMap((row) => {
      const photo = row.applicationId ? photos.get(row.applicationId) : null;
      return photo ? [{ reviewId: row.id, version: photo.version }] : [];
    });
  } catch (error) {
    console.error("listGalleryPhotos failed:", error);
    return [];
  }
}

// Oldest first, so the last write per application is its newest
// confirmation — the same rule as latestByKind.
async function latestConfirmationPhotos(
  applicationIds: string[],
): Promise<Map<string, { id: string; version: number }>> {
  const photos = new Map<string, { id: string; version: number }>();
  const unique = [...new Set(applicationIds)];
  if (unique.length === 0) {
    return photos;
  }
  const files = await getDb()
    .select({
      id: applicationFiles.id,
      applicationId: applicationFiles.applicationId,
      updatedAt: applicationFiles.updatedAt,
    })
    .from(applicationFiles)
    .where(
      and(
        eq(applicationFiles.kind, "confirmation"),
        inArray(applicationFiles.applicationId, unique),
      ),
    )
    .orderBy(asc(applicationFiles.createdAt), asc(applicationFiles.id));
  for (const file of files) {
    photos.set(file.applicationId, {
      id: file.id,
      version: file.updatedAt.getTime(),
    });
  }
  return photos;
}

function moderationWhere({ status, gallery }: ReviewListFilter) {
  return and(
    status === "all"
      ? undefined
      : eq(reviews.isPublished, status === "published"),
    gallery === "in"
      ? IN_GALLERY
      : gallery === "eligible"
        ? and(eq(reviews.inGallery, false), galleryEligibleWhere())
        : undefined,
  );
}

// How many reviews the moderation list holds under this filter — the pager's
// total, read before the page so a stale ?page= can be clamped.
export async function countReviewsForModeration(
  filter: ReviewListFilter = ALL_REVIEWS,
): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(reviews)
    .where(moderationWhere(filter));
  return row?.total ?? 0;
}

// The moderation queue: newest first, one page at a time, with enough context
// to judge — including the family's photo with the gift, the proof the review
// is about.
export async function listReviewsForModeration(
  filter: ReviewListFilter = ALL_REVIEWS,
  { limit, offset }: { limit: number; offset: number } = {
    limit: REVIEWS_PAGE_SIZE,
    offset: 0,
  },
) {
  const rows = await getDb()
    .select({
      id: reviews.id,
      rating: reviews.rating,
      body: reviews.body,
      isPublished: reviews.isPublished,
      inGallery: reviews.inGallery,
      createdAt: reviews.createdAt,
      authorId: reviews.userId,
      authorFirstName: users.firstName,
      authorUsername: users.username,
      applicationId: applications.id,
      childName: applications.childName,
      socialMediaConsent: applications.socialMediaConsent,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .leftJoin(applications, eq(applications.id, reviews.applicationId))
    .where(moderationWhere(filter))
    // id breaks ties, so a review can't appear on two pages or on none.
    .orderBy(desc(reviews.createdAt), desc(reviews.id))
    .limit(limit)
    .offset(offset);

  const photos = await latestConfirmationPhotos(
    rows.flatMap((row) => row.applicationId ?? []),
  );

  return rows.map((row) => ({
    ...row,
    confirmationPhoto: row.applicationId
      ? (photos.get(row.applicationId) ?? null)
      : null,
  }));
}

export async function setReviewPublished(
  id: string,
  isPublished: boolean,
): Promise<void> {
  await getDb().update(reviews).set({ isPublished }).where(eq(reviews.id, id));
}

// Puts the family's gift photo in the site gallery, or takes it out. Adding
// is guarded in SQL by the two things that make the photo publishable — the
// application's social_media_consent and an actual confirmation photo — so a
// stale admin page cannot add a review whose family has since withdrawn
// consent. Removing is always allowed. Returns whether a row changed: false
// when it was already in that state, missing, or (on an add) not eligible.
export async function setReviewInGallery(
  id: string,
  inGallery: boolean,
): Promise<boolean> {
  const rows = await getDb()
    .update(reviews)
    .set({ inGallery })
    .where(
      and(
        eq(reviews.id, id),
        // Only a real change, so a double submit is not logged twice.
        eq(reviews.inGallery, !inGallery),
        inGallery ? galleryEligibleWhere() : undefined,
      ),
    )
    .returning({ id: reviews.id });
  return rows.length > 0;
}
