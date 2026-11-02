import sharp from "sharp";

// A page of printed Ukrainian text, upright, as a JPEG — what the orientation
// specs read instead of a real upload, which would be a photograph of a
// child's document. Rendered by libvips' own Pango, so it needs a system font
// (any sans; CI's Ubuntu has DejaVu).
export async function documentPage(): Promise<Buffer> {
  const lines = Array.from(
    { length: 14 },
    (_, i) =>
      `Рядок ${i + 1}: довідка про взяття на облік внутрішньо переміщеної особи`,
  ).join("\n");
  const text = await sharp({
    text: { text: lines, font: "sans", dpi: 280, width: 1800 },
  })
    // Rendered as white on black; a page is black on white.
    .negate({ alpha: false })
    .png()
    .toBuffer();
  return sharp({
    create: { width: 2000, height: 1500, channels: 3, background: "#ffffff" },
  })
    .composite([{ input: text, left: 100, top: 100 }])
    .jpeg({ quality: 85 })
    .toBuffer();
}
