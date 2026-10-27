import { randomToken } from "../ids";
import { putObject, removePrefix } from "../storage";

/**
 * Preview clip pipeline. There is no transcoder on the server, so clips are
 * stored as uploaded after checking the container signature: MP4 (ISO base
 * media with an `ftyp` box) or WebM. The file extension comes from the
 * detected format, never from the uploaded name.
 */
export const VIDEO_LIMITS = {
  maxBytes: 50 * 1024 * 1024,
} as const;

export class VideoValidationError extends Error {}

export type VideoFormat = "mp4" | "webm";

/** QuickTime brands: browsers outside Safari often cannot play these. */
const QUICKTIME_BRANDS = new Set(["qt  "]);

export function detectVideoFormat(data: Buffer): VideoFormat | "quicktime" | null {
  if (data.length >= 12 && data.toString("latin1", 4, 8) === "ftyp") {
    return QUICKTIME_BRANDS.has(data.toString("latin1", 8, 12)) ? "quicktime" : "mp4";
  }
  if (data.length >= 4 && data.readUInt32BE(0) === 0x1a45dfa3) return "webm";
  return null;
}

export function validatePreviewVideo(data: Buffer): VideoFormat {
  if (data.byteLength > VIDEO_LIMITS.maxBytes) throw new VideoValidationError("Videos must be 50 MB or smaller.");
  const format = detectVideoFormat(data);
  if (format === "quicktime") throw new VideoValidationError("QuickTime (.mov) videos do not play in every browser. Export the clip as MP4.");
  if (!format) throw new VideoValidationError("Use an MP4 or WebM video.");
  return format;
}

export async function storePreviewVideo(data: Buffer, productId: string): Promise<string> {
  const format = validatePreviewVideo(data);
  const key = `p/${productId}/video-${randomToken(9)}.${format}`;
  await putObject("media", key, data);
  return key;
}

export async function removePreviewVideo(key: string) {
  await removePrefix("media", key);
}
