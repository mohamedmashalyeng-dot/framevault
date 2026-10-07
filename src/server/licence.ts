import { BRAND } from "@/config/brand";

/**
 * Licence texts shipped inside every source archive, and the default
 * one-paragraph summaries shown on product pages. Administrators can edit a
 * product's summary; the full text below is what governs use.
 */
export type LicenceType = "free" | "standard";

export const DEFAULT_LICENCE_SUMMARY: Record<LicenceType, string> = {
  standard:
    "Use it in unlimited personal and commercial projects for yourself or your clients. You may not resell, share or redistribute the source files or prompt themselves, alone or as part of a template, theme or UI kit.",
  free:
    "Free to use in personal and commercial projects, with no attribution required. You may not resell or redistribute the source files or prompt as they are, or offer them as a template, theme or UI kit.",
};

export function licenceText(input: { productTitle: string; version: string; licenceType: LicenceType }): string {
  const name = BRAND.name;
  const kind = input.licenceType === "free" ? "Free Licence" : "Standard Licence";
  return [
    `${name} ${kind}`,
    `Product: ${input.productTitle} (version ${input.version})`,
    "",
    "1. Grant",
    input.licenceType === "free"
      ? `   ${name} grants you a free, non-exclusive, worldwide, perpetual licence to use, copy and modify this product.`
      : `   On payment, ${name} grants the purchasing account holder a non-exclusive, worldwide, perpetual licence to use, copy and modify this product.`,
    "",
    "2. You may",
    "   - Use the product in an unlimited number of personal and commercial projects.",
    "   - Use it in work you build for clients, and transfer that finished work to them.",
    "   - Modify, adapt and combine it with other work.",
    "",
    "3. You may not",
    "   - Sell, sublicense, share or redistribute the source files or prompt themselves, modified or not.",
    "   - Include them in a template, theme, UI kit, component library or prompt collection offered to others.",
    "   - Claim the original design or code as your own work for resale.",
    "",
    "4. Third-party software",
    "   Open-source dependencies listed in package.json are licensed separately by their authors under their own terms.",
    "",
    "5. No warranty",
    '   The product is provided "as is", without warranty of any kind. In no event shall the authors be liable for any',
    "   claim, damages or other liability arising from its use.",
    "",
    `Questions: ${BRAND.supportEmail}`,
    "",
  ].join("\n");
}
