import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { applicationFiles, applications, reviews, users } from "@/db/schema";

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

// What the landing page shows. First name only (Vital, Phase 7) — enough to
// read as a real person, not enough to tie a review to one family alongside a
// story and an oblast.
export type PublishedReview = {
  id: string;
  rating: number;
  body: string | null;
  authorFirstName: string | null;
};

export async function listPublishedReviews(
  limit = 6,
): Promise<PublishedReview[]> {
  return getDb()
    .select({
      id: reviews.id,
      rating: reviews.rating,
      body: reviews.body,
      authorFirstName: users.firstName,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(eq(reviews.isPublished, true))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

// The moderation queue: everything, newest first, with enough context to judge
// — including the family's photo with the gift, the proof the review is about.
export async function listReviewsForModeration() {
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
    .orderBy(desc(reviews.createdAt));

  const applicationIds = [
    ...new Set(rows.flatMap((row) => row.applicationId ?? [])),
  ];
  // Oldest first, so the last write per application is its newest
  // confirmation — the same rule as latestByKind.
  const photos = new Map<string, { id: string; version: number }>();
  if (applicationIds.length > 0) {
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
          inArray(applicationFiles.applicationId, applicationIds),
        ),
      )
      .orderBy(asc(applicationFiles.createdAt), asc(applicationFiles.id));
    for (const file of files) {
      photos.set(file.applicationId, {
        id: file.id,
        version: file.updatedAt.getTime(),
      });
    }
  }

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
