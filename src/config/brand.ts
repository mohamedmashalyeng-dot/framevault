/**
 * Central brand configuration. FRAMEVAULT is a temporary name: set
 * NEXT_PUBLIC_BRAND_NAME (and friends) to rename the store everywhere,
 * including page titles, emails, and share images.
 */
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "FRAMEVAULT",
  tagline: "Templates, sections and AI prompts for builders who ship.",
  description:
    "Preview production-ready website templates, UI components, sections and backgrounds. Buy once, copy the prompt, download the source.",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@framevault.local",
} as const;
