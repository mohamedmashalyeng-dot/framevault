import { Sparkle } from "./icons";

/** Marks paid products on cards and in the quick view. */
export function PremiumBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-warning px-2.5 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-graphite-950 ${className}`}
    >
      <Sparkle size={11} />
      Premium
    </span>
  );
}
