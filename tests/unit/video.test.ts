import { describe, expect, it } from "vitest";
import { parseByteRange } from "@/lib/byte-range";
import { detectVideoFormat, validatePreviewVideo, VIDEO_LIMITS, VideoValidationError } from "@/server/ingest/video";

const ftyp = (brand: string) => Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from(`ftyp${brand}`, "latin1"), Buffer.alloc(16)]);

describe("preview video validation", () => {
  it("recognises MP4 and WebM by their signatures", () => {
    expect(detectVideoFormat(ftyp("isom"))).toBe("mp4");
    expect(detectVideoFormat(ftyp("mp42"))).toBe("mp4");
    expect(detectVideoFormat(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00]))).toBe("webm");
    expect(detectVideoFormat(ftyp("qt  "))).toBe("quicktime");
    expect(detectVideoFormat(Buffer.from("<html>not a video</html>"))).toBeNull();
  });

  it("rejects other files, QuickTime and oversized clips", () => {
    expect(validatePreviewVideo(ftyp("isom"))).toBe("mp4");
    expect(() => validatePreviewVideo(Buffer.from("GIF89a"))).toThrow(VideoValidationError);
    expect(() => validatePreviewVideo(ftyp("qt  "))).toThrow(/Export the clip as MP4/);
    const huge = Buffer.concat([ftyp("isom"), Buffer.alloc(VIDEO_LIMITS.maxBytes)]);
    expect(() => validatePreviewVideo(huge)).toThrow(/50 MB/);
  });
});

describe("byte ranges", () => {
  it("serves the whole file without a usable Range header", () => {
    expect(parseByteRange(null, 100)).toBeNull();
    expect(parseByteRange("bytes=-", 100)).toBeNull();
    expect(parseByteRange("bytes=0-1,5-9", 100)).toBeNull();
    expect(parseByteRange("items=0-1", 100)).toBeNull();
  });

  it("parses open, closed and suffix ranges", () => {
    expect(parseByteRange("bytes=0-", 100)).toEqual({ start: 0, end: 99 });
    expect(parseByteRange("bytes=10-19", 100)).toEqual({ start: 10, end: 19 });
    expect(parseByteRange("bytes=90-500", 100)).toEqual({ start: 90, end: 99 });
    expect(parseByteRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
    expect(parseByteRange("bytes=-500", 100)).toEqual({ start: 0, end: 99 });
  });

  it("flags ranges outside the file", () => {
    expect(parseByteRange("bytes=100-", 100)).toBe("unsatisfiable");
    expect(parseByteRange("bytes=20-10", 100)).toBe("unsatisfiable");
    expect(parseByteRange("bytes=-0", 100)).toBe("unsatisfiable");
  });
});
