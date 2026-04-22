import { useEffect } from "react";
import { CheckCircle2, MapPin, Phone, MessageCircle, Star, Clock, X, Radar } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { professionals } from "@/data/services";

interface Props {
  bookingId: string;
}

export const LiveStatus = ({ bookingId }: Props) => {
  const { bookings, confirmMatch, navigate } = useApp();
  const booking = bookings.find((b) => b.id === bookingId);

  useEffect(() => {
    if (booking?.status === "searching") {
      const t = setTimeout(() => {
        confirmMatch(bookingId, professionals[Math.floor(Math.random() * professionals.length)]);
      }, 4500);
      return () => clearTimeout(t);
    }
  }, [booking?.status, bookingId, confirmMatch]);

  if (!booking) return null;

  const isSearching = booking.status === "searching";

  return (
    <div className="-mt-5 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "bookings" })}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <X className="h-3.5 w-3.5" /> Close
      </button>

      {isSearching ? (
        <div className="rounded-3xl bg-card p-6 text-center shadow-card animate-scale-in">
          {/* Radar pulse */}
          <div className="relative mx-auto my-6 flex h-32 w-32 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-primary/30" />
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-primary/30" style={{ animationDelay: "0.6s" }} />
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-primary/30" style={{ animationDelay: "1.2s" }} />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-glow">
              <Radar className="h-10 w-10" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-foreground">Searching for Professional</h2>
          <p className="mt-1 text-sm text-muted-foreground">Matching you with the nearest verified pro…</p>

          <div className="mt-6 rounded-2xl bg-secondary p-4 text-left">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service</p>
              <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase text-warning">Instant</span>
            </div>
            <p className="mt-1 text-sm font-bold text-foreground">{booking.service.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">₹{booking.service.price} • {booking.service.duration}</p>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s linear infinite",
              }}
            />
          </div>

          <button
            onClick={() => navigate({ name: "bookings" })}
            className="mt-6 w-full rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-smooth hover:bg-secondary"
          >
            Cancel Search
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in-up">
          <div className="rounded-3xl bg-card p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Booking Confirmed!</h2>
                <p className="text-xs text-muted-foreground">
                  {booking.type === "instant"
                    ? `Arriving in ${booking.professional?.eta ?? "10 min"}`
                    : booking.scheduledAt
                      ? `Scheduled for ${booking.scheduledAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}`
                      : "Scheduled"}
                </p>
              </div>
            </div>
          </div>

          {booking.professional && (
            <div className="rounded-3xl bg-card p-5 shadow-card">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Professional</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-base font-bold text-primary-foreground shadow-soft">
                  {booking.professional.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{booking.professional.name}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      <span className="font-semibold text-foreground">{booking.professional.rating}</span>
                    </span>
                    <span>•</span>
                    <span>{booking.professional.jobs.toLocaleString()} jobs</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-xs font-semibold text-primary transition-smooth hover:bg-primary/15">
                  <Phone className="h-4 w-4" /> Call
                </button>
                <button className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-xs font-semibold text-foreground transition-smooth hover:bg-muted">
                  <MessageCircle className="h-4 w-4" /> Chat
                </button>
              </div>
            </div>
          )}

          <div className="rounded-3xl bg-card p-5 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Booking Details</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-semibold text-foreground">{booking.service.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <Clock className="h-3 w-3" /> {booking.service.duration}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-primary">₹{booking.service.price}</span>
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-border pt-2">
                <span className="text-muted-foreground">Address</span>
                <span className="flex items-center gap-1 text-right font-semibold text-foreground">
                  <MapPin className="h-3 w-3 text-primary" />
                  {booking.address}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};