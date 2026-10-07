import sharp, { type Metadata } from "sharp";
import { randomToken } from "../ids";
import { putObject, removePrefix } from "../storage";

/**
 * Preview image pipeline. Uploaded images are decoded, re-encoded and resized
 * by sharp; the original bytes are never stored or served, which also strips
 * metadata and anything smuggled inside the file.
 */
export const IMAGE_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  maxPixels: 40_000_000,
  minWidth: { poster: 1200, screenshot: 600 },
  formats: ["jpeg", "png", "webp", "avif"] as const,
} as const;

export const POSTER_ASPECT = 16 / 10;
const RENDITION_WIDTHS = [480, 960, 1440, 1920];

export class ImageValidationError extends Error {}

export type StoredImage = { key: string; widths: number[]; width: number; height: number };

export async function storePreviewImage(
  input: Buffer,
  opts: { productId: string; kind: "poster" | "screenshot" },
): Promise<StoredImage> {
  if (input.byteLength > IMAGE_LIMITS.maxBytes) throw new ImageValidationError("Images must be 10 MB or smaller.");

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: IMAGE_LIMITS.maxPixels }).metadata();
  } catch {
    throw new ImageValidationError("The file is not a readable image.");
  }
  if (!meta.format || !(IMAGE_LIMITS.formats as readonly string[]).includes(meta.format)) {
    throw new ImageValidationError("Use a JPEG, PNG, WebP or AVIF image.");
  }
  if (!meta.width || !meta.height) throw new ImageValidationError("The image has no dimensions.");
  const minWidth = IMAGE_LIMITS.minWidth[opts.kind];
  if (meta.width < minWidth) {
    throw new ImageValidationError(`${opts.kind === "poster" ? "Posters" : "Screenshots"} must be at least ${minWidth}px wide.`);
  }

  // Posters are cropped to one aspect ratio so every card lines up.
  let width = meta.width;
  let height = meta.height;
  let base = sharp(input, { limitInputPixels: IMAGE_LIMITS.maxPixels }).rotate();
  if (opts.kind === "poster") {
    width = Math.min(meta.width, 1920);
    height = Math.round(width / POSTER_ASPECT);
    base = base.resize({ width, height, fit: "cover", position: "top" });
  } else if (meta.width > 1920) {
    height = Math.round((meta.height * 1920) / meta.width);
    width = 1920;
    base = base.resize({ width });
  }
  const normalised = await base.png().toBuffer();

  const key = `p/${opts.productId}/${opts.kind}-${randomToken(9)}`;
  const widths = RENDITION_WIDTHS.filter((w) => w < width).concat(width).filter((w, i, a) => a.indexOf(w) === i);

  for (const w of widths) {
    const data = await sharp(normalised).resize({ width: w }).webp({ quality: 80, effort: 5 }).toBuffer();
    await putObject("media", `${key}-${w}.webp`, data);
  }
  // Share image (Open Graph): 1200x630 JPEG.
  const og = await sharp(normalised)
    .resize({ width: 1200, height: 630, fit: "cover", position: "top" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  await putObject("media", `${key}-og.jpg`, og);

  return { key, widths, width, height };
}

export async function removePreviewImage(key: string, widths: number[]) {
  for (const w of widths) await removePrefix("media", `${key}-${w}.webp`);
  await removePrefix("media", `${key}-og.jpg`);
}
