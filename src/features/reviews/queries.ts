import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { applicationFiles, applications, reviews, users } from "@/db/schema";

import { REVIEWS_PAGE_SIZE, type ReviewStatusFilter } from "./listFilter";
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

// The object behind a review's public photo — or null, which the route turns
// into a 404. The SAME three conditions the page applies, in SQL: published,
// consented, and a confirmation photo (never any other kind of file — the
// review id must not become a way to read a letter or a certificate).
export async function getPublicReviewPhoto(reviewId: string): Promise<{
  storageKey: string;
  contentType: string;
  sizeBytes: number;
} | null> {
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
        eq(reviews.isPublished, true),
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

function moderationStatusWhere(status: ReviewStatusFilter) {
  return status === "all"
    ? undefined
    : eq(reviews.isPublished, status === "published");
}

// How many reviews the moderation list holds under this filter — the pager's
// total, read before the page so a stale ?page= can be clamped.
export async function countReviewsForModeration(
  status: ReviewStatusFilter = "all",
): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(reviews)
    .where(moderationStatusWhere(status));
  return row?.total ?? 0;
}

// The moderation queue: newest first, one page at a time, with enough context
// to judge — including the family's photo with the gift, the proof the review
// is about.
export async function listReviewsForModeration(
  status: ReviewStatusFilter = "all",
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
      createdAt: reviews.createdAt,
      authorId: reviews.userId,
      authorFirstName: users.firstName,
      authorUsername: users.username,
      applicationId: applications.id,
      childName: applications.childName,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .leftJoin(applications, eq(applications.id, reviews.applicationId))
    .where(moderationStatusWhere(status))
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
