import { Award, ShieldCheck, TrendingUp } from "lucide-react";
import {
  PARTNER_TIERS,
  computeTierProgress,
  computeReliability,
  tierToneClasses,
  type PartnerTrustInputs,
  type PartnerTier,
} from "@/lib/partnerTrust";
import { useBadges, badgeToneClass, type BadgeDefinition } from "@/contexts/BadgeContext";
import { cn } from "@/lib/utils";

// ─── Small chip showing the partner's tier label ───────────────────────────

interface TierChipProps {
  tier: PartnerTier;
  className?: string;
  size?: "sm" | "md";
}

export const TierChip = ({ tier, className, size = "md" }: TierChipProps) => {
  const tone = tierToneClasses[tier.tone];
  return (
    <span
      title={tier.description}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider",
        tone.chip,
        size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        className,
      )}
    >
      <Award className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      <span>{tier.label}</span>
    </span>
  );
};

// ─── Reliability pill (e.g. "Reliability 96%") ─────────────────────────────

interface ReliabilityPillProps {
  score: number | null;
  size?: "sm" | "md";
  className?: string;
}

export const ReliabilityPill = ({ score, size = "md", className }: ReliabilityPillProps) => {
  if (score == null) {
    return (
      <span
        title="Not enough data to compute a reliability score yet."
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground font-bold uppercase tracking-wider",
          size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
          className,
        )}
      >
        <ShieldCheck className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
        New
      </span>
    );
  }
  // Tone scales with score so customers can read it at a glance.
  const tone =
    score >= 90 ? "bg-success/15 text-success" :
    score >= 75 ? "bg-primary/15 text-primary" :
    score >= 60 ? "bg-warning/15 text-warning" :
                  "bg-destructive/15 text-destructive";
  return (
    <span
      title="Weighted from completion, ratings, punctuality, response and cancellations."
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider",
        tone,
        size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        className,
      )}
    >
      <ShieldCheck className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      Reliability {score}%
    </span>
  );
};

// ─── Big tier progress card (used at top of partner home + profile) ────────

interface TierProgressCardProps {
  stats: PartnerTrustInputs;
  /** Total badges earned, surfaced as a small stat. */
  badgeCount?: number;
}

export const TierProgressCard = ({ stats, badgeCount }: TierProgressCardProps) => {
  const progress = computeTierProgress(stats);
  const reliability = computeReliability(stats);
  const tone = tierToneClasses[progress.current.tone];

  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Your tier
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", tone.chip)}>
              <Award className="h-3.5 w-3.5" />
              {progress.current.label}
            </span>
            <ReliabilityPill score={reliability.score} />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{progress.current.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Jobs</p>
          <p className="text-base font-extrabold text-foreground">{stats.completedBookings}</p>
          {badgeCount != null && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">{badgeCount} badge{badgeCount === 1 ? "" : "s"}</p>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-foreground">{progress.current.label}</span>
          {progress.next ? (
            <span className="text-muted-foreground">
              <TrendingUp className="mr-1 inline h-3 w-3" />
              {progress.next.label}
            </span>
          ) : (
            <span className="font-semibold text-success">Top tier</span>
          )}
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-500", tone.bar)}
            style={{ width: `${progress.next ? progress.percentToNext : 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">{progress.hint}</p>
      </div>
    </div>
  );
};

// ─── Badge chip strip ─────────────────────────────────────────────────────

interface BadgeChipsProps {
  partnerId: string;
  stats?: PartnerTrustInputs | null;
  aadhaarVerified?: boolean;
  /** Cap rendered badges to N; remainder shown as "+X". 0 = no cap. */
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

export const BadgeChips = ({
  partnerId,
  stats,
  aadhaarVerified,
  max = 0,
  size = "sm",
  className,
}: BadgeChipsProps) => {
  const { badgesForPartner } = useBadges();
  const all = badgesForPartner(partnerId, stats, { aadhaarVerified });
  if (all.length === 0) return null;
  const visible = max > 0 ? all.slice(0, max) : all;
  const overflow = max > 0 ? all.length - visible.length : 0;
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {visible.map((b) => (
        <BadgeChip key={b.id} badge={b} size={size} />
      ))}
      {overflow > 0 && (
        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
};

interface BadgeChipProps {
  badge: BadgeDefinition;
  size?: "sm" | "md";
}

export const BadgeChip = ({ badge, size = "md" }: BadgeChipProps) => (
  <span
    title={badge.description}
    className={cn(
      "inline-flex items-center gap-1 rounded-full border font-semibold",
      badgeToneClass[badge.tone],
      size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
    )}
  >
    <span aria-hidden>{badge.icon}</span>
    <span>{badge.label}</span>
  </span>
);
