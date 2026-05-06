import { ArrowLeft, Heart, Trash2, User, Briefcase, Calendar, Sparkles } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useFavorites, FAVORITES_LIMIT } from "@/contexts/FavoritesContext";
import { useMarketplaceData } from "@/contexts/MarketplaceDataContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { professionals as seedPros } from "@/data/services";
import {
  computeReliability,
  computeTierProgress,
  proToTrustInputs,
} from "@/lib/partnerTrust";
import { AvatarBadge } from "./AvatarBadge";
import { TierChip, ReliabilityPill } from "./TrustBadges";

export const FavoritesView = () => {
  const { navigate, bookings } = useApp();
  const { favorites, removeFavorite } = useFavorites();
  const { ratingForPro } = useMarketplaceData();
  const { push } = useNotifications();

  // Map a partner_id → most-recent service used so the "Book again" jump-off
  // can prefill the right service. Falls back to the partner's own bookings
  // even if the seed list doesn't know about them.
  const lastServiceFor = (partnerId: string) => {
    const completedWith = bookings
      .filter((b) => b.partnerUserId === partnerId && b.status === "completed")
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));
    return completedWith[0]?.service ?? null;
  };

  return (
    <div className="space-y-4 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "profile" })}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to profile
      </button>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl gradient-primary p-6 text-primary-foreground shadow-card">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Heart className="h-6 w-6 fill-current" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider opacity-85">Favorite partners</p>
            <p className="mt-1 text-2xl font-extrabold leading-none">
              {favorites.length} <span className="text-base font-semibold opacity-75">/ {FAVORITES_LIMIT}</span>
            </p>
          </div>
        </div>
        <p className="relative mt-3 text-xs opacity-85">
          Favorited partners are matched first on your bookings, and you can send them direct requests.
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center shadow-soft">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-bold text-foreground">No favorites yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            After a service is completed, tap "Add to favorites" on the booking summary.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {favorites.map((f) => {
            // Build a profile-like object so we can reuse the trust helpers.
            const seed = seedPros.find((p) => p.id === f.partnerId);
            const completedCount = bookings.filter(
              (b) => b.partnerUserId === f.partnerId && b.status === "completed",
            ).length;
            const { average, count: ratingCount } = ratingForPro(f.partnerId);
            const stats = proToTrustInputs({
              jobs: seed?.jobs ?? completedCount,
              rating: average ?? seed?.rating ?? 0,
            });
            const tier = computeTierProgress(stats).current;
            const reliability = computeReliability(stats);
            const lastService = lastServiceFor(f.partnerId) ?? (seed
              ? null
              : null);

            return (
              <li key={f.partnerId} className="rounded-2xl bg-card p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <AvatarBadge
                    src={f.partnerAvatarUrl}
                    name={f.partnerName}
                    className="h-12 w-12 text-base shadow-soft"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-foreground">{f.partnerName}</p>
                      <TierChip tier={tier} size="sm" />
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span>★ {average != null ? average.toFixed(1) : "New"}</span>
                      {ratingCount > 0 && <span>({ratingCount})</span>}
                      <ReliabilityPill score={reliability.score} size="sm" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeFavorite(f.partnerId);
                      push({ kind: "info", title: "Removed from favorites", body: f.partnerName });
                    }}
                    className="rounded-lg p-1.5 text-destructive transition-smooth hover:bg-destructive/10"
                    aria-label="Remove favorite"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => navigate({ name: "partner-profile", partnerId: f.partnerId })}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground transition-smooth hover:bg-secondary"
                  >
                    <User className="h-3.5 w-3.5" /> View profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Prefer the actual service this customer last used with
                      // the partner; if unavailable, drop them on the home
                      // page so they can pick one. Either way we route to
                      // the booking-flow which already supports prefill.
                      if (lastService) {
                        navigate({ name: "booking-flow", serviceId: lastService.id });
                      } else {
                        navigate({ name: "home" });
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl gradient-primary py-2 text-xs font-bold text-primary-foreground shadow-soft"
                  >
                    <Calendar className="h-3.5 w-3.5" /> Book again
                  </button>
                </div>
                {seed && (
                  <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Briefcase className="h-3 w-3" /> {seed.jobs.toLocaleString()} jobs delivered
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
