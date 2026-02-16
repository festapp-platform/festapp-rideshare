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

  /** Suggested price = 36% of fuel cost (driver shares savings) */
  COST_SHARING_FACTOR: 0.36,
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
 * Calculate suggested ride price from distance.
 *
 * Formula: (distanceKm / 100) * consumption * fuelPrice * sharingFactor
 * Returns suggested, min, and max prices in CZK (whole numbers).
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
    Math.round(fuelCost * PRICING.COST_SHARING_FACTOR),
  );

  return {
    suggested,
    min: Math.max(
      PRICING.MIN_PRICE_CZK,
      Math.round(suggested * PRICING.MIN_PRICE_FACTOR),
    ),
    max: Math.round(suggested * PRICING.MAX_PRICE_FACTOR),
  };
}
