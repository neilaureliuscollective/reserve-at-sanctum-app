import sharp from "sharp";
import { BookingError } from "./booking-error";
export async function prepareBrandImage(encoded: string) {
  if (encoded.length > 700000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
    throw new BookingError("Use a PNG, JPEG or WebP image under 500 KB.");
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length > 500000)
    throw new BookingError("Choose an image under 500 KB.");
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP";
  if (!png && !jpg && !webp)
    throw new BookingError("Use a still PNG, JPEG or WebP image.");
  try {
    const image = sharp(bytes, {
      limitInputPixels: 4000000,
      failOn: "warning",
    });
    const m = await image.metadata();
    if (
      !["png", "jpeg", "webp"].includes(m.format || "") ||
      (m.pages || 1) !== 1
    )
      throw Error("Unsupported image");
    const normalized = await image
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    if (normalized.length > 500000) throw Error("Image too large");
    const icon = async (size: number) =>
      sharp(normalized)
        .resize(size, size, {
          fit: "contain",
          background: { r: 7, g: 11, b: 16, alpha: 1 },
        })
        .png()
        .toBuffer();
    const [icon180, icon192, icon512] = await Promise.all([
      icon(180),
      icon(192),
      icon(512),
    ]);
    return { image: normalized, icon180, icon192, icon512 };
  } catch {
    throw new BookingError(
      "Use a still PNG, JPEG or WebP under 500 KB and four million pixels.",
    );
  }
}
