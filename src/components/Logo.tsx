import Link from "next/link";
import { BRAND } from "@/config/brand";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`} aria-label={`${BRAND.name} home`}>
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <rect x="2.5" y="2.5" width="19" height="19" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <rect x="7" y="7" width="10" height="10" rx="1.5" fill="var(--color-mint)" />
      </svg>
      <span className="text-[0.95rem] font-semibold tracking-[0.12em]">{BRAND.name}</span>
    </Link>
  );
}
