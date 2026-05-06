/**
 * Booking timer + prorated billing helpers.
 *
 * All pricing math lives here so the customer view, partner view, and the
 * post-completion summary always agree on numbers.
 */

/**
 * Parse a human-readable duration string (e.g. "4 hrs", "45 min", "1h 30m")
 * into total minutes. Falls back to a sensible default when the format is
 * unknown — defaulting to 60 minutes is a safer demo behaviour than 0.
 */
export function parseDurationToMinutes(raw: string | null | undefined, fallback = 60): number {
  if (!raw) return fallback;
  const s = raw.toLowerCase();
  let total = 0;
  let matched = false;
  // hours
  const hr = s.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/);
  if (hr) {
    total += Math.round(parseFloat(hr[1]) * 60);
    matched = true;
  }
  // minutes
  const mn = s.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/);
  if (mn) {
    total += parseInt(mn[1], 10);
    matched = true;
  }
  if (matched) return Math.max(1, total);
  // bare number → minutes
  const bare = s.match(/^\s*(\d+)\s*$/);
  if (bare) return Math.max(1, parseInt(bare[1], 10));
  return fallback;
}

export function formatMinutes(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} hr${h === 1 ? "" : "s"}` : `${h} hr ${r} min`;
}

/**
 * Per-minute rate for a service. Used by:
 *  - Prorated early-completion billing      → rate * elapsed_minutes
 *  - Extension cost (charged at 2× rate)    → rate * 2 * extension_minutes
 */
export function perMinuteRate(price: number, totalMinutes: number): number {
  if (totalMinutes <= 0) return 0;
  return price / totalMinutes;
}

/**
 * Cost the customer pays for an extension. Uses 2× the base per-minute rate.
 */
export function extensionCost(price: number, totalMinutes: number, extensionMinutes: number): number {
  if (extensionMinutes <= 0) return 0;
  const cost = perMinuteRate(price, totalMinutes) * 2 * extensionMinutes;
  return Math.round(cost);
}

/**
 * Final billed amount given actual elapsed minutes + any accepted extensions.
 *
 *   base portion = price                                if elapsed >= planned
 *                = rate * elapsed                       otherwise (prorated early)
 *   ext portion  = sum of extensionCost(...) for accepted extensions
 *
 * The final amount is capped: the base portion can never exceed the original
 * service price even if elapsed > planned (that overflow is the extension).
 */
export function finalBilledAmount(args: {
  price: number;
  plannedMinutes: number;
  elapsedMinutes: number;
  extensionMinutes: number;
}): {
  basePortion: number;
  extensionPortion: number;
  total: number;
} {
  const { price, plannedMinutes, elapsedMinutes, extensionMinutes } = args;
  const minutesBilledAtBase = Math.min(Math.max(0, elapsedMinutes), plannedMinutes);
  const ratio = plannedMinutes > 0 ? minutesBilledAtBase / plannedMinutes : 0;
  const rawBase = price * ratio;
  // Cap base portion at the original price. Round to nearest rupee.
  const basePortion = Math.min(price, Math.round(rawBase));
  const extensionPortion = extensionCost(price, plannedMinutes, extensionMinutes);
  return {
    basePortion,
    extensionPortion,
    total: basePortion + extensionPortion,
  };
}

export const EXTENSION_OPTIONS_MIN = [30, 60, 90, 120, 150, 180] as const;
export type ExtensionOption = (typeof EXTENSION_OPTIONS_MIN)[number];
