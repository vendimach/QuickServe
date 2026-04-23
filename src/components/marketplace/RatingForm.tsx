import { useState } from "react";
import { Star, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useMarketplaceData } from "@/contexts/MarketplaceDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";

interface Props {
  bookingId: string;
}

const TAGS = ["Punctual", "Polite", "Caring", "Skilled", "Friendly", "Thorough"];

export const RatingForm = ({ bookingId }: Props) => {
  const { bookings, navigate, markRated } = useApp();
  const { addReview } = useMarketplaceData();
  const { profile } = useAuth();
  const { push } = useNotifications();
  const booking = bookings.find((b) => b.id === bookingId);

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  if (!booking || !booking.professional) return null;

  const submit = () => {
    if (rating < 1) {
      push({ kind: "warning", title: "Please pick a star rating" });
      return;
    }
    addReview({
      professionalId: booking.professional!.id,
      bookingId: booking.id,
      rating,
      comment: comment.trim() || undefined,
      customerName: profile?.full_name?.split(" ")[0] ?? "You",
      tags,
    });
    markRated(booking.id);
    setDone(true);
    push({ kind: "success", title: "Thanks for your feedback!" });
    setTimeout(() => navigate({ name: "bookings" }), 1200);
  };

  if (done) {
    return (
      <div className="-mt-5 px-5 pb-6">
        <div className="rounded-3xl bg-card p-8 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">Feedback submitted</h2>
          <p className="mt-1 text-sm text-muted-foreground">Helping others find great pros 🙌</p>
        </div>
      </div>
    );
  }

  return (
    <div className="-mt-5 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "bookings" })}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="rounded-3xl bg-card p-5 shadow-card">
        <p className="text-xs text-muted-foreground">Rate your experience</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground">
            {booking.professional.avatar}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{booking.professional.name}</p>
            <p className="text-xs text-muted-foreground">{booking.service.name}</p>
          </div>
        </div>

        <div className="mt-5 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              aria-label={`${n} stars`}
              className="p-1 transition-bounce"
            >
              <Star
                className={cn(
                  "h-9 w-9 transition-smooth",
                  (hover || rating) >= n
                    ? "fill-warning text-warning scale-110"
                    : "text-muted-foreground",
                )}
              />
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {rating === 0 ? "Tap to rate" : ["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
        </p>

        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">What stood out?</p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => {
              const on = tags.includes(t);
              return (
                <button
                  key={t}
                  onClick={() =>
                    setTags((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]))
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-smooth",
                    on
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Add a comment</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience…"
            rows={4}
            className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <button
          onClick={submit}
          className="mt-5 w-full rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-elevated transition-bounce active:scale-[0.98]"
        >
          Submit Feedback
        </button>
      </div>
    </div>
  );
};