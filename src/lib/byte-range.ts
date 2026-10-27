/**
 * Parses a single-range `Range: bytes=…` header against a file size.
 * Returns null when the header is absent or not a single byte range (serve
 * the whole file), or "unsatisfiable" when the range lies outside the file.
 */
export function parseByteRange(header: string | null, size: number): { start: number; end: number } | "unsatisfiable" | null {
  const match = header?.trim().match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (match[1] === "" && match[2] === "")) return null;
  let start: number;
  let end: number;
  if (match[1] === "") {
    // Suffix range: the last N bytes.
    const suffix = Number(match[2]);
    if (suffix === 0) return "unsatisfiable";
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (start >= size || start > end) return "unsatisfiable";
  return { start, end };
}
