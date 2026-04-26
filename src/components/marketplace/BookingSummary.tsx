import { useState } from "react";
import { CheckCircle2, Clock, MapPin, Star, CreditCard, Receipt, ArrowLeft } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMarketplaceData } from "@/contexts/MarketplaceDataContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { payWithRazorpay } from "@/lib/razorpay";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const { bookings, navigate, saveRating } = useApp();
  const { addReview } = useMarketplaceData();
  const { profile, user } = useAuth();
  const { push } = useNotifications();
  const booking = bookings.find((b) => b.id === bookingId);

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [paying, setPaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!booking || !booking.professional) return null;

  const totalDuration = durationMs(booking.startedAt, booking.completedAt);
  const paid = booking.paymentStatus === "paid";
  const refunded = booking.paymentStatus === "refunded";
  const codish = (booking.paymentMethod ?? "").toLowerCase() === "cod";
  const showPay = !paid && !refunded && !codish;

  const handlePay = async () => {
    setPaying(true);
    const res = await payWithRazorpay({
      amount: booking.service.price,
      bookingId: booking.id,
      customerName: profile?.full_name,
      customerEmail: user?.email ?? undefined,
      customerContact: profile?.mobile,
      description: booking.service.name,
    });
    setPaying(false);
    if (res.paid) toast.success("Payment successful");
    else toast.error(res.reason ?? "Payment failed");
  };

  const submitRating = async () => {
    if (booking.rated) {
      navigate({ name: "bookings" }, { replace: true });
      return;
    }
    if (rating < 1) {
      toast.error("Pick a star rating first");
      return;
    }
    setSubmitting(true);
    addReview({
      professionalId: booking.professional!.id,
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
    <div className="-mt-5 px-5 pb-6 space-y-4">
      <button
        onClick={() => navigate({ name: "bookings" }, { replace: true })}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to bookings
      </button>

      {/* Hero */}
      <div className="rounded-3xl bg-card p-6 text-center shadow-card animate-fade-in-up">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="mt-3 text-lg font-bold">Service completed</h2>
        <p className="mt-1 text-xs text-muted-foreground">{booking.service.name}</p>
      </div>

      {/* Timings */}
      <div className="rounded-3xl bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Timings</p>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <Row label="Booked at" value={fmtTime(booking.createdAt)} />
          {booking.confirmedAt && <Row label="Confirmed" value={fmtTime(booking.confirmedAt)} />}
          {booking.arrivedAt && <Row label="Partner arrived" value={fmtTime(booking.arrivedAt)} />}
          {booking.startedAt && <Row label="Service started" value={fmtTime(booking.startedAt)} />}
          {booking.completedAt && <Row label="Service ended" value={fmtTime(booking.completedAt)} />}
          {totalDuration && (
            <Row label="Total duration" value={totalDuration} highlight />
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span className="truncate text-muted-foreground">{booking.address}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="rounded-3xl bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment</p>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <Row label="Amount" value={`₹${booking.service.price}`} />
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
            <CreditCard className="h-4 w-4" /> {paying ? "Opening payment…" : `Pay ₹${booking.service.price}`}
          </button>
        )}
      </div>

      {/* Rating */}
      <div className="rounded-3xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground">
            {booking.professional.avatar}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold">{booking.professional.name}</p>
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