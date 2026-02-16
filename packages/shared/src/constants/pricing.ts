/**
 * Czech rideshare pricing constants and price suggestion function.
 *
 * The same formula is used both client-side (for instant preview)
 * and in the compute-route Edge Function (for server-side calculation).
 *
 * Values based on Czech fuel costs as of late 2025.
 */

export const PRICING = {
  /** Average Czech fuel price in CZK per liter */
  FUEL_PRICE_CZK_PER_LITER: 35,
  /** Average car fuel consumption in liters per 100km */
  AVG_CONSUMPTION_L_PER_100KM: 7,

  /** Suggested price = ~33% of fuel cost (yields ~0.80 CZK/km) */
  COST_SHARING_FACTOR: 0.327,
  /** Minimum price = 50% of suggested */
  MIN_PRICE_FACTOR: 0.5,
  /** Maximum price = 200% of suggested */
  MAX_PRICE_FACTOR: 2.0,
  /** Absolute minimum price in CZK */
  MIN_PRICE_CZK: 20,

  /** Currency code */
  CURRENCY: 'CZK',
  /** Currency symbol */
  CURRENCY_SYMBOL: 'Kc',
} as const;

/**
 * Smart rounding for user-friendly prices.
 * Rounds to nearest 10 CZK for prices <= 200, nearest 50 CZK for prices > 200.
 */
export function roundPrice(price: number): number {
  if (price > 200) return Math.round(price / 50) * 50;
  return Math.round(price / 10) * 10;
}

/**
 * Calculate suggested ride price from distance.
 *
 * Formula: (distanceKm / 100) * consumption * fuelPrice * sharingFactor
 * Returns suggested, min, and max prices in CZK with smart rounding.
 */
export function calculateSuggestedPrice(distanceMeters: number): {
  suggested: number;
  min: number;
  max: number;
} {
  const distanceKm = distanceMeters / 1000;
  const fuelCost =
    (distanceKm / 100) *
    PRICING.AVG_CONSUMPTION_L_PER_100KM *
    PRICING.FUEL_PRICE_CZK_PER_LITER;
  const suggested = Math.max(
    PRICING.MIN_PRICE_CZK,
    roundPrice(fuelCost * PRICING.COST_SHARING_FACTOR),
  );

  return {
    suggested,
    min: Math.max(
      PRICING.MIN_PRICE_CZK,
      roundPrice(suggested * PRICING.MIN_PRICE_FACTOR),
    ),
    max: roundPrice(suggested * PRICING.MAX_PRICE_FACTOR),
  };
}
