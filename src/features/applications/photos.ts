import sharp from "sharp";

// Every uploaded photo is re-encoded on the server before it is stored. One
// pass covers three separate problems:
//
//   1. ORIENTATION. Phones save the sensor's pixels plus an EXIF tag saying how
//      to turn them. Applying the tag here and dropping it means every viewer
//      shows the same thing, instead of each one deciding whether to honour it.
//      This does NOT fix a photo whose tag is wrong — a document shot flat on a
//      table, where the phone cannot tell which way is up. That is what
//      `turn` (the rotate button) is for.
//   2. LOCATION. Android cameras write GPS coordinates into the file, and the
//      letter photo is on the browse card (tier 1): any volunteer could read
//      where the family lives out of the original. Re-encoding keeps none of
//      the metadata.
//   3. SIZE. A 12 MP phone photo is 2–3 MB; at 2560px it is ~300–500 KB and a
//      document is still readable — the ВПО certificate is the one an admin
//      has to READ, so don't go much lower than this.
//
// The output is always a JPEG, whatever came in: one format for every viewer.
export const MAX_PHOTO_SIDE = 2560;
const JPEG_QUALITY = 85;

// Refused before decoding, as `too_large`. The 10 MB byte cap does not bound
// pixels — a flat PNG can declare a huge canvas in a few KB — and a decoded
// image is what costs memory on a small dyno. 100 MP still admits a 50 MP
// phone camera; JPEGs are decoded shrunk (libvips' shrink-on-load), so the
// real cost of a large one is far below width × height × 3.
export const MAX_INPUT_PIXELS = 100_000_000;

// Bounded memory over speed: one libvips thread, no operation cache, and one
// photo at a time per process (see `oneAtATime`). Uploads are rare — a parent
// sends three photos once per campaign — so a queue costs nothing anyone would
// notice, while three parallel decodes of a 12 MP photo can push a 512 MB dyno
// over its quota.
sharp.cache(false);
sharp.concurrency(1);

export type PhotoTurn = "left" | "right";

type QuarterTurn = 0 | 90 | 270;

export type PhotoResult =
  | { ok: true; bytes: Uint8Array; contentType: "image/jpeg" }
  | { ok: false; reason: "unsupported_type" | "too_large" };

export function normalizePhoto(
  input: Uint8Array,
  options: {
    // An explicit quarter turn — the rotate button.
    turn?: PhotoTurn;
  } = {},
): Promise<PhotoResult> {
  const turn: QuarterTurn =
    options.turn === "right" ? 90 : options.turn === "left" ? 270 : 0;
  return oneAtATime(() => encode(input, turn));
}

async function encode(
  input: Uint8Array,
  turn: QuarterTurn,
): Promise<PhotoResult> {
  // Sniffed from the bytes, not the declared Content-Type, and BEFORE sharp
  // sees them: libvips also reads SVG, TIFF, GIF, PDF and more, and none of
  // those decoders has any business running on a file a stranger uploaded.
  if (!isAcceptedImage(input)) {
    return { ok: false, reason: "unsupported_type" };
  }

  let width: number | undefined;
  let height: number | undefined;
  try {
    // Header only, so the pixel limit is lifted HERE — sharp's own default
    // would throw on a huge canvas and report it as a broken file, when the
    // honest answer is "too large".
    ({ width, height } = await sharp(input, {
      limitInputPixels: false,
    }).metadata());
  } catch {
    return { ok: false, reason: "unsupported_type" };
  }
  if (!width || !height) {
    return { ok: false, reason: "unsupported_type" };
  }
  if (width * height > MAX_INPUT_PIXELS) {
    return { ok: false, reason: "too_large" };
  }

  try {
    const bytes = await sharp(input, {
      limitInputPixels: MAX_INPUT_PIXELS,
      // Phones do produce slightly malformed JPEGs (a truncated tail, an odd
      // marker). Showing a photo with a grey strip beats refusing a parent's
      // only shot of a document.
      failOn: "error",
    })
      // Applies the EXIF tag, whatever order it is called in relative to
      // rotate(), and removes it.
      .autoOrient()
      .rotate(turn)
      .resize({
        width: MAX_PHOTO_SIDE,
        height: MAX_PHOTO_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      })
      // JPEG has no alpha; a transparent PNG would otherwise come out black.
      .flatten({ background: "#ffffff" })
      // Not mozjpeg: ~30% smaller, but twice the CPU on a slow dyno.
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    return {
      ok: true,
      bytes: new Uint8Array(bytes),
      contentType: "image/jpeg",
    };
  } catch {
    return { ok: false, reason: "unsupported_type" };
  }
}

// JPEG, PNG and WebP — the same set as ALLOWED_UPLOAD_TYPES, checked on the
// bytes. HEIC is not here: sharp's prebuilt libvips cannot decode it.
function isAcceptedImage(bytes: Uint8Array): boolean {
  const startsWith = (offset: number, signature: readonly number[]) =>
    signature.every((byte, i) => bytes[offset + i] === byte);
  return (
    startsWith(0, [0xff, 0xd8, 0xff]) ||
    startsWith(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ||
    // "RIFF" <size> "WEBP"
    (startsWith(0, [0x52, 0x49, 0x46, 0x46]) &&
      startsWith(8, [0x57, 0x45, 0x42, 0x50]))
  );
}

// A single queue per process: each photo starts when the previous one has
// finished, failed or not.
let queue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  queue = run.catch(() => undefined);
  return run;
}
