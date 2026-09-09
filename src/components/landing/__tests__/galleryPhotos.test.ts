import { readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { PHOTO_COUNT } from "../Gallery";

// The files in public/ and PHOTO_COUNT have to agree: the component asks for
// gallery-1..N by number, so a missing file is a broken image and a stray one
// is a photo nobody sees. Neither fails loudly on its own.
const indices = readdirSync(join(process.cwd(), "public"))
  .map((f) => /^gallery-(\d+)\.webp$/.exec(f)?.[1])
  .filter((n): n is string => n !== undefined)
  .map(Number)
  .sort((a, b) => a - b);

describe("gallery photos", () => {
  it("has a file for every slot, numbered 1..PHOTO_COUNT with no gaps", () => {
    expect(indices).toEqual(
      Array.from({ length: PHOTO_COUNT }, (_, i) => i + 1),
    );
  });

  // One numbered string rather than a description per photo — so the thing
  // worth pinning is that it still carries the number, since without it all
  // 25 images would share one indistinguishable label.
  it("numbers the alt text", () => {
    expect(messages.landing.gallery.photoAlt).toContain("{n}");
  });
});
