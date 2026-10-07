/** Formats minor units in the store currency. Shared by server and client. */
export function formatPrice(cents: number, currency: string, opts: { freeLabel?: string } = {}): string {
  if (cents === 0) return opts.freeLabel ?? "Free";
  const fractionDigits = cents % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function parsePriceInput(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number.parseFloat(trimmed) * 100);
}
