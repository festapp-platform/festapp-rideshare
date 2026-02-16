/**
 * Format a price amount as a locale-aware CZK currency string.
 *
 * Uses Intl.NumberFormat with zero fraction digits (CZK has no practical subunits).
 * Returns "Zdarma" (free) for zero/null/undefined amounts by default.
 */
export function formatPrice(
  amount: number | null | undefined,
  options?: { locale?: string; free?: string },
): string {
  if (amount == null || amount === 0) {
    return options?.free ?? 'Zdarma';
  }
  const locale = options?.locale ?? 'cs';
  const bcp47 = locale === 'en' ? 'en-CZ' : `${locale}-CZ`;
  return new Intl.NumberFormat(bcp47, {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}
