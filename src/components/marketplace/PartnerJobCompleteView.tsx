import { CheckCircle2, MapPin, Clock, Wallet, Star, Home, Calendar } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface Props { bookingId: string; }

function formatDuration(startedAt: Date | undefined, completedAt: Date | undefined): string {
  if (!startedAt || !completedAt) return "—";
  const ms = completedAt.getTime() - startedAt.getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const PartnerJobCompleteView = ({ bookingId }: Props) => {
  const { bookings, navigate } = useApp();
  const booking = bookings.find((b) => b.id === bookingId);

  if (!booking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-5">
        <p className="text-sm text-muted-foreground">Job not found.</p>
      </div>
    );
  }

  const duration = formatDuration(booking.startedAt, booking.completedAt);
  const completedAt = booking.completedAt ?? new Date();

  return (
    <div className="space-y-4 px-5 pb-6">
      {/* Success header */}
      <div className="rounded-3xl gradient-primary p-6 text-center shadow-elevated">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/20">
          <CheckCircle2 className="h-9 w-9 text-primary-foreground" />
        </div>
        <h2 className="mt-3 text-xl font-bold text-primary-foreground">Job Completed!</h2>
        <p className="mt-1 text-sm text-primary-foreground/80">Great work. Payment will be credited shortly.</p>
      </div>

      {/* Earnings spotlight */}
      <div className="rounded-3xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15">
            <Wallet className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">You earned</p>
            <p className="text-3xl font-bold text-success">₹{booking.service.price}</p>
          </div>
        </div>
      </div>

      {/* Job summary */}
      <div className="rounded-3xl bg-card p-5 shadow-card">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Job Summary</p>
        <div className="space-y-3 text-sm">
          <Row
            icon={<Star className="h-4 w-4 text-primary" />}
            label="Service"
            value={booking.service.name}
          />
          <Row
            icon={<MapPin className="h-4 w-4 text-primary" />}
            label="Address"
            value={booking.address}
            wrap
          />
          <Row
            icon={<Clock className="h-4 w-4 text-primary" />}
            label="Duration"
            value={duration}
          />
          <Row
            icon={<Calendar className="h-4 w-4 text-primary" />}
            label="Completed"
            value={completedAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
          />
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-muted-foreground">Service fee</span>
            <span className="text-lg font-bold text-success">₹{booking.service.price}</span>
          </div>
        </div>
      </div>

      {/* Rating received (if any) */}
      {booking.rating != null && (
        <div className="rounded-3xl bg-warning/10 border border-warning/20 p-4 text-center shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wider text-warning">Customer rating</p>
          <p className="mt-1 text-3xl font-bold text-foreground">
            {"★".repeat(Math.round(booking.rating))}{"☆".repeat(5 - Math.round(booking.rating))}
          </p>
          {booking.ratingComment && (
            <p className="mt-1 text-xs italic text-muted-foreground">"{booking.ratingComment}"</p>
          )}
        </div>
      )}

      <button
        onClick={() => navigate({ name: "partner-dashboard" })}
        className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-sm font-bold text-primary-foreground shadow-elevated transition-bounce active:scale-[0.98]"
      >
        <Home className="h-4 w-4" /> Back to Dashboard
      </button>

      <button
        onClick={() => navigate({ name: "partner-earnings" })}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card py-3 text-sm font-semibold text-foreground shadow-soft border border-border transition-smooth hover:bg-secondary"
      >
        <Wallet className="h-4 w-4" /> View earnings history
      </button>
    </div>
  );
};

const Row = ({
  icon, label, value, wrap = false,
}: { icon: React.ReactNode; label: string; value: string; wrap?: boolean }) => (
  <div className={cn("flex gap-3", wrap ? "items-start" : "items-center justify-between")}>
    <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
    <span className={cn("font-semibold text-foreground", wrap && "text-right")}>{value}</span>
  </div>
);
