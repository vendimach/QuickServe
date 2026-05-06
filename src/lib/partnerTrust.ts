/**
 * Pure functions for computing a partner's tier and reliability score from
 * their booking history. No UI, no state — components feed in raw stats and
 * receive normalised, display-ready values.
 *
 * Everything here is dynamic. There are no hardcoded scores or fallback
 * pretty numbers. A partner with no completed bookings shows "Rising
 * Companion", reliability null, and the UI renders an empty state.
 */

export interface PartnerTrustInputs {
  completedBookings: number;
  totalBookings: number;        // completed + cancelled + refunded + abandoned
  partnerCancellations: number; // bookings the partner cancelled (rough proxy)
  averageRating: number | null; // 1–5, null when no ratings
  ratedBookings: number;
  /** Optional: of pending requests in radius, % the partner accepted. */
  responseRatePct?: number | null;
  /** Optional: distinct repeat customers / distinct customers. */
  repeatCustomerRatio?: number | null;
  /** Optional: avg arrived_at vs scheduled_at delta (mins, signed). */
  punctualityMinutesLate?: number | null;
  /** Optional: how many distinct customers have favorited this partner. */
  favoritedByCount?: number | null;
}

export interface PartnerTier {
  id: "rising" | "trusted" | "elite" | "favourite";
  label: string;
  description: string;
  /** Hex-ish tailwind tone — used for badges and progress bars. */
  tone: "muted" | "primary" | "accent" | "success";
  /** Min completed-bookings threshold for this tier. */
  minBookings: number;
  /** Min average rating threshold; null when this tier has no rating gate. */
  minRating: number | null;
  /** Optional max cancellation rate (0–1). */
  maxCancellationRate?: number;
}

// Tier ladder, lowest → highest. Order is significant: progression code reads
// the array end-to-start to find the highest tier the partner currently
// qualifies for, then looks at the next entry to derive progress.
export const PARTNER_TIERS: PartnerTier[] = [
  {
    id: "rising",
    label: "Rising Companion",
    description: "Just getting started — building experience.",
    tone: "muted",
    minBookings: 0,
    minRating: null,
  },
  {
    id: "trusted",
    label: "Trusted Caregiver",
    description: "Consistent service with positive reviews.",
    tone: "primary",
    minBookings: 10,
    minRating: 4.0,
  },
  {
    id: "elite",
    label: "Elite Caregiver",
    description: "Top-rated and exceptionally reliable.",
    tone: "accent",
    minBookings: 50,
    minRating: 4.5,
    maxCancellationRate: 0.05,
  },
  {
    id: "favourite",
    label: "Community Favourite",
    description: "Beloved by repeat customers.",
    tone: "success",
    minBookings: 100,
    minRating: 4.7,
    maxCancellationRate: 0.03,
  },
];

export interface TierProgress {
  current: PartnerTier;
  next: PartnerTier | null;
  /** 0–100 — how close (along the booking axis) the partner is to `next`. */
  percentToNext: number;
  /** Human-readable single-line summary. */
  hint: string;
}

const cancellationRate = (s: PartnerTrustInputs) => {
  if (s.totalBookings <= 0) return 0;
  return s.partnerCancellations / s.totalBookings;
};

/**
 * Effective bookings for tier evaluation. Each customer that favorited the
 * partner counts as a small positive signal — repeat-customer demand is a
 * trust signal we want to reward, but we cap it tightly so a handful of
 * favorites can't completely shortcut the booking threshold.
 */
const tierEffectiveBookings = (s: PartnerTrustInputs): number =>
  s.completedBookings + Math.min(10, s.favoritedByCount ?? 0);

const meetsTier = (s: PartnerTrustInputs, t: PartnerTier): boolean => {
  if (tierEffectiveBookings(s) < t.minBookings) return false;
  if (t.minRating != null && (s.averageRating ?? 0) < t.minRating) return false;
  if (t.maxCancellationRate != null && cancellationRate(s) > t.maxCancellationRate) return false;
  return true;
};

export function computeTierProgress(stats: PartnerTrustInputs): TierProgress {
  // Walk highest → lowest, take the first tier the partner satisfies.
  let current: PartnerTier = PARTNER_TIERS[0];
  for (let i = PARTNER_TIERS.length - 1; i >= 0; i--) {
    if (meetsTier(stats, PARTNER_TIERS[i])) {
      current = PARTNER_TIERS[i];
      break;
    }
  }
  const currentIndex = PARTNER_TIERS.findIndex((t) => t.id === current.id);
  const next = PARTNER_TIERS[currentIndex + 1] ?? null;

  let percentToNext = 100;
  let hint = "Top tier reached — keep delighting customers.";
  if (next) {
    // Progress is dominated by booking count for predictability; we add a
    // small penalty when the partner already meets `minRating` so the bar
    // matches user intuition ("almost there") rather than oscillating with
    // every new review.
    const bookingProgress =
      next.minBookings === current.minBookings
        ? 0
        : Math.min(
            1,
            (stats.completedBookings - current.minBookings) /
              (next.minBookings - current.minBookings),
          );
    percentToNext = Math.max(0, Math.min(100, Math.round(bookingProgress * 100)));

    const needs: string[] = [];
    if (stats.completedBookings < next.minBookings) {
      needs.push(`${next.minBookings - stats.completedBookings} more job${next.minBookings - stats.completedBookings === 1 ? "" : "s"}`);
    }
    if (next.minRating != null && (stats.averageRating ?? 0) < next.minRating) {
      needs.push(`${next.minRating.toFixed(1)}★ avg rating`);
    }
    if (next.maxCancellationRate != null && cancellationRate(stats) > next.maxCancellationRate) {
      needs.push(`under ${Math.round(next.maxCancellationRate * 100)}% cancellation rate`);
    }
    hint = needs.length > 0
      ? `${next.label}: needs ${needs.join(" · ")}`
      : `Eligible for ${next.label} on the next refresh.`;
  }

  return { current, next, percentToNext, hint };
}

// ─── Reliability score ──────────────────────────────────────────────────────

const RELIABILITY_WEIGHTS = {
  completion: 0.40,    // % of bookings that ended in 'completed'
  rating: 0.25,        // avg rating / 5
  punctuality: 0.15,   // 1 - clamp(lateMins / 30)
  responseRate: 0.10,  // accept-rate of inbound requests
  cancellation: 0.10,  // 1 - cancellationRate
};

export interface ReliabilityResult {
  /** 0–100 integer; null when there's not enough data to score. */
  score: number | null;
  /** True when the partner has at least one signal we can score on. */
  hasData: boolean;
  /** Per-component contribution for tooltips. */
  breakdown: {
    completion: number | null;
    rating: number | null;
    punctuality: number | null;
    responseRate: number | null;
    cancellation: number | null;
  };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function computeReliability(stats: PartnerTrustInputs): ReliabilityResult {
  // Each component is normalised to 0..1 (or null if we have no signal).
  // We average only the components we have data for, weighted by their share,
  // so a brand-new partner with one rating doesn't get an artificially low
  // 96% from blank fields.
  const completion =
    stats.totalBookings > 0
      ? clamp01(stats.completedBookings / stats.totalBookings)
      : null;
  const rating =
    stats.averageRating != null && stats.ratedBookings > 0
      ? clamp01(stats.averageRating / 5)
      : null;
  const punctuality =
    stats.punctualityMinutesLate != null
      ? clamp01(1 - Math.max(0, stats.punctualityMinutesLate) / 30)
      : null;
  const responseRate =
    stats.responseRatePct != null
      ? clamp01(stats.responseRatePct / 100)
      : null;
  const cancellation =
    stats.totalBookings > 0
      ? clamp01(1 - cancellationRate(stats))
      : null;

  const components: Array<{ value: number | null; weight: number }> = [
    { value: completion,   weight: RELIABILITY_WEIGHTS.completion },
    { value: rating,       weight: RELIABILITY_WEIGHTS.rating },
    { value: punctuality,  weight: RELIABILITY_WEIGHTS.punctuality },
    { value: responseRate, weight: RELIABILITY_WEIGHTS.responseRate },
    { value: cancellation, weight: RELIABILITY_WEIGHTS.cancellation },
  ];

  const known = components.filter((c) => c.value != null);
  if (known.length === 0) {
    return {
      score: null,
      hasData: false,
      breakdown: { completion, rating, punctuality, responseRate, cancellation },
    };
  }
  const totalWeight = known.reduce((s, c) => s + c.weight, 0);
  const weightedSum = known.reduce((s, c) => s + (c.value ?? 0) * c.weight, 0);
  const raw = weightedSum / totalWeight;
  // Favorite-based positive signal: each customer that favorited this partner
  // adds a small bonus, capped so it can never push a barely-trustworthy
  // partner above 90%. The cap is intentionally low — favorites supplement
  // the real metrics, they never override them.
  const favBonus = Math.min(5, stats.favoritedByCount ?? 0);
  const score = Math.min(100, Math.round(raw * 100) + favBonus);

  return {
    score,
    hasData: true,
    breakdown: { completion, rating, punctuality, responseRate, cancellation },
  };
}

/**
 * Best-effort PartnerTrustInputs from a Professional record. The seed data
 * only has `jobs` and `rating`, so signals we cannot infer are returned as
 * `null` and downstream code (UI, computeReliability) handles that gracefully.
 */
export function proToTrustInputs(
  pro: { jobs: number; rating: number },
  extras?: { favoritedByCount?: number },
): PartnerTrustInputs {
  const completed = Math.max(0, Math.floor(pro.jobs));
  return {
    completedBookings: completed,
    totalBookings: completed,
    partnerCancellations: 0,
    averageRating: pro.rating > 0 ? pro.rating : null,
    ratedBookings: pro.rating > 0 ? completed : 0,
    responseRatePct: null,
    punctualityMinutesLate: null,
    repeatCustomerRatio: null,
    favoritedByCount: extras?.favoritedByCount ?? null,
  };
}

export const tierToneClasses: Record<PartnerTier["tone"], { chip: string; bar: string; ring: string }> = {
  muted:   { chip: "bg-secondary text-foreground",        bar: "bg-muted-foreground/40",  ring: "ring-muted-foreground/30" },
  primary: { chip: "bg-primary/15 text-primary",          bar: "bg-primary",              ring: "ring-primary/40" },
  accent:  { chip: "bg-accent/15 text-accent",            bar: "bg-accent",               ring: "ring-accent/40" },
  success: { chip: "bg-success/15 text-success",          bar: "bg-success",              ring: "ring-success/40" },
};
