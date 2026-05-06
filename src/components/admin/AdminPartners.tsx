import { useEffect, useMemo, useState } from "react";
import {
  Award, ShieldCheck, Star, Users, TrendingUp, Loader2, Briefcase,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PARTNER_TIERS,
  computeReliability,
  computeTierProgress,
  tierToneClasses,
  type PartnerTrustInputs,
  type PartnerTier,
} from "@/lib/partnerTrust";
import { useBadges } from "@/contexts/BadgeContext";
import { useMarketplaceData } from "@/contexts/MarketplaceDataContext";
import { professionals } from "@/data/services";
import { cn } from "@/lib/utils";

// What the page renders for each partner.
interface PartnerRow {
  partnerId: string;
  name: string;
  initials: string;
  aadhaarVerified: boolean;
  stats: PartnerTrustInputs;
  reliability: number | null;
  tier: PartnerTier;
  badgeCount: number;
}

const computeStatsFromBookings = (rows: BookingStatRow[]): PartnerTrustInputs => {
  const completed = rows.filter((r) => r.status === "completed");
  const rated = rows.filter((r) => typeof r.rating === "number");
  const avg = rated.length
    ? Math.round((rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length) * 10) / 10
    : null;
  const partnerCancellations = rows.filter(
    (r) => r.status === "cancelled" && (r.cancellation_reason ?? "").toLowerCase().includes("partner"),
  ).length;

  const completedByUser = new Map<string, number>();
  for (const row of completed) {
    if (!row.user_id) continue;
    completedByUser.set(row.user_id, (completedByUser.get(row.user_id) ?? 0) + 1);
  }
  const repeats = Array.from(completedByUser.values()).filter((n) => n > 1).length;
  const distinctCustomers = completedByUser.size;

  const punctualitySamples = rows
    .filter((r) => r.arrived_at && r.scheduled_at)
    .map((r) => (new Date(r.arrived_at!).getTime() - new Date(r.scheduled_at!).getTime()) / 60000);

  const responded = rows.filter((r) => r.status !== "cancelled" && r.status !== "refunded").length;

  return {
    completedBookings: completed.length,
    totalBookings: rows.length,
    partnerCancellations,
    averageRating: avg,
    ratedBookings: rated.length,
    responseRatePct: rows.length > 0 ? Math.round((responded / rows.length) * 100) : null,
    punctualityMinutesLate: punctualitySamples.length
      ? punctualitySamples.reduce((a, b) => a + b, 0) / punctualitySamples.length
      : null,
    repeatCustomerRatio: distinctCustomers > 0 ? repeats / distinctCustomers : null,
  };
};

interface BookingStatRow {
  partner_id: string | null;
  user_id: string | null;
  status: string;
  rating: number | null;
  scheduled_at: string | null;
  arrived_at: string | null;
  cancellation_reason: string | null;
}

interface PartnerProfileRow {
  id: string;
  full_name: string;
  aadhaar_verified: boolean | null;
}

export const AdminPartners = () => {
  const { badgesForPartner } = useBadges();
  const { ratingForPro } = useMarketplaceData();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PartnerRow[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);

      // Pull partners (user_roles → profiles) and their booking aggregates.
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "partner");
      const partnerIds = (roleRows ?? []).map((r) => r.user_id);

      const profileMap = new Map<string, PartnerProfileRow>();
      const bookingsByPartner = new Map<string, BookingStatRow[]>();

      if (partnerIds.length > 0) {
        const [profilesRes, bookingsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, aadhaar_verified")
            .in("id", partnerIds),
          supabase
            .from("bookings")
            .select("partner_id, user_id, status, rating, scheduled_at, arrived_at, cancellation_reason")
            .in("partner_id", partnerIds),
        ]);

        for (const p of (profilesRes.data ?? []) as PartnerProfileRow[]) profileMap.set(p.id, p);
        for (const b of (bookingsRes.data ?? []) as BookingStatRow[]) {
          if (!b.partner_id) continue;
          const list = bookingsByPartner.get(b.partner_id) ?? [];
          list.push(b);
          bookingsByPartner.set(b.partner_id, list);
        }
      }

      const partnerRows: PartnerRow[] = [];

      for (const id of partnerIds) {
        const profile = profileMap.get(id);
        const stats = computeStatsFromBookings(bookingsByPartner.get(id) ?? []);
        const reliability = computeReliability(stats).score;
        const tier = computeTierProgress(stats).current;
        const badges = badgesForPartner(id, stats, { aadhaarVerified: !!profile?.aadhaar_verified });
        partnerRows.push({
          partnerId: id,
          name: profile?.full_name ?? "Unnamed partner",
          initials: (profile?.full_name ?? "P").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
          aadhaarVerified: !!profile?.aadhaar_verified,
          stats,
          reliability,
          tier,
          badgeCount: badges.length,
        });
      }

      // Append the seed roster — useful in demo mode where there are no
      // real partner user_roles rows yet.
      for (const p of professionals) {
        if (partnerRows.find((r) => r.partnerId === p.id)) continue;
        const { average } = ratingForPro(p.id);
        const stats: PartnerTrustInputs = {
          completedBookings: p.jobs,
          totalBookings: p.jobs,
          partnerCancellations: 0,
          averageRating: average ?? p.rating,
          ratedBookings: p.jobs,
          responseRatePct: null,
          punctualityMinutesLate: null,
          repeatCustomerRatio: null,
        };
        partnerRows.push({
          partnerId: p.id,
          name: p.name,
          initials: p.avatar,
          aadhaarVerified: true,
          stats,
          reliability: computeReliability(stats).score,
          tier: computeTierProgress(stats).current,
          badgeCount: badgesForPartner(p.id, stats, { aadhaarVerified: true }).length,
        });
      }

      if (mounted) {
        setRows(partnerRows);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [badgesForPartner, ratingForPro]);

  // Aggregates ───────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const tierCounts = new Map<string, number>();
    PARTNER_TIERS.forEach((t) => tierCounts.set(t.id, 0));
    let scoreSum = 0;
    let scoredCount = 0;
    let topRated: PartnerRow | null = null;
    let mostBookings: PartnerRow | null = null;
    for (const r of rows) {
      tierCounts.set(r.tier.id, (tierCounts.get(r.tier.id) ?? 0) + 1);
      if (r.reliability != null) {
        scoreSum += r.reliability;
        scoredCount += 1;
      }
      if ((r.stats.averageRating ?? 0) > (topRated?.stats.averageRating ?? 0)) topRated = r;
      if (r.stats.completedBookings > (mostBookings?.stats.completedBookings ?? -1)) mostBookings = r;
    }
    const avgReliability = scoredCount > 0 ? Math.round(scoreSum / scoredCount) : null;
    return { tierCounts, avgReliability, topRated, mostBookings };
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">Partner insights</h2>
        <p className="text-xs text-muted-foreground">
          Live tier distribution and reliability across all registered partners.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard
          icon={Users}
          label="Active partners"
          value={rows.length.toString()}
          tone="bg-primary/10 text-primary"
        />
        <SummaryCard
          icon={ShieldCheck}
          label="Avg reliability"
          value={summary.avgReliability != null ? `${summary.avgReliability}%` : "—"}
          tone="bg-success/10 text-success"
        />
        <SummaryCard
          icon={Star}
          label="Top rated"
          value={summary.topRated && summary.topRated.stats.averageRating != null
            ? `${summary.topRated.stats.averageRating.toFixed(1)} ★`
            : "—"}
          sub={summary.topRated?.name}
          tone="bg-amber-500/15 text-amber-500"
        />
        <SummaryCard
          icon={Briefcase}
          label="Most bookings"
          value={summary.mostBookings ? summary.mostBookings.stats.completedBookings.toString() : "—"}
          sub={summary.mostBookings?.name}
          tone="bg-accent/10 text-accent"
        />
      </div>

      {/* Tier distribution */}
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold text-foreground">Tier distribution</p>
        </div>
        <div className="mt-3 space-y-2">
          {PARTNER_TIERS.map((t) => {
            const count = summary.tierCounts.get(t.id) ?? 0;
            const pct = rows.length > 0 ? Math.round((count / rows.length) * 100) : 0;
            const tone = tierToneClasses[t.tone];
            return (
              <div key={t.id} className="flex items-center gap-3">
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", tone.chip)}>
                  <Award className="h-3 w-3" />
                  {t.label}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full transition-all duration-500", tone.bar)} style={{ width: `${pct}%` }} />
                </div>
                <span className="w-12 text-right text-xs font-bold text-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Partner table */}
      <div className="rounded-2xl bg-card shadow-soft overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-bold text-foreground">All partners</p>
        </div>
        <div className="divide-y divide-border">
          {rows
            .slice()
            .sort((a, b) => (b.reliability ?? -1) - (a.reliability ?? -1))
            .map((r) => {
              const tone = tierToneClasses[r.tier.tone];
              return (
                <div key={r.partnerId} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
                    {r.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", tone.chip)}>
                        {r.tier.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{r.stats.completedBookings} jobs</span>
                      {r.stats.averageRating != null && <span>• {r.stats.averageRating.toFixed(1)} ★ ({r.stats.ratedBookings})</span>}
                      <span>• {r.badgeCount} badge{r.badgeCount === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-foreground">
                      {r.reliability != null ? `${r.reliability}%` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reliability</p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

interface SummaryCardProps {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
  tone: string;
}
const SummaryCard = ({ icon: Icon, label, value, sub, tone }: SummaryCardProps) => (
  <div className="rounded-2xl bg-card p-4 shadow-soft">
    <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tone)}>
      <Icon className="h-4 w-4" />
    </div>
    <p className="mt-3 text-xl font-bold text-foreground">{value}</p>
    <p className="text-xs font-semibold text-foreground">{label}</p>
    {sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>}
  </div>
);

// Re-exported for AdminLayout + Admin.tsx convenience
export { TrendingUp };
