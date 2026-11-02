// @vitest-environment node
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

import { detectOrientation, MIN_ORIENTATION_CONFIDENCE } from "../orientation";
import { documentPage } from "@/test/documentPage";

// Real Tesseract on a generated page (src/test/documentPage.ts) — never a
// real upload, which would be a photograph of a child's document.

async function turned(page: Buffer, degrees: number) {
  return new Uint8Array(await sharp(page).rotate(degrees).jpeg().toBuffer());
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("detectOrientation", () => {
  it("says how far to turn a page of text, whichever way it lies", async () => {
    const page = await documentPage();

    // Turned clockwise by `lying`, it needs the rest of the circle back.
    for (const lying of [0, 90, 180, 270]) {
      const guess = await detectOrientation(await turned(page, lying));

      expect(guess?.turn).toBe((360 - lying) % 360);
      expect(guess?.confidence).toBeGreaterThanOrEqual(
        MIN_ORIENTATION_CONFIDENCE,
      );
    }
  }, 30_000);

  it("is not confident about a photo with no text", async () => {
    // What a photo of a child or of a gift looks like to it: no lines at all.
    const noise = await sharp({
      create: {
        width: 1600,
        height: 1200,
        channels: 3,
        // Required by the types, and painted over by the noise.
        background: "#808080",
        noise: { type: "gaussian", mean: 128, sigma: 60 },
      },
    })
      .blur(8)
      .jpeg()
      .toBuffer();

    const guess = await detectOrientation(new Uint8Array(noise));

    expect(
      guess === null || guess.confidence < MIN_ORIENTATION_CONFIDENCE,
    ).toBe(true);
  }, 30_000);

  // Without tesseract.js's errorHandler, a job failing inside its worker was
  // an UNCAUGHT exception — enough to take a server down over one photo.
  // Vitest fails a run on an uncaught error, so this also guards that.
  it("gives no answer, rather than throwing, for bytes it cannot read", async () => {
    const logged = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    // Tesseract's own complaint, written from its worker thread — as bytes,
    // and only AFTER the job has already been rejected.
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const guess = await detectOrientation(
      new Uint8Array(Buffer.from("not an image")),
    );

    expect(guess).toBeNull();
    expect(logged).toHaveBeenCalledWith(
      "detectOrientation failed:",
      expect.stringContaining("read image"),
    );
    await vi.waitFor(
      () =>
        expect(
          stderr.mock.calls.some(([chunk]) =>
            Buffer.from(chunk as Uint8Array)
              .toString()
              .includes("Error in pixRead"),
          ),
        ).toBe(true),
      { timeout: 5_000 },
    );
  }, 30_000);
});
