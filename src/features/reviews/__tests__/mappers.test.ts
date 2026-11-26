import { describe, expect, it } from "vitest";

import { publicReviewPhotoHref, toPublicReview } from "../mappers";

const row = {
  id: "0c9e5c55-6a3f-4a86-9a0e-4f1d2f6b7a10",
  rating: 5,
  body: "Дякуємо!",
  authorFirstName: "Олена",
  createdAt: new Date("2026-11-19T10:00:00Z"),
  socialMediaConsent: true as boolean | null,
  photo: { version: 1763546400000 } as { version: number } | null,
};

describe("toPublicReview", () => {
  // The publication consent is the ONLY thing that puts a child's photo on a
  // page anyone can open.
  it("keeps the photo when the family consented to publication", () => {
    expect(toPublicReview(row).photoVersion).toBe(1763546400000);
  });

  it("drops the photo when the family declined", () => {
    expect(
      toPublicReview({ ...row, socialMediaConsent: false }).photoVersion,
    ).toBeNull();
  });

  // Null is "never answered" — an old application, or one an admin entered
  // without asking. Not a yes.
  it("drops the photo when the consent was never answered", () => {
    expect(
      toPublicReview({ ...row, socialMediaConsent: null }).photoVersion,
    ).toBeNull();
  });

  it("has no photo to show when none was uploaded", () => {
    expect(toPublicReview({ ...row, photo: null }).photoVersion).toBeNull();
  });

  // Without consent the review still appears, as text (Vital, 2026-11-27).
  it("keeps the text, rating and first name either way", () => {
    expect(toPublicReview({ ...row, socialMediaConsent: false })).toEqual({
      id: row.id,
      rating: 5,
      body: "Дякуємо!",
      authorFirstName: "Олена",
      createdAt: row.createdAt,
      photoVersion: null,
    });
  });
});

describe("publicReviewPhotoHref", () => {
  it("points at the review's public photo route, versioned", () => {
    expect(publicReviewPhotoHref({ id: row.id, photoVersion: 42 })).toBe(
      `/reviews/${row.id}/photo?v=42`,
    );
  });
});
