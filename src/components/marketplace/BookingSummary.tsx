import { useState } from "react";
import { CheckCircle2, Clock, MapPin, Star, CreditCard, Receipt, ArrowLeft, StickyNote, Timer, Heart, Calendar } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMarketplaceData } from "@/contexts/MarketplaceDataContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useFavorites, FAVORITES_LIMIT } from "@/contexts/FavoritesContext";
import { payWithRazorpay } from "@/lib/razorpay";
import { cn } from "@/lib/utils";
import { formatMinutes, finalBilledAmount, parseDurationToMinutes } from "@/lib/bookingTimer";
interface Props { bookingId: string }

const fmtTime = (d?: Date) =>
  d ? d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }) : "—";

const durationMs = (a?: Date, b?: Date) => {
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  if (ms <= 0) return null;
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

export const BookingSummary = ({ bookingId }: Props) => {
  const { bookings, loadingBookings, navigate, saveRating } = useApp();
  const { addReview } = useMarketplaceData();
  const { profile, user } = useAuth();
  const { push } = useNotifications();
  const { isFavorite, addFavorite, count: favoritesCount } = useFavorites();
  const booking = bookings.find((b) => b.id === bookingId);

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [paying, setPaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState(false);

  if (!booking) {
    if (loadingBookings) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      );
    }
    return null;
  }

  const professional = booking.professional ?? {
    id: "unknown",
    name: "Your Professional",
    rating: 5,
    jobs: 0,
    avatar: "P",
    eta: "—",
  };

  const totalDuration = durationMs(booking.startedAt, booking.completedAt);

  // ── Billing breakdown ────────────────────────────────────────────────────
  // Recompute on the client so the summary stays correct even if the
  // persisted final_amount column is missing on older rows.
  const plannedMin =
    booking.plannedDurationMinutes ?? parseDurationToMinutes(booking.service.duration, 60);
  const actualMin =
    booking.actualDurationMinutes ??
    (booking.startedAt && booking.completedAt
      ? Math.max(0, Math.round(
        (booking.completedAt.getTime() - booking.startedAt.getTime()) / 60000,
      ))
      : 0);
  const extensionMin = booking.extensionMinutes ?? 0;
  const billing = finalBilledAmount({
    price: booking.service.price,
    plannedMinutes: plannedMin,
    elapsedMinutes: actualMin,
    extensionMinutes: extensionMin,
  });
  // Prefer the persisted finalAmount if present (it's authoritative); otherwise
  // fall back to the freshly-computed total.
  const finalTotal = booking.finalAmount ?? billing.total;
  const earlyFinish = actualMin < plannedMin;

  const paid = booking.paymentStatus === "paid";
  const refunded = booking.paymentStatus === "refunded";
  const codish = (booking.paymentMethod ?? "").toLowerCase() === "cod";
  const showPay = !paid && !refunded && !codish;
  const paymentSettled = paid || refunded || codish;
  // Service details, preferences, and rating are visible immediately —
  // payment is collected at the end (after the service is performed).
  const cancelled = booking.status === "cancelled" || booking.status === "refunded";
  const completed = booking.status === "completed";

  const handlePay = async () => {
    setPaying(true);
    const res = await payWithRazorpay({
      amount: finalTotal,
      bookingId: booking.id,
      customerName: profile?.full_name,
      customerEmail: user?.email ?? undefined,
      customerContact: profile?.mobile,
      description: booking.service.name,
    });
    setPaying(false);
    if (res.paid) {
      push({ kind: "success", title: "Payment successful", body: `₹${finalTotal} paid` });
    } else if (res.reason && res.reason !== "Payment cancelled") {
      push({ kind: "warning", title: "Payment failed", body: res.reason });
    }
  };

  const submitRating = async () => {
    if (booking.rated) {
      navigate({ name: "bookings" }, { replace: true });
      return;
    }
    if (rating < 1) {
      setRatingError(true);
      return;
    }
    setRatingError(false);
    setSubmitting(true);
    addReview({
      professionalId: professional.id,
      bookingId: booking.id,
      rating,
      comment: comment.trim() || undefined,
      customerName: profile?.full_name?.split(" ")[0] ?? "You",
    });
    try {
      await saveRating(booking.id, rating, comment.trim() || undefined);
    } catch (e) {
      console.error("save rating failed", e);
    }
    setSubmitting(false);
    push({ kind: "success", title: "Thanks for your feedback!" });
    navigate({ name: "bookings" }, { replace: true });
  };

  return (
    <div className="px-5 pb-6 space-y-4">
      <button
        onClick={() => navigate({ name: "bookings" }, { replace: true })}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to bookings
      </button>

      {/* Hero */}
      <div className="rounded-3xl bg-card p-6 text-center shadow-card animate-fade-in-up">
        <div className={cn(
          "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
          cancelled ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success",
        )}>
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="mt-3 text-lg font-bold">
          {cancelled ? "Booking cancelled" : completed ? "Service completed" : "Booking details"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{booking.service.name}</p>
      </div>

      {/* Service details — always visible */}
      <div className="rounded-3xl bg-card p-5 shadow-soft animate-fade-in-up">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Service details</p>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Booked at" value={fmtTime(booking.createdAt)} />
            {booking.confirmedAt && <Row label="Confirmed" value={fmtTime(booking.confirmedAt)} />}
            {booking.arrivedAt && <Row label="Partner arrived" value={fmtTime(booking.arrivedAt)} />}
            {booking.startedAt && <Row label="Service started" value={fmtTime(booking.startedAt)} />}
            {booking.completedAt && <Row label="Service ended" value={fmtTime(booking.completedAt)} />}
            {totalDuration && <Row label="Total duration" value={totalDuration} highlight />}
            <Row label="Partner" value={professional.name} />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span className="truncate text-muted-foreground">{booking.address}</span>
          </div>
        </div>

      {/* Preferences / notes — always visible */}
      {booking.preferences && (
        booking.preferences.notes?.trim() ||
        (booking.preferences.schedule && booking.preferences.schedule.length > 0)
      ) && (
        <div className="rounded-3xl bg-card p-5 shadow-soft animate-fade-in-up">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Preferences & notes
            </p>
          </div>
          {booking.preferences.notes?.trim() && (
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-secondary px-3 py-2 text-sm text-foreground">
              {booking.preferences.notes}
            </p>
          )}
          {booking.preferences.schedule && booking.preferences.schedule.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {booking.preferences.schedule.map((s, i) => (
                <li
                  key={`${s.label}-${i}`}
                  className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-foreground">{s.label}</span>
                  <span className="font-mono text-muted-foreground">{s.time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Service usage summary — shown only when completed */}
      {completed && (
        <div className="rounded-3xl bg-card p-5 shadow-soft animate-fade-in-up">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Service usage</p>
            {earlyFinish && extensionMin === 0 && (
              <span className="ml-auto rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                Early finish
              </span>
            )}
            {extensionMin > 0 && (
              <span className="ml-auto rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                +{extensionMin} min extension
              </span>
            )}
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Original duration" value={formatMinutes(plannedMin)} />
            <Row label="Actual time used" value={formatMinutes(actualMin)} highlight={earlyFinish} />
            {extensionMin > 0 && (
              <Row label="Extensions added" value={`+${formatMinutes(extensionMin)}`} />
            )}
            <Row label="Original amount" value={`₹${booking.service.price}`} />
            {extensionMin > 0 && (
              <Row label="Extension charges" value={`+₹${billing.extensionPortion}`} />
            )}
            {earlyFinish && billing.basePortion < booking.service.price && (
              <Row label="Prorated discount" value={`−₹${booking.service.price - billing.basePortion}`} highlight />
            )}
            <Row label="Final billed amount" value={`₹${finalTotal}`} highlight />
          </div>
        </div>
      )}

      {/* Favorite + Rebook — only after a successful completion, only for the
          customer (not the partner viewing their own job summary), and only
          when the partner is a known user (we don't favorite seed pros). */}
      {completed && booking.partnerUserId && booking.partnerUserId !== user?.id && (() => {
        const partnerId = booking.partnerUserId;
        const alreadyFav = isFavorite(partnerId);
        const partnerName = professional.name;
        const limitReached = !alreadyFav && favoritesCount >= FAVORITES_LIMIT;
        return (
          <div className="rounded-3xl bg-card p-5 shadow-card animate-fade-in-up">
            <div className="flex items-center gap-2">
              <Heart className={cn("h-4 w-4", alreadyFav ? "fill-destructive text-destructive" : "text-destructive")} />
              <p className="text-sm font-bold text-foreground">
                {alreadyFav
                  ? `${partnerName} is in your favorites`
                  : `Liked ${partnerName}'s service?`}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {alreadyFav
                ? "They'll be matched first on your next booking, and you can send them direct requests."
                : "Add to Favorites for priority matching next time, or send them a direct request anytime."}
            </p>
            {limitReached && !alreadyFav && (
              <p className="mt-2 rounded-lg bg-warning/10 px-3 py-2 text-[11px] font-medium text-warning">
                Favorites are capped at {FAVORITES_LIMIT}. Remove someone from your list to make room.
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (alreadyFav) return;
                  const result = addFavorite({
                    partnerId,
                    partnerName,
                    partnerAvatarUrl: professional.avatarUrl,
                    lastBookingId: booking.id,
                  });
                  if (result.ok) {
                    push({ kind: "success", title: "Added to favorites", body: partnerName });
                  } else {
                    push({ kind: "warning", title: "Couldn't add favorite", body: result.reason });
                  }
                }}
                disabled={alreadyFav || limitReached}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-smooth disabled:cursor-not-allowed",
                  alreadyFav
                    ? "bg-destructive/10 text-destructive disabled:opacity-100"
                    : "gradient-primary text-primary-foreground shadow-soft disabled:opacity-50",
                )}
              >
                <Heart className={cn("h-3.5 w-3.5", alreadyFav && "fill-current")} />
                {alreadyFav ? "In favorites" : "Add to favorites"}
              </button>
              <button
                type="button"
                onClick={() => navigate({ name: "booking-flow", serviceId: booking.service.id })}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-foreground transition-smooth hover:bg-secondary"
              >
                <Calendar className="h-3.5 w-3.5" /> Rebook
              </button>
            </div>
          </div>
        );
      })()}

      {/* Payment — service is done, collect now */}
      {completed && (
        <div className="rounded-3xl bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment</p>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Amount due" value={`₹${finalTotal}`} highlight />
            <Row label="Method" value={booking.paymentMethod ?? "—"} />
            <Row
              label="Status"
              value={paid ? "Paid" : refunded ? "Refunded" : codish ? "Cash on completion" : "Pending"}
              highlight={paid}
              danger={!paid && !refunded && !codish}
            />
          </div>
          {showPay && (
            <button
              onClick={handlePay}
              disabled={paying}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
            >
              <CreditCard className="h-4 w-4" /> {paying ? "Opening payment…" : `Pay ₹${finalTotal}`}
            </button>
          )}
        </div>
      )}

      {/* Rating — once service completed */}
      {completed && (
      <div className="rounded-3xl bg-card p-5 shadow-card animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground">
            {professional.avatar}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold">{professional.name}</p>
            <p className="text-xs text-muted-foreground">How was your service?</p>
          </div>
        </div>

        {booking.rated ? (
          <div className="mt-4 rounded-xl bg-success/10 p-3 text-center text-xs text-success">
            ⭐ You rated this booking {booking.rating ?? "—"} / 5
          </div>
        ) : (
          <>
            <div className="mt-4 flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  aria-label={`${n} stars`}
                  className="p-1 transition-bounce"
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-smooth",
                      (hover || rating) >= n
                        ? "fill-warning text-warning scale-110"
                        : "text-muted-foreground",
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              {rating === 0 ? "Tap to rate" : ["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
            </p>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us more (optional)…"
              rows={3}
              className="mt-4 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />

            {ratingError && (
              <p className="mt-2 text-center text-xs font-medium text-destructive">Please select a star rating first</p>
            )}
            <button
              onClick={submitRating}
              disabled={submitting}
              className="mt-4 w-full rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit feedback"}
            </button>
          </>
        )}
      </div>
      )}
    </div>
  );
};

const Row = ({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span
      className={cn(
        "font-semibold",
        highlight ? "text-success" : danger ? "text-warning" : "text-foreground",
      )}
    >
      {value}
    </span>
  </div>
);