import { ArrowLeft, Star, MapPin, Clock, Zap, CheckCircle2, User } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { professionals as allPros } from "@/data/services";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo } from "react";

interface Props {
  bookingId: string;
}

export const MatchingList = ({ bookingId }: Props) => {
  const { bookings, navigate, customerConfirmPartner, cancelBooking } = useApp();
  const booking = bookings.find((b) => b.id === bookingId);

  // Pre-compute matched pros (interest + availability) for scheduled view
  const matched = useMemo(() => {
    if (!booking) return [];
    return allPros.filter(
      (p) => p.categoryIds?.includes(booking.service.categoryId) && p.listedToday,
    );
  }, [booking]);

  useEffect(() => {
    if (booking?.status === "confirmed") {
      navigate({ name: "live-status", bookingId });
    }
  }, [booking?.status, bookingId, navigate]);

  if (!booking) return null;

  const accepted = booking.acceptedBy ?? [];
  const showList = booking.type === "instant" ? accepted : matched;
  const isSearching = booking.type === "instant" && accepted.length === 0;

  return (
    <div className="-mt-5 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "service-detail", serviceId: booking.service.id })}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              {booking.type === "instant" ? "Instant booking" : "Scheduled booking"}
            </p>
            <h2 className="text-base font-bold text-foreground">{booking.service.name}</h2>
          </div>
          <span className="text-sm font-bold text-primary">₹{booking.service.price}</span>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">
            {booking.type === "instant" ? "Partners who accepted" : "Available partners"}
          </h3>
          <span className="text-xs text-muted-foreground">
            {showList.length} match{showList.length === 1 ? "" : "es"}
          </span>
        </div>

        {isSearching && (
          <div className="rounded-2xl bg-card p-6 text-center shadow-card animate-fade-in-up">
            <div className="relative mx-auto my-2 flex h-20 w-20 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-primary/30" />
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-primary/30" style={{ animationDelay: "0.6s" }} />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-glow">
                <Zap className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-2 text-sm font-bold">Searching nearby partners…</p>
            <p className="text-xs text-muted-foreground">As they accept, they'll appear here.</p>
          </div>
        )}

        <div className="space-y-3">
          {showList.map((p) => (
            <div key={p.id} className="rounded-2xl bg-card p-4 shadow-card animate-fade-in-up">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground">
                  {p.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{p.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      <span className="font-semibold text-foreground">{p.rating}</span>
                    </span>
                    <span>• {p.jobs.toLocaleString()} jobs</span>
                    {p.distance && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3 text-primary" /> {p.distance}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> ETA {p.eta}
                    </span>
                  </div>
                </div>
                {p.availableNow && (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                    Live
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate({ name: "partner-profile", partnerId: p.id })}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-secondary py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted"
              >
                <User className="h-3 w-3" /> View profile & reviews
              </button>
              <Button
                size="sm"
                className="mt-2 w-full"
                onClick={() => customerConfirmPartner(booking.id, p)}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm {p.name.split(" ")[0]}
              </Button>
            </div>
          ))}
        </div>

        {!isSearching && showList.length === 0 && (
          <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
            <p className="text-xs text-muted-foreground">No partners available right now.</p>
          </div>
        )}

        <button
          onClick={() => {
            cancelBooking(booking.id);
            navigate({ name: "bookings" });
          }}
          className="mt-6 w-full rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-smooth hover:bg-secondary"
        >
          Cancel Booking
        </button>
      </div>
    </div>
  );
};
