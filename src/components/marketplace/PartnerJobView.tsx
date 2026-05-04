import { useState } from "react";
import { ArrowLeft, KeyRound, MapPin, Phone, MessageCircle, Calendar, Zap, Clock, User as UserIcon, Copy, Navigation, AlertTriangle, XCircle } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Props { bookingId: string; }

export const PartnerJobView = ({ bookingId }: Props) => {
  const { bookings, navigate, cancelBooking } = useApp();
  const { user } = useAuth();
  const [cancelling, setCancelling] = useState(false);
  const realBooking = bookings.find((b) => b.id === bookingId);

  // Fallback: synthetic booking from a sample request stored in sessionStorage
  let booking = realBooking
    ? {
        id: realBooking.id,
        type: realBooking.type,
        serviceName: realBooking.service.name,
        scheduledAt: realBooking.scheduledAt,
        address: realBooking.address,
        customerName: "Customer",
        price: realBooking.service.price,
        startOtp: realBooking.startOtp ?? "----",
      }
    : null;

  if (!booking) {
    try {
      const raw = sessionStorage.getItem(`partner-job-${bookingId}`);
      if (raw) {
        const j = JSON.parse(raw);
        booking = {
          id: j.id,
          type: j.type,
          serviceName: j.serviceName,
          scheduledAt: j.scheduledAt ? new Date(j.scheduledAt) : undefined,
          address: j.address,
          customerName: j.customerName ?? "Customer",
          price: j.price ?? 0,
          startOtp: j.startOtp ?? "----",
        };
      }
    } catch {
      // ignore
    }
  }

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

  // Partner-side cancellation fine (deducted from earnings ledger).
  // Higher fine if the partner already started the job vs. just accepted.
  const inProgress = realBooking?.status === "in-progress";
  const partnerFine = inProgress ? 200 : 100;

  const handlePartnerCancel = async () => {
    if (!realBooking) return;
    const reason = window.prompt(
      `Cancel this job?\n\nA fine of ₹${partnerFine} will be deducted from your earnings.\n\nOptional reason:`,
      "",
    );
    if (reason === null) return; // user dismissed
    setCancelling(true);
    try {
      cancelBooking(realBooking.id, reason || "Partner cancelled", 0);
      if (user) {
        // Record the fine as a negative-amount entry in partner_earnings so
        // it shows up in the credit account history and reduces totals.
        const { error } = await supabase.from("partner_earnings").insert({
          partner_id: user.id,
          booking_id: realBooking.id,
          service_name: `Cancellation fine — ${realBooking.service.name}`,
          amount: -Math.abs(partnerFine),
          earned_at: new Date().toISOString(),
        });
        if (error) console.error("Failed to record partner fine", error);
      }
      navigate({ name: "partner-dashboard" });
    } finally {
      setCancelling(false);
    }
  };

  const copyOtp = async () => {
    try {
      await navigator.clipboard.writeText(otp);
    } catch {
      // clipboard unavailable — OTP is visible on screen
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
            <h2 className="text-base font-bold text-foreground">{booking.serviceName}</h2>
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
              <UserIcon className="h-3.5 w-3.5 text-primary" /> {booking.customerName}
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
            <span className="font-bold text-success">₹{booking.price}</span>
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
          onClick={() => navigate({ name: "chat", bookingId: booking!.id })}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-xs font-semibold text-foreground"
        >
          <MessageCircle className="h-3.5 w-3.5" /> Chat
        </button>
      </div>

      {/* Open in Google Maps for navigation */}
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.address)}&travelmode=driving`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated transition-bounce active:scale-[0.99]"
      >
        <Navigation className="h-4 w-4" /> Navigate in Google Maps
      </a>
      <p className="text-center text-[10px] text-muted-foreground">
        Opens turn-by-turn directions to the customer's address.
      </p>

      {/* Partner cancellation with fine */}
      {realBooking && (realBooking.status === "confirmed" || realBooking.status === "in-progress") && (
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-xs font-bold uppercase tracking-wider text-destructive">
              Cancel this job
            </p>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Cancelling now will deduct{" "}
            <span className="font-bold text-destructive">₹{partnerFine}</span> from your
            earnings ledger{inProgress ? " (service already started)" : ""}.
          </p>
          <button
            onClick={handlePartnerCancel}
            disabled={cancelling}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-card py-2.5 text-xs font-bold text-destructive transition-smooth hover:bg-destructive/5 disabled:opacity-60"
          >
            <XCircle className="h-3.5 w-3.5" />
            {cancelling ? "Cancelling…" : `Cancel job (₹${partnerFine} fine)`}
          </button>
        </div>
      )}
    </div>
  );
};