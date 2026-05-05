import { useEffect, useState } from "react";
import {
  ArrowLeft, MapPin, Phone, MessageCircle, Calendar, Zap, Clock,
  User as UserIcon, AlertTriangle, XCircle, CheckCircle2, Timer, Loader2,
  KeyRound, Copy,
} from "lucide-react";

import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props { bookingId: string; }

function useElapsed(startedAt: Date | undefined): string {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!startedAt) return "00:00";
  const ms = Math.max(0, now - startedAt.getTime());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const PartnerJobView = ({ bookingId }: Props) => {
  const { bookings, navigate, cancelBooking, completeBooking } = useApp();
  const { user } = useAuth();
  const [cancelling, setCancelling] = useState(false);
  const [completing, setCompleting] = useState(false);

  const realBooking = bookings.find((b) => b.id === bookingId);

  // Derive display data from booking or sessionStorage fallback
  interface JobData {
    id: string;
    type: "instant" | "scheduled";
    serviceName: string;
    serviceDuration: string;
    scheduledAt: Date | undefined;
    address: string;
    customerName: string;
    price: number;
  }

  let job: JobData | null = realBooking
    ? {
        id: realBooking.id,
        type: realBooking.type,
        serviceName: realBooking.service.name,
        serviceDuration: realBooking.service.duration,
        scheduledAt: realBooking.scheduledAt,
        address: realBooking.address,
        customerName: realBooking.professional?.name ?? "Customer",
        price: realBooking.service.price,
      }
    : null;

  if (!job) {
    try {
      const raw = sessionStorage.getItem(`partner-job-${bookingId}`);
      if (raw) {
        const j = JSON.parse(raw);
        job = {
          id: j.id,
          type: j.type,
          serviceName: j.serviceName,
          serviceDuration: j.serviceDuration ?? "—",
          scheduledAt: j.scheduledAt ? new Date(j.scheduledAt) : undefined,
          address: j.address,
          customerName: j.customerName ?? "Customer",
          price: j.price ?? 0,
        };
      }
    } catch { /* ignore */ }
  }

  const elapsed = useElapsed(realBooking?.startedAt);

  if (!job) {
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

  const status = realBooking?.status;
  const isInProgress = status === "in-progress";
  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled" || status === "refunded";
  const isInstant = job.type === "instant";
  const partnerFine = isInProgress ? 200 : 100;

  const handleCancel = async () => {
    if (!realBooking) return;
    const reason = window.prompt(
      `Cancel this job?\n\nA fine of ₹${partnerFine} will be deducted from your earnings.\n\nOptional reason:`,
      "",
    );
    if (reason === null) return;
    setCancelling(true);
    try {
      cancelBooking(realBooking.id, reason || "Partner cancelled", 0);
      if (user) {
        await supabase.from("partner_earnings").insert({
          partner_id: user.id,
          booking_id: realBooking.id,
          service_name: `Cancellation fine — ${realBooking.service.name}`,
          amount: -Math.abs(partnerFine),
          earned_at: new Date().toISOString(),
        });
      }
      // Don't navigate — reactive state will show the cancelled screen below
    } finally {
      setCancelling(false);
    }
  };

  const handleComplete = async () => {
    if (!realBooking) return;
    setCompleting(true);
    try {
      completeBooking(realBooking.id);
      // Record earnings
      if (user) {
        await supabase.from("partner_earnings").insert({
          partner_id: user.id,
          booking_id: realBooking.id,
          service_name: realBooking.service.name,
          amount: realBooking.service.price,
          customer_name: null,
          earned_at: new Date().toISOString(),
        }).then(() => {});
      }
      navigate({ name: "partner-job-complete", bookingId: realBooking.id });
    } finally {
      setCompleting(false);
    }
  };

  // Cancelled / refunded terminal state
  if (isCancelled) {
    return (
      <div className="px-5 pb-6">
        <button
          onClick={() => navigate({ name: "partner-dashboard" })}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </button>
        <div className="rounded-3xl bg-card p-6 text-center shadow-card animate-fade-in-up">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">Job Cancelled</h2>
          <p className="mt-1 text-sm text-muted-foreground">{job.serviceName}</p>
          {realBooking?.cancellationReason && (
            <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
              Reason: {realBooking.cancellationReason}
            </p>
          )}
          {(realBooking?.cancellationFee ?? 0) > 0 && (
            <p className="mt-2 text-xs text-destructive font-medium">
              Fine deducted: ₹{realBooking?.cancellationFee}
            </p>
          )}
          <button
            onClick={() => navigate({ name: "partner-dashboard" })}
            className="mt-5 w-full rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "partner-dashboard" })}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
      </button>

      {/* Job header card */}
      <div className="rounded-3xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            isInstant ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent",
          )}>
            {isInstant ? <Zap className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {isInstant ? "Instant Job" : "Scheduled Job"}
            </p>
            <h2 className="text-base font-bold text-foreground">{job.serviceName}</h2>
          </div>
          {isInProgress && (
            <span className="ml-auto rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-success">
              In Progress
            </span>
          )}
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {!isInstant && job.scheduledAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">When</span>
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {job.scheduledAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Customer</span>
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <UserIcon className="h-3.5 w-3.5 text-primary" /> {job.customerName}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-border pt-2">
            <span className="text-muted-foreground">Address</span>
            <span className="flex items-start gap-1 text-right font-semibold text-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="line-clamp-2">{job.address}</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Service fee</span>
            <span className="font-bold text-success">₹{job.price}</span>
          </div>
        </div>
      </div>

      {/* OTP display — shown until customer verifies (status moves to in-progress) */}
      {!isInProgress && !isCompleted && (
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Share this OTP with the customer</p>
              <p className="text-[11px] text-muted-foreground">
                Customer enters it on their app to start the service & timer
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-card py-5 text-center shadow-soft">
            <p className="text-5xl font-bold tracking-[0.4em] tabular-nums text-foreground">
              {realBooking?.startOtp ?? "----"}
            </p>
          </div>
          <button
            onClick={async () => {
              try { await navigator.clipboard.writeText(realBooking?.startOtp ?? ""); } catch { /* ignore */ }
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-card py-2.5 text-xs font-bold text-foreground shadow-soft border border-border"
          >
            <Copy className="h-3.5 w-3.5" /> Copy OTP
          </button>
        </div>
      )}

      {/* Live service timer — shown only when in-progress */}
      {isInProgress && (
        <div className="rounded-3xl gradient-primary p-5 shadow-elevated animate-fade-in-up">
          <div className="flex items-center gap-2 text-primary-foreground/80">
            <Timer className="h-4 w-4" />
            <p className="text-xs font-bold uppercase tracking-wider">Service in progress</p>
          </div>
          <p className="mt-3 text-center text-5xl font-bold tabular-nums tracking-tight text-primary-foreground">
            {elapsed}
          </p>
          <p className="mt-1.5 text-center text-xs text-primary-foreground/70">
            Estimated: {job.serviceDuration}
          </p>
        </div>
      )}

      {/* Communication buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2.5 text-xs font-semibold text-primary transition-smooth hover:bg-primary/15">
          <Phone className="h-3.5 w-3.5" /> Call customer
        </button>
        <button
          onClick={() => navigate({ name: "chat", bookingId: job!.id })}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-xs font-semibold text-foreground transition-smooth hover:bg-muted"
        >
          <MessageCircle className="h-3.5 w-3.5" /> Chat
        </button>
      </div>

      {/* Mark as completed — only when in-progress */}
      {isInProgress && (
        <button
          onClick={handleComplete}
          disabled={completing}
          className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-sm font-bold text-primary-foreground shadow-elevated transition-bounce active:scale-[0.98] disabled:opacity-70"
        >
          {completing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Completing…</>
          ) : (
            <><CheckCircle2 className="h-4 w-4" /> Mark as Completed</>
          )}
        </button>
      )}

      {/* Partner cancellation */}
      {realBooking && (status === "confirmed" || status === "in-progress") && (
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-xs font-bold uppercase tracking-wider text-destructive">Cancel this job</p>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Cancelling now will deduct{" "}
            <span className="font-bold text-destructive">₹{partnerFine}</span> from your
            earnings{isInProgress ? " (service already started)" : ""}.
          </p>
          <button
            onClick={handleCancel}
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
