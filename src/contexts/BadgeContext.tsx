import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import type { PartnerTrustInputs } from "@/lib/partnerTrust";

/**
 * Admin-managed badge ecosystem.
 *
 * No DB tables exist for this yet, so persistence is localStorage. The shape
 * is designed so a future migration can lift it to Supabase verbatim.
 *
 * Two assignment modes:
 *   - `manual`: admin explicitly assigns the badge to specific partner IDs.
 *   - `criteria`: assignment is computed from `PartnerTrustInputs` using the
 *     simple comparator-based rule set below. Partners who meet the criteria
 *     receive the badge automatically.
 */

export type BadgeMetric =
  | "completed_bookings"
  | "average_rating"
  | "rated_bookings"
  | "response_rate"
  | "punctuality"
  | "repeat_ratio"
  | "verified_aadhaar";

export interface BadgeCriterion {
  metric: BadgeMetric;
  /** Always >=. Use a negative threshold for max-style rules. */
  threshold: number;
}

export interface BadgeDefinition {
  id: string;
  /** Single emoji glyph kept short — rendered next to the label. */
  icon: string;
  label: string;
  description: string;
  /** Tone for the chip background (one of our standard palette names). */
  tone: "primary" | "accent" | "success" | "warning" | "muted";
  mode: "manual" | "criteria";
  criteria: BadgeCriterion[];
  /** ISO timestamps for admin auditing. */
  createdAt: string;
  updatedAt: string;
}

interface BadgeAssignments {
  /** badgeId -> array of partner user-ids (manual mode only). */
  [badgeId: string]: string[];
}

interface BadgeContextValue {
  badges: BadgeDefinition[];
  /** Get every badge a partner currently qualifies for (manual + criteria). */
  badgesForPartner: (partnerId: string, stats?: PartnerTrustInputs | null, profileFlags?: { aadhaarVerified?: boolean }) => BadgeDefinition[];
  /** Distinct partner IDs explicitly assigned a badge in manual mode. */
  partnersWithBadge: (badgeId: string) => string[];

  // admin actions
  createBadge: (def: Omit<BadgeDefinition, "id" | "createdAt" | "updatedAt">) => BadgeDefinition;
  updateBadge: (id: string, patch: Partial<Omit<BadgeDefinition, "id" | "createdAt">>) => void;
  deleteBadge: (id: string) => void;
  assignBadge: (badgeId: string, partnerId: string) => void;
  unassignBadge: (badgeId: string, partnerId: string) => void;
}

const BadgeContext = createContext<BadgeContextValue | null>(null);

const BADGES_KEY = "qs.badges.v1";
const ASSIGN_KEY = "qs.badge_assignments.v1";

const DEFAULT_BADGES: BadgeDefinition[] = [
  {
    id: "verified",
    icon: "🛡️",
    label: "Fully Verified",
    description: "Government ID and phone number verified.",
    tone: "success",
    mode: "criteria",
    criteria: [{ metric: "verified_aadhaar", threshold: 1 }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "milestone-50",
    icon: "⭐",
    label: "50 Services Completed",
    description: "Reached 50 completed bookings.",
    tone: "primary",
    mode: "criteria",
    criteria: [{ metric: "completed_bookings", threshold: 50 }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fast-responder",
    icon: "⚡",
    label: "Fast Responder",
    description: "Accepts the majority of incoming requests quickly.",
    tone: "warning",
    mode: "criteria",
    criteria: [{ metric: "response_rate", threshold: 80 }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "family-favorite",
    icon: "❤️",
    label: "Family Favorite",
    description: "High repeat-customer ratio.",
    tone: "accent",
    mode: "criteria",
    criteria: [{ metric: "repeat_ratio", threshold: 0.3 }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "child-care",
    icon: "👶",
    label: "Child Care Specialist",
    description: "Curated for childcare bookings — assigned by admin.",
    tone: "primary",
    mode: "manual",
    criteria: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "senior-care",
    icon: "👴",
    label: "Senior Care Specialist",
    description: "Curated for senior-care bookings — assigned by admin.",
    tone: "muted",
    mode: "manual",
    criteria: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "night-shift",
    icon: "🌙",
    label: "Night Shift Expert",
    description: "Approved for overnight assignments — assigned by admin.",
    tone: "accent",
    mode: "manual",
    criteria: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota/security */
  }
};

const meetsCriterion = (
  c: BadgeCriterion,
  stats: PartnerTrustInputs | null,
  flags: { aadhaarVerified?: boolean },
): boolean => {
  if (c.metric === "verified_aadhaar") {
    return !!flags.aadhaarVerified && c.threshold >= 1;
  }
  if (!stats) return false;
  switch (c.metric) {
    case "completed_bookings":
      return stats.completedBookings >= c.threshold;
    case "average_rating":
      return (stats.averageRating ?? 0) >= c.threshold;
    case "rated_bookings":
      return stats.ratedBookings >= c.threshold;
    case "response_rate":
      return (stats.responseRatePct ?? 0) >= c.threshold;
    case "punctuality":
      // threshold is "max minutes late". 0 = always on time.
      return (stats.punctualityMinutesLate ?? Infinity) <= c.threshold;
    case "repeat_ratio":
      return (stats.repeatCustomerRatio ?? 0) >= c.threshold;
    default:
      return false;
  }
};

export const BadgeProvider = ({ children }: { children: ReactNode }) => {
  const [badges, setBadges] = useState<BadgeDefinition[]>(() => {
    const stored = readJSON<BadgeDefinition[] | null>(BADGES_KEY, null);
    return stored && stored.length > 0 ? stored : DEFAULT_BADGES;
  });
  const [assignments, setAssignments] = useState<BadgeAssignments>(() =>
    readJSON<BadgeAssignments>(ASSIGN_KEY, {}),
  );

  useEffect(() => writeJSON(BADGES_KEY, badges), [badges]);
  useEffect(() => writeJSON(ASSIGN_KEY, assignments), [assignments]);

  const createBadge: BadgeContextValue["createBadge"] = useCallback((def) => {
    const now = new Date().toISOString();
    const id = `badge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const next: BadgeDefinition = { ...def, id, createdAt: now, updatedAt: now };
    setBadges((prev) => [next, ...prev]);
    return next;
  }, []);

  const updateBadge: BadgeContextValue["updateBadge"] = useCallback((id, patch) => {
    setBadges((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, ...patch, updatedAt: new Date().toISOString() } : b,
      ),
    );
  }, []);

  const deleteBadge: BadgeContextValue["deleteBadge"] = useCallback((id) => {
    setBadges((prev) => prev.filter((b) => b.id !== id));
    setAssignments((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const assignBadge: BadgeContextValue["assignBadge"] = useCallback((badgeId, partnerId) => {
    setAssignments((prev) => {
      const list = prev[badgeId] ?? [];
      if (list.includes(partnerId)) return prev;
      return { ...prev, [badgeId]: [...list, partnerId] };
    });
  }, []);

  const unassignBadge: BadgeContextValue["unassignBadge"] = useCallback((badgeId, partnerId) => {
    setAssignments((prev) => {
      const list = prev[badgeId] ?? [];
      if (!list.includes(partnerId)) return prev;
      return { ...prev, [badgeId]: list.filter((id) => id !== partnerId) };
    });
  }, []);

  const partnersWithBadge: BadgeContextValue["partnersWithBadge"] = useCallback(
    (badgeId) => assignments[badgeId] ?? [],
    [assignments],
  );

  const badgesForPartner: BadgeContextValue["badgesForPartner"] = useCallback(
    (partnerId, stats, profileFlags) => {
      const flags = profileFlags ?? {};
      return badges.filter((b) => {
        if (b.mode === "manual") {
          return (assignments[b.id] ?? []).includes(partnerId);
        }
        // Criteria mode: every criterion must pass. Empty criteria === never assign.
        if (b.criteria.length === 0) return false;
        return b.criteria.every((c) => meetsCriterion(c, stats ?? null, flags));
      });
    },
    [badges, assignments],
  );

  const value = useMemo<BadgeContextValue>(
    () => ({
      badges,
      badgesForPartner,
      partnersWithBadge,
      createBadge,
      updateBadge,
      deleteBadge,
      assignBadge,
      unassignBadge,
    }),
    [badges, badgesForPartner, partnersWithBadge, createBadge, updateBadge, deleteBadge, assignBadge, unassignBadge],
  );

  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
};

export const useBadges = () => {
  const ctx = useContext(BadgeContext);
  if (!ctx) throw new Error("useBadges must be used inside BadgeProvider");
  return ctx;
};

export const badgeToneClass: Record<BadgeDefinition["tone"], string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  accent:  "bg-accent/10 text-accent border-accent/20",
  success: "bg-success/15 text-success border-success/20",
  warning: "bg-warning/15 text-warning border-warning/20",
  muted:   "bg-secondary text-foreground border-border",
};
