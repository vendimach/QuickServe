import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  CheckCircle2,
  MapPin,
  Phone,
  MessageCircle,
  Star,
  Clock,
  X,
  Navigation,
  Video,
  Info,
  ShieldAlert,
  AlertTriangle,
  Flag,
  KeyRound,
  Loader2,
  Search,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { safetyInstructions, cancellationPolicy } from "@/data/services";

interface Props {
  bookingId: string;
}

export const LiveStatus = ({ bookingId }: Props) => {
  const { bookings, navigate, completeBooking, cancelBooking, partnerStartService, role } = useApp();
  useAuth();
  const [otpInput, setOtpInput] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const booking = bookings.find((b) => b.id === bookingId);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!booking) return null;

  // Show "Finding partner…" screen while the booking is still searching
  if (booking.status === "searching") {
    return (
      <div className="px-5 pb-6">
        <button
          onClick={() => navigate({ name: "bookings" })}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
        >
          <X className="h-3.5 w-3.5" /> Close
        </button>
        <div className="space-y-4 animate-fade-in-up">
          <div className="rounded-3xl bg-card p-6 text-center shadow-card">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Search className="h-7 w-7 animate-pulse text-primary" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-foreground">Finding your partner</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Looking for available professionals near you…
            </p>
            <div className="mt-4 flex items-center justify-center gap-1.5">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs font-medium text-primary">Searching nearby partners</span>
            </div>
          </div>
          <div className="rounded-3xl bg-card p-5 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Booking details</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-semibold text-foreground">{booking.service.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-primary">₹{booking.service.price}</span>
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-border pt-2">
                <span className="text-muted-foreground">Address</span>
                <span className="flex items-center gap-1 text-right font-semibold text-foreground">
                  <MapPin className="h-3 w-3 text-primary shrink-0" />
                  {booking.address}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm("Cancel this booking?")) {
                cancelBooking(booking.id);
                navigate({ name: "bookings" });
              }
            }}
            className="w-full rounded-2xl border border-destructive/30 bg-card py-3 text-sm font-bold text-destructive shadow-soft"
          >
            Cancel booking
          </button>
        </div>
      </div>
    );
  }

  if (!booking.professional) return null;

  const arrived = booking.status === "in-progress" || !!booking.arrivedAt;
  const completed = booking.status === "completed";
  // Show OTP input as soon as booking is confirmed — partner arrival is a demo simulation
  const awaitingOtp = booking.status === "confirmed";
  const isCustomer = role === "customer";

  const submitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    if (otpInput.length !== 4) return;
    setVerifyingOtp(true);
    const ok = partnerStartService(booking.id, otpInput);
    setVerifyingOtp(false);
    if (!ok) {
      setOtpError("Wrong OTP — ask the partner for the correct code.");
      return;
    }
    setOtpInput("");
  };

  // ETA timer countdown — compressed to match AppContext arrival sim (8s per minute)
  const etaMinutes = parseInt(booking.professional.eta) || 8;
  const etaTotalMs = Math.max(Math.min(etaMinutes, 1) * 1000 * 8, 8000);
  const startedMs = booking.confirmedAt?.getTime() ?? booking.createdAt.getTime();
  const elapsedMs = now - startedMs;
  const remainingMs = Math.max(etaTotalMs - elapsedMs, 0);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const mm = Math.floor(remainingSec / 60).toString().padStart(2, "0");
  const ss = (remainingSec % 60).toString().padStart(2, "0");
  const progressPct = arrived
    ? 100
    : Math.min(100, Math.round((elapsedMs / etaTotalMs) * 100));

  // Cancellation fee logic
  const cancelFee =
    booking.status === "in-progress" || arrived
      ? cancellationPolicy.withinArrivalFee
      : cancellationPolicy.afterAcceptFee;

  const handleCancel = () => {
    if (
      window.confirm(
        `Cancel this booking?\n\nA fine of ₹${cancelFee} will apply per our cancellation policy.`,
      )
    ) {
      cancelBooking(booking.id);
      navigate({ name: "bookings" });
    }
  };

  const instructions = safetyInstructions[booking.service.categoryId] ?? [];

  return (
    <div className="px-5 pb-6">
      <button
        onClick={() => navigate({ name: "bookings" })}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <X className="h-3.5 w-3.5" /> Close
      </button>

      <div className="space-y-4 animate-fade-in-up">
        {/* Live tracking map */}
        {!completed && (
          <div className="overflow-hidden rounded-3xl bg-card shadow-card">
            <div className="relative h-44 sm:h-52 bg-gradient-to-br from-primary/20 via-secondary to-accent/20">
              {/* fake map grid */}
              <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] bg-[size:32px_32px] opacity-50" />
              {/* route line */}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                <path
                  d="M 20 80 Q 60 30 120 50 T 180 20"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="4 3"
                  className="animate-pulse"
                />
              </svg>
              {/* destination pin */}
              <div className="absolute right-6 top-4 flex flex-col items-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-elevated">
                  <MapPin className="h-4 w-4" />
                </div>
                <span className="mt-1 rounded bg-card px-1.5 py-0.5 text-[9px] font-semibold shadow-soft">You</span>
              </div>
              {/* partner pin moving */}
              <div
                className="absolute bottom-6 transition-all duration-1000 ease-linear"
                style={{ left: `${10 + progressPct * 0.7}%` }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-xs font-bold text-primary-foreground shadow-glow ring-4 ring-primary/30">
                  {booking.professional.avatar}
                </div>
                <span className="mt-1 block rounded bg-card px-1.5 py-0.5 text-[9px] font-semibold shadow-soft">
                  {arrived ? "Arrived" : `${booking.professional.name.split(" ")[0]}`}
                </span>
              </div>
              <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-[10px] font-bold text-foreground shadow-soft backdrop-blur-sm">
                <Navigation className="h-3 w-3 text-primary" /> Live tracking
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {arrived ? "Service in progress" : "Arriving in"}
                </p>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {arrived ? "Now" : `${mm}:${ss}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Distance</p>
                <p className="text-base font-bold text-foreground">{booking.professional.distance ?? "—"}</p>
              </div>
            </div>
            <div className="h-1.5 w-full bg-muted">
              <div
                className="h-full gradient-primary transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Status header */}
        <div className="rounded-3xl bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-foreground">
                {completed ? "Service completed" : arrived ? "Partner has arrived" : "Booking confirmed"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {booking.type === "instant"
                  ? arrived
                    ? "Your professional is on-site"
                    : `Arriving in ${booking.professional.eta}`
                  : booking.scheduledAt
                    ? `Scheduled for ${booking.scheduledAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}`
                    : "Scheduled"}
              </p>
            </div>
          </div>
        </div>

        {/* Customer enters OTP from partner to start service */}
        {awaitingOtp && isCustomer && (
          <form
            onSubmit={submitOtp}
            className="rounded-3xl border-2 border-primary/30 bg-primary/5 p-5 shadow-card animate-fade-in-up"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Enter start OTP</p>
                <p className="text-[11px] text-muted-foreground">
                  Ask {booking.professional.name.split(" ")[0]} for the 4-digit code
                </p>
              </div>
            </div>
            <input
              value={otpInput}
              onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 4)); setOtpError(""); }}
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              className={`mt-4 w-full rounded-xl border bg-card px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-foreground placeholder:text-muted-foreground focus:outline-none ${otpError ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"}`}
            />
            {otpError && (
              <p className="mt-1.5 text-center text-xs font-medium text-destructive">{otpError}</p>
            )}
            <button
              type="submit"
              disabled={verifyingOtp || otpInput.length !== 4}
              className="mt-3 w-full rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
            >
              {verifyingOtp ? "Verifying…" : "Start service & timer"}
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Service time will only be calculated after OTP verification.
            </p>
            <div className="mt-3 rounded-xl border border-dashed border-border bg-card/60 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Test OTP</p>
              <p className="mt-0.5 font-mono text-lg font-bold tracking-[0.35em] text-primary">{booking.startOtp}</p>
            </div>
          </form>
        )}

        {/* Professional card */}
        <div className="rounded-3xl bg-card p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Professional</p>
          <button
            onClick={() =>
              navigate({ name: "partner-profile", partnerId: booking.professional!.id })
            }
            className="mt-3 flex w-full items-center gap-3 text-left"
          >
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
            <span className="text-[10px] font-semibold text-primary">View ›</span>
          </button>

          {!completed && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button className="flex flex-col items-center justify-center gap-1 rounded-xl bg-primary/10 py-2.5 text-[11px] font-semibold text-primary transition-smooth hover:bg-primary/15">
              <Phone className="h-4 w-4" /> Call
            </button>
            <button
              onClick={() => navigate({ name: "chat", bookingId: booking.id })}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-secondary py-2.5 text-[11px] font-semibold text-foreground transition-smooth hover:bg-muted"
            >
              <MessageCircle className="h-4 w-4" /> Chat
            </button>
            <button
              onClick={() => arrived && navigate({ name: "live-cam", bookingId: booking.id })}
              disabled={!arrived}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 text-[11px] font-semibold transition-smooth ${
                arrived
                  ? "bg-accent/15 text-accent hover:bg-accent/20"
                  : "bg-muted text-muted-foreground opacity-60"
              }`}
            >
              <Video className="h-4 w-4" /> {arrived ? "Live Cam" : "Cam soon"}
            </button>
          </div>
          )}
          {!completed && !arrived && (
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Live cam unlocks once partner arrives
            </p>
          )}
        </div>

        {/* Instructions */}
        {instructions.length > 0 && !completed && (
          <div className="rounded-3xl bg-warning/10 p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-warning" />
              <p className="text-sm font-bold text-foreground">Before partner arrives</p>
            </div>
            <ul className="mt-3 space-y-2 text-xs text-foreground">
              {instructions.map((ins) => (
                <li key={ins} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Preferences applied to this booking */}
        {booking.preferences && booking.preferences.schedule && booking.preferences.schedule.length > 0 && (
          <div className="rounded-3xl bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Your preferences (shared with partner)
              </p>
            </div>
            <div className="mt-3 space-y-1.5 text-sm">
              {booking.preferences.schedule.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-foreground">{s.label}</span>
                  <span className="font-semibold tabular-nums text-primary">{s.time}</span>
                </div>
              ))}
            </div>
            {booking.preferences.notes && (
              <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                {booking.preferences.notes}
              </p>
            )}
          </div>
        )}

        {/* Booking details */}
        <div className="rounded-3xl bg-card p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Booking details</p>
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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span className={`font-semibold ${booking.paymentStatus === "paid" ? "text-success" : "text-muted-foreground"}`}>
                {booking.paymentStatus === "paid"
                  ? "Paid"
                  : booking.paymentStatus === "refunded"
                    ? "Refunded"
                    : "Due after service"}
              </span>
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

        {/* Cancellation policy & actions */}
        {!completed && (
          <div className="rounded-3xl bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cancellation policy
              </p>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              {cancellationPolicy.rules.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs">
              Cancelling now will charge <span className="font-bold text-destructive">₹{cancelFee}</span>.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={handleCancel}
                className="rounded-xl border border-destructive/30 bg-card py-2.5 text-xs font-bold text-destructive transition-smooth hover:bg-destructive/5"
              >
                Cancel booking
              </button>
              {booking.status === "in-progress" && (
                <button
                  onClick={() => {
                    completeBooking(booking.id);
                    navigate({ name: "booking-summary", bookingId: booking.id }, { replace: true });
                  }}
                  className="rounded-xl gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-soft"
                >
                  <Flag className="mr-1 inline h-3.5 w-3.5" /> Mark complete
                </button>
              )}
            </div>
          </div>
        )}

        {completed && !booking.rated && (
          <button
            onClick={() => navigate({ name: "booking-summary", bookingId: booking.id })}
            className="w-full rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-elevated"
          >
            View summary & rate
          </button>
        )}
        {completed && booking.rated && (
          <button
            onClick={() => navigate({ name: "booking-summary", bookingId: booking.id })}
            className="w-full rounded-2xl bg-card py-3 text-sm font-bold text-foreground shadow-soft border border-border"
          >
            View booking summary
          </button>
        )}
      </div>
    </div>
  );
};