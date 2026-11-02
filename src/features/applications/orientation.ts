import path from "node:path";

import { createWorker, OEM } from "tesseract.js";

// Which way is up, read from the TEXT in a photo rather than from the phone.
//
// The EXIF tag cannot answer this for the photos that need it most: a document
// lying flat on a table, shot from above, where the phone has no idea which
// way it is held. Both photos that started this (Nov 2026) were exactly that —
// an iPhone ВПО certificate tagged "turn 90°" over upright pixels, and a
// Samsung letter tagged "upright" over sideways ones.
//
// Tesseract's orientation detection (OSD) reads the page layout and script.
// Measured on those two photos in all four orientations: 8/8 correct at 2560px,
// confidence ~22–24 for the printed certificate and ~5.5–6 for a child's
// handwriting, against 0.5 for an image with no text. At 1024px the
// handwriting answers were WRONG — so it runs on the full stored size.
//
// Cost per photo, measured: ~0.3 s (a fresh worker included), ~+130 MB while
// it runs, and ~60 MB the allocator keeps afterwards — flat over 25 runs, not
// a leak. On a 512 MB dyno that is why it runs inside photos.ts's one-at-a-time
// queue.
//
// It runs for EVERY kind (Vital, Nov 2026). It was first limited to the
// certificate and the letter, on the theory that a face or a gift has no text
// to read — until a letter was photographed into the gift slot. A photo with
// no text scores ~0.5 against a threshold of 3 and is simply left alone, so
// the cost of asking is CPU, not wrong turns.

// Below this, the photo is left as it is. Chosen to clear the handwriting
// (~5.5) with room to spare over the no-text case (~0.5) and every wrong answer
// seen (≤1.5). It rests on two photos: the upload route logs each decision so
// it can be revisited against real ones.
export const MIN_ORIENTATION_CONFIDENCE = 3;

// No answer within this, and the photo is stored as it is. A stuck detector
// must never hold a parent's upload.
const DETECT_TIMEOUT_MS = 15_000;

// The model ships in node_modules (@tesseract.js-data/osd), so nothing is
// fetched from a CDN at runtime and nothing large is committed. Resolved from
// the working directory rather than require.resolve, which the bundler would
// rewrite; the package has no types to import it by.
const OSD_LANG_PATH = path.join(
  process.cwd(),
  "node_modules",
  "@tesseract.js-data",
  "osd",
  "4.0.0",
);

export type QuarterTurn = 0 | 90 | 180 | 270;

export type OrientationGuess = {
  // Clockwise degrees that make the photo upright.
  turn: QuarterTurn;
  confidence: number;
};

// Null when there is no usable answer: an error, a timeout, or an angle that
// is not a quarter turn. Never throws — a failed guess just means no auto-turn.
//
// Expects photos.ts's output: a JPEG with no EXIF. That matters — tesseract.js
// reads an EXIF orientation tag itself and would apply it before guessing.
export async function detectOrientation(
  jpeg: Uint8Array,
): Promise<OrientationGuess | null> {
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // A fresh worker per photo and terminated after, deliberately: a resident
    // one would hold its ~100 MB for the life of the dyno, for something that
    // runs a few times a day.
    worker = await createWorker("osd", OEM.TESSERACT_ONLY, {
      legacyCore: true,
      legacyLang: true,
      langPath: OSD_LANG_PATH,
      gzip: true,
      // Never write the model to a cache dir: it is already on disk.
      cacheMethod: "none",
      // REQUIRED. Without a handler, tesseract.js re-throws a failed job from
      // its worker's message listener — an uncaught exception that would take
      // the whole server down over one unreadable photo. The same error still
      // rejects the awaited call below, which is where it is handled.
      errorHandler: () => undefined,
    });
    const detection = worker.detect(withResolution(jpeg));
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), DETECT_TIMEOUT_MS);
    });
    const result = await Promise.race([detection, timeout]);
    if (!result) {
      return null;
    }
    const { orientation_degrees: degrees, orientation_confidence: confidence } =
      result.data;
    if (
      confidence === null ||
      (degrees !== 0 && degrees !== 90 && degrees !== 180 && degrees !== 270)
    ) {
      return null;
    }
    // Tesseract's `orientation_degrees` is already the clockwise correction:
    // a photo turned 90° counter-clockwise reports 90 (checked against all
    // four orientations, see the spec).
    return { turn: degrees, confidence };
  } catch (error) {
    logFailure(error);
    return null;
  } finally {
    clearTimeout(timer);
    await worker?.terminate().catch(() => undefined);
  }
}

// The message only — an image is never logged. Tesseract rejects with a plain
// string, not an Error.
function logFailure(error: unknown) {
  console.error(
    "detectOrientation failed:",
    error instanceof Error ? error.message : String(error),
  );
}

// Our JPEGs say nothing about resolution — the metadata is stripped and
// libvips writes no JFIF header — so Tesseract logs a warning for every photo
// before assuming 70 dpi (its `user_defined_dpi` does not reach detect()).
// This hands it a COPY with a 16-byte JFIF header saying 70 dpi: the same
// assumption without the log line, no re-encode, and nothing added to the
// stored file. (sharp's withDensity() was tried and rejected: it writes the
// density into EXIF, which Leptonica does not read for a JPEG.)
const JFIF_70_DPI = Buffer.from([
  0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
  // units = dots per inch, then x and y density: 70
  0x01, 0x00, 0x46, 0x00, 0x46,
  // no thumbnail
  0x00, 0x00,
]);
function withResolution(jpeg: Uint8Array): Buffer {
  const bytes = Buffer.from(jpeg.buffer, jpeg.byteOffset, jpeg.byteLength);
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const hasApp0 = bytes[2] === 0xff && bytes[3] === 0xe0;
  if (!isJpeg || hasApp0) {
    return bytes;
  }
  return Buffer.concat([bytes.subarray(0, 2), JFIF_70_DPI, bytes.subarray(2)]);
}
