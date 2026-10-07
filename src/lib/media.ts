export type MediaRef = {
  key: string;
  widths: number[];
  width: number;
  height: number;
  alt: string;
};

export function mediaUrl(key: string, width: number): string {
  return `/media/${key}-${width}.webp`;
}

export function mediaSrcSet(media: MediaRef): string {
  return media.widths.map((w) => `${mediaUrl(media.key, w)} ${w}w`).join(", ");
}

export function mediaFallback(media: MediaRef): string {
  const widths = [...media.widths].sort((a, b) => a - b);
  return mediaUrl(media.key, widths[Math.min(1, widths.length - 1)] ?? widths[0]);
}

export function ogImageUrl(key: string): string {
  return `/media/${key}-og.jpg`;
}
