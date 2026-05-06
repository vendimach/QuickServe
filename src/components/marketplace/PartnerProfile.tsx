import { ArrowLeft, Star, Briefcase, MapPin, Calendar, ShieldCheck } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useMarketplaceData } from "@/contexts/MarketplaceDataContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { professionals } from "@/data/services";
import { AvatarBadge } from "./AvatarBadge";
import {
  computeTierProgress,
  computeReliability,
  proToTrustInputs,
} from "@/lib/partnerTrust";
import { TierChip, ReliabilityPill, BadgeChips, TierProgressCard } from "./TrustBadges";

interface Props {
  partnerId: string;
}

export const PartnerProfile = ({ partnerId }: Props) => {
  const { navigate } = useApp();
  const { reviewsForPro, ratingForPro } = useMarketplaceData();
  const { favoritedByCount } = useFavorites();
  const pro = professionals.find((p) => p.id === partnerId);
  if (!pro) return null;
  const reviews = reviewsForPro(pro.id);
  // Dynamic from reviews — no static fallback. When there are no reviews
  // we render a clear "no rating yet" state instead of a fake number.
  const { average, count } = ratingForPro(pro.id);
  const stats = proToTrustInputs(
    { jobs: pro.jobs, rating: average ?? pro.rating },
    { favoritedByCount: favoritedByCount(pro.id) },
  );
  const tier = computeTierProgress(stats).current;
  const reliability = computeReliability(stats);

  return (
    <div className="px-5 pb-6">
      <button
        onClick={() => navigate({ name: "bookings" })}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="rounded-3xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-4">
          <AvatarBadge
            src={pro.avatarUrl}
            name={pro.name}
            className="h-16 w-16 text-lg shadow-soft"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-foreground">{pro.name}</h2>
              <TierChip tier={tier} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-warning text-warning" />
                <span className="font-bold text-foreground">
                  {average != null ? average.toFixed(1) : "—"}
                </span>
                <span>({count})</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> {pro.jobs.toLocaleString()} jobs
              </span>
              {pro.distance && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-primary" /> {pro.distance}
                  </span>
                </>
              )}
              <ReliabilityPill score={reliability.score} size="sm" />
            </div>
          </div>
        </div>
        {pro.bio && <p className="mt-4 text-sm text-muted-foreground">{pro.bio}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-[11px] font-bold text-success">
            <ShieldCheck className="h-3 w-3" /> Verified Pro
          </span>
        </div>
        <BadgeChips
          partnerId={pro.id}
          stats={stats}
          aadhaarVerified
          size="md"
          className="mt-2"
        />
      </div>

      <div className="mt-4">
        <TierProgressCard stats={stats} />
      </div>

      {pro.schedule && pro.schedule.length > 0 && (
        <div className="mt-4 rounded-2xl bg-card p-4 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Weekly schedule</p>
          <div className="mt-2 space-y-2">
            {pro.schedule.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground">{s.days.join(", ")}</span>
                <span className="text-muted-foreground">• {s.start} – {s.end}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Reviews ({reviews.length})
        </p>
        {reviews.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 text-center text-xs text-muted-foreground shadow-soft">
            No reviews yet — be the first!
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">{r.customerName}</p>
                  <span className="flex items-center gap-0.5 text-xs">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="font-bold text-foreground">{r.rating}</span>
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
                )}
                {r.tags && r.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {r.createdAt.toLocaleDateString("en", { dateStyle: "medium" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};