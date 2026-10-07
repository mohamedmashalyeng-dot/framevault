import { mediaFallback, mediaSrcSet, type MediaRef } from "@/lib/media";

/**
 * Responsive preview image from pre-generated WebP renditions. Width and
 * height attributes reserve space so nothing shifts while it loads.
 */
export function MediaImage({
  media,
  sizes,
  className,
  priority = false,
  alt,
}: {
  media: MediaRef;
  sizes: string;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- renditions are generated and served by /media
    <img
      src={mediaFallback(media)}
      srcSet={mediaSrcSet(media)}
      sizes={sizes}
      width={media.width}
      height={media.height}
      alt={alt ?? media.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
    />
  );
}

export function PosterPlaceholder({ title, className = "" }: { title: string; className?: string }) {
  return (
    <div
      className={`flex aspect-[16/10] items-center justify-center bg-graphite-850 font-mono text-xs text-subtle ${className}`}
      role="img"
      aria-label={`${title} (no preview image yet)`}
    >
      No preview yet
    </div>
  );
}
