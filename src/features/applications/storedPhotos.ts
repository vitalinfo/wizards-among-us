import { MAX_PHOTO_SIDE } from "@/features/applications/photos";

// What the one-off backfill (src/scripts/normalizeStoredPhotos.ts) decides for
// a photo stored BEFORE uploads were normalized. Pure, so the rule is tested
// on its own rather than by running the script against a bucket.

export type StoredPhotoFacts = {
  format: string | undefined;
  width: number;
  height: number;
  // Any EXIF, ICC or XMP block. An original from a phone has at least one;
  // a photo that went through photos.ts has none.
  hasMetadata: boolean;
};

export type StoredPhotoDecision = "rewrite" | "already_normalized";

// Rewrite unless the stored photo is already exactly what an upload produces
// today. Re-encoding a photo that is already clean would only cost it a
// generation of JPEG quality.
export function decideStoredPhoto(
  before: StoredPhotoFacts,
): StoredPhotoDecision {
  const clean =
    before.format === "jpeg" &&
    Math.max(before.width, before.height) <= MAX_PHOTO_SIDE &&
    !before.hasMetadata;
  return clean ? "already_normalized" : "rewrite";
}
