import { ArrowLeft, KeyRound, MapPin, Phone, MessageCircle, Calendar, Zap, Clock, User as UserIcon, Copy } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";

interface Props { bookingId: string; }

export const PartnerJobView = ({ bookingId }: Props) => {
  const { bookings, navigate } = useApp();
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) {
    return (
      <div className="px-5 pb-6">
        <button
          onClick={() => navigate({ name: "partner-dashboard" })}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
          Job not found.
        </div>
      </div>
    );
  }

  const isInstant = booking.type === "instant";
  const otp = booking.startOtp ?? "----";

  const copyOtp = async () => {
    try {
      await navigator.clipboard.writeText(otp);
      toast.success("OTP copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="space-y-4 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "partner-dashboard" })}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
      </button>

      <div className="rounded-3xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              isInstant ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
            }`}
          >
            {isInstant ? <Zap className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {isInstant ? "Instant Job" : "Scheduled Job"}
            </p>
            <h2 className="text-base font-bold text-foreground">{booking.service.name}</h2>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {!isInstant && booking.scheduledAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">When</span>
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {booking.scheduledAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Customer</span>
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <UserIcon className="h-3.5 w-3.5 text-primary" /> Customer
            </span>
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-border pt-2">
            <span className="text-muted-foreground">Address</span>
            <span className="flex items-start gap-1 text-right font-semibold text-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="line-clamp-2">{booking.address}</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Service fee</span>
            <span className="font-bold text-success">₹{booking.service.price}</span>
          </div>
        </div>
      </div>

      {/* OTP card */}
      <div className="rounded-3xl bg-primary/5 border border-primary/20 p-5 shadow-card">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Start OTP</p>
            <p className="text-[11px] text-muted-foreground">Share this with the customer to start the timer</p>
          </div>
        </div>
        <p className="mt-4 text-center text-4xl font-bold tracking-[0.4em] tabular-nums text-foreground">
          {otp}
        </p>
        <button
          onClick={copyOtp}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-card py-2.5 text-xs font-bold text-foreground shadow-soft border border-border"
        >
          <Copy className="h-3.5 w-3.5" /> Copy OTP
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2.5 text-xs font-semibold text-primary">
          <Phone className="h-3.5 w-3.5" /> Call customer
        </button>
        <button
          onClick={() => navigate({ name: "chat", bookingId: booking.id })}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-xs font-semibold text-foreground"
        >
          <MessageCircle className="h-3.5 w-3.5" /> Chat
        </button>
      </div>
    </div>
  );
};