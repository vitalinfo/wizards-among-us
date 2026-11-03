// @vitest-environment node
import { crc32, deflateSync } from "node:zlib";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { MAX_PHOTO_SIDE, normalizePhoto } from "../photos";

// Real sharp on generated images — no fixtures from production: a real upload
// is a photograph of a child's document.

// A landscape image whose LEFT half is red and right half blue, so a test can
// tell which way it was turned.
async function halves(
  width: number,
  height: number,
  format: "jpeg" | "png" = "jpeg",
) {
  const half = await sharp({
    create: { width: width / 2, height, channels: 3, background: "#ff0000" },
  })
    .png()
    .toBuffer();
  const base = sharp({
    create: { width, height, channels: 3, background: "#0000ff" },
  }).composite([{ input: half, left: 0, top: 0 }]);
  return format === "png" ? base.png() : base.jpeg();
}

async function read(bytes: Uint8Array) {
  const image = sharp(bytes);
  const metadata = await image.metadata();
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });
  // RGB of the pixel at (x, y).
  const pixel = (x: number, y: number) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  return { metadata, pixel };
}

const isRed = ([r, g, b]: number[]) => r > 200 && g < 60 && b < 60;
const isBlue = ([r, g, b]: number[]) => b > 200 && r < 60 && g < 60;

async function normalized(input: Buffer, turn?: "left" | "right") {
  const result = await normalizePhoto(new Uint8Array(input), { turn });
  if (!result.ok) {
    throw new Error(`refused: ${result.reason}`);
  }
  return result;
}

describe("normalizePhoto", () => {
  it("applies the EXIF orientation to the pixels and drops the tag", async () => {
    // What an iPhone held upright sends: landscape pixels, "turn me 90° CW".
    const input = await (
      await halves(400, 200)
    )
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const result = await normalized(input);
    const { metadata, pixel } = await read(result.bytes);

    expect(result.contentType).toBe("image/jpeg");
    expect([metadata.width, metadata.height]).toEqual([200, 400]);
    expect(metadata.orientation).toBeUndefined();
    // Turned clockwise: the red left half is now the top.
    expect(isRed(pixel(100, 50))).toBe(true);
    expect(isBlue(pixel(100, 350))).toBe(true);
  });

  it("strips the metadata, GPS included", async () => {
    const input = await (
      await halves(400, 200)
    )
      .withExif({
        IFD0: { Make: "samsung", Model: "SM-G990B2" },
        IFD3: { GPSLatitudeRef: "N", GPSLatitude: "48/1 23/1 36/1" },
      })
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const { metadata } = await read((await normalized(input)).bytes);

    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
  });

  it("scales the long side down to the limit, keeping the aspect ratio", async () => {
    const input = await (await halves(4000, 3000)).toBuffer();

    const { metadata } = await read((await normalized(input)).bytes);

    expect([metadata.width, metadata.height]).toEqual([MAX_PHOTO_SIDE, 1920]);
  });

  it("never scales a small photo up", async () => {
    const input = await (await halves(800, 600)).toBuffer();

    const { metadata } = await read((await normalized(input)).bytes);

    expect([metadata.width, metadata.height]).toEqual([800, 600]);
  });

  it("turns a photo right or left on request", async () => {
    const input = await (await halves(400, 200)).toBuffer();

    const right = await read((await normalized(input, "right")).bytes);
    expect([right.metadata.width, right.metadata.height]).toEqual([200, 400]);
    expect(isRed(right.pixel(100, 50))).toBe(true);

    const left = await read((await normalized(input, "left")).bytes);
    expect([left.metadata.width, left.metadata.height]).toEqual([200, 400]);
    expect(isRed(left.pixel(100, 350))).toBe(true);
  });

  it("applies the EXIF tag BEFORE the requested turn", async () => {
    // A file stored before this pipeline existed still carries its tag; the
    // turn must be relative to what the person saw, not to the raw pixels.
    const input = await (
      await halves(400, 200)
    )
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const { metadata, pixel } = await read(
      (await normalized(input, "right")).bytes,
    );

    // 90° from EXIF + 90° requested = 180°: red is now on the right.
    expect([metadata.width, metadata.height]).toEqual([400, 200]);
    expect(isRed(pixel(350, 100))).toBe(true);
  });

  it("re-encodes a PNG as a JPEG on white", async () => {
    const input = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    const result = await normalized(input);
    const { metadata, pixel } = await read(result.bytes);

    expect(metadata.format).toBe("jpeg");
    expect(pixel(50, 50).every((channel) => channel > 240)).toBe(true);
  });

  it("refuses bytes that are not a JPEG, PNG or WebP, whatever they claim", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
    );
    const gif = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "#fff" },
    })
      .gif()
      .toBuffer();

    for (const input of [svg, gif, Buffer.from("not an image at all")]) {
      expect(await normalizePhoto(new Uint8Array(input))).toEqual({
        ok: false,
        reason: "unsupported_type",
      });
    }
  });

  it("refuses a file that only LOOKS like a JPEG", async () => {
    const input = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a]);

    expect(await normalizePhoto(new Uint8Array(input))).toEqual({
      ok: false,
      reason: "unsupported_type",
    });
  });

  it("refuses a canvas too large to decode safely, before decoding it", async () => {
    // A 68-byte PNG declaring 20000×20000 — 400 MP. Its pixel data is a few
    // zeros; only the size check stands between it and a decoder.
    const chunk = (type: string, data: Buffer) => {
      const length = Buffer.alloc(4);
      length.writeUInt32BE(data.length);
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])));
      return Buffer.concat([length, Buffer.from(type), data, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(20_000, 0);
    ihdr.writeUInt32BE(20_000, 4);
    ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
    const input = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(Buffer.alloc(16))),
      chunk("IEND", Buffer.alloc(0)),
    ]);

    expect(await normalizePhoto(new Uint8Array(input))).toEqual({
      ok: false,
      reason: "too_large",
    });
  });

  it("keeps working after a refusal", async () => {
    // The queue must not wedge on a failed photo.
    await normalizePhoto(new Uint8Array(Buffer.from("garbage")));
    const input = await (await halves(40, 20)).toBuffer();

    expect((await normalizePhoto(new Uint8Array(input))).ok).toBe(true);
  });
});
