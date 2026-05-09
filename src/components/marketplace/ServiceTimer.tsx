import { useEffect, useMemo, useRef, useState } from "react";
import {
  Timer, Clock, Plus, CheckCircle2, XCircle, Send, Loader2, X, MessageSquare,
} from "lucide-react";
import type { Booking } from "@/types";
import { useApp } from "@/contexts/AppContext";
import {
  EXTENSION_OPTIONS_MIN,
  extensionCost,
  formatMinutes,
  parseDurationToMinutes,
} from "@/lib/bookingTimer";
import { cn } from "@/lib/utils";

interface Props {
  booking: Booking;
  onAutoComplete?: () => void;
}

const fmt = (totalMs: number) => {
  const safe = Math.max(0, totalMs);
  const h = Math.floor(safe / 3_600_000);
  const m = Math.floor((safe % 3_600_000) / 60_000);
  const s = Math.floor((safe % 60_000) / 1_000);
  return h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/**
 * Live timer card. Used on both the customer (LiveStatus) and partner
 * (PartnerJobView) views — drives the same numbers from a single helper.
 *
 * Auto-completes the booking once the planned end time elapses. Both sides
 * fire `completeBooking`; the second call is a harmless no-op because the
 * status check at the call site short-circuits.
 */
export const ServiceTimer = ({ booking, onAutoComplete }: Props) => {
  const { completeBooking } = useApp();
  const [now, setNow] = useState(Date.now());
  const autoCompletedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startedAt = booking.startedAt;
  const plannedMinutes =
    booking.plannedDurationMinutes ?? parseDurationToMinutes(booking.service.duration, 60);
  const extensionMinutes = booking.extensionMinutes ?? 0;
  const totalMinutes = plannedMinutes + extensionMinutes;
  const plannedEnd =
    booking.plannedEndTime ??
    (startedAt ? new Date(startedAt.getTime() + totalMinutes * 60_000) : null);

  const elapsedMs = startedAt ? now - startedAt.getTime() : 0;
  const remainingMs = plannedEnd ? plannedEnd.getTime() - now : 0;
  const elapsedMinutes = Math.max(0, Math.round(elapsedMs / 60_000));
  const progress = Math.min(100, Math.round((elapsedMs / (totalMinutes * 60_000)) * 100));
  const overrun = remainingMs <= 0;

  // Auto-complete when planned end time is reached. Guarded with a ref so we
  // only fire once per mount even if the interval ticks again before the
  // status update propagates.
  useEffect(() => {
    if (booking.status !== "in-progress") return;
    if (!overrun) return;
    if (autoCompletedRef.current) return;
    autoCompletedRef.current = true;
    console.log("[booking/timer] auto-complete fired", { bookingId: booking.id, elapsedMinutes });
    completeBooking(booking.id);
    onAutoComplete?.();
  }, [booking.status, booking.id, overrun, completeBooking, elapsedMinutes, onAutoComplete]);

  return (
    <div className="rounded-3xl gradient-primary p-5 shadow-elevated animate-fade-in-up">
      <div className="flex items-center gap-2 text-primary-foreground/85">
        <Timer className="h-4 w-4" />
        <p className="text-xs font-bold uppercase tracking-wider">Service in progress</p>
        {booking.extensionMinutes && booking.extensionMinutes > 0 ? (
          <span className="ml-auto rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-bold uppercase">
            +{booking.extensionMinutes} min extension
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-center text-5xl font-bold tabular-nums tracking-tight text-primary-foreground">
        {fmt(elapsedMs)}
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-primary-foreground/20">
        <div
          className="h-full bg-primary-foreground transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-primary-foreground/85">
        <span>Elapsed {formatMinutes(elapsedMinutes)} of {formatMinutes(totalMinutes)}</span>
        <span>
          {overrun
            ? "Wrapping up…"
            : `Ends in ${fmt(remainingMs)}`}
        </span>
      </div>
    </div>
  );
};

// ── Customer-side extension request panel ────────────────────────────────

interface CustomerExtensionPanelProps {
  booking: Booking;
}

export const CustomerExtensionPanel = ({ booking }: CustomerExtensionPanelProps) => {
  const { requestExtension } = useApp();
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState<number>(EXTENSION_OPTIONS_MIN[1]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = booking.extensionStatus ?? "none";
  const planned = booking.plannedDurationMinutes ?? parseDurationToMinutes(booking.service.duration, 60);
  const cost = useMemo(
    () => extensionCost(booking.service.price, planned, minutes),
    [booking.service.price, planned, minutes],
  );

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await requestExtension(booking.id, minutes, message.trim() || undefined);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.reason ?? "Couldn't send extension request");
      return;
    }
    setOpen(false);
    setMessage("");
  };

  if (booking.status !== "in-progress") return null;

  // Pending state — the dropdown/textarea are gone; show "Sent".
  if (status === "pending") {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 shadow-soft">
        <div className="flex items-center gap-2 text-warning">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-sm font-bold">Extension Request Sent</p>
        </div>
        <p className="mt-1 text-xs text-warning/85">
          Asked for +{booking.extensionRequestMinutes} min · waiting on the partner.
        </p>
      </div>
    );
  }

  // Accepted state — green "Accepted" with summary.
  if (status === "accepted") {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 p-4 shadow-soft">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-4 w-4" />
          <p className="text-sm font-bold">Extension Accepted</p>
        </div>
        <p className="mt-1 text-xs text-success/85">
          Total extension so far: +{booking.extensionMinutes ?? 0} min · ₹{booking.extensionCharges ?? 0}.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-soft hover:bg-secondary"
        >
          <Plus className="h-3 w-3" /> Request more time
        </button>
        {open && (
          <ExtensionForm
            minutes={minutes}
            setMinutes={setMinutes}
            message={message}
            setMessage={setMessage}
            cost={cost}
            error={error}
            submitting={submitting}
            onCancel={() => { setOpen(false); setError(null); }}
            onSubmit={submit}
          />
        )}
      </div>
    );
  }

  // Declined state — red, with a "try again" CTA.
  if (status === "declined") {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 shadow-soft">
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="h-4 w-4" />
          <p className="text-sm font-bold">Extension Declined</p>
        </div>
        <p className="mt-1 text-xs text-destructive/85">
          The partner can't extend right now. The original timer is unchanged.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-soft hover:bg-secondary"
        >
          <Plus className="h-3 w-3" /> Try a different duration
        </button>
        {open && (
          <ExtensionForm
            minutes={minutes}
            setMinutes={setMinutes}
            message={message}
            setMessage={setMessage}
            cost={cost}
            error={error}
            submitting={submitting}
            onCancel={() => { setOpen(false); setError(null); }}
            onSubmit={submit}
          />
        )}
      </div>
    );
  }

  // Idle — show the "Extend Time" CTA / form.
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold text-foreground">Need more time?</p>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Request additional service time. Extra time is billed at 2× the per-minute rate.
      </p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-soft"
        >
          <Plus className="h-3.5 w-3.5" /> Extend time
        </button>
      ) : (
        <ExtensionForm
          minutes={minutes}
          setMinutes={setMinutes}
          message={message}
          setMessage={setMessage}
          cost={cost}
          error={error}
          submitting={submitting}
          onCancel={() => { setOpen(false); setError(null); }}
          onSubmit={submit}
        />
      )}
    </div>
  );
};

interface ExtensionFormProps {
  minutes: number;
  setMinutes: (m: number) => void;
  message: string;
  setMessage: (m: string) => void;
  cost: number;
  error: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

const ExtensionForm = ({
  minutes, setMinutes, message, setMessage, cost, error, submitting, onCancel, onSubmit,
}: ExtensionFormProps) => (
  <div className="mt-3 space-y-3 rounded-xl border border-border bg-card p-3">
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Additional time
      </label>
      <select
        value={minutes}
        onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
        disabled={submitting}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {EXTENSION_OPTIONS_MIN.map((m) => (
          <option key={m} value={m}>{formatMinutes(m)} (+₹{cost && minutes === m ? cost : Math.round(cost * (m / minutes))})</option>
        ))}
      </select>
    </div>
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <MessageSquare className="h-3 w-3" /> Note for the partner (optional)
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={submitting}
        rows={2}
        maxLength={240}
        placeholder="e.g. Can you stay an extra hour to finish the deep clean?"
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
    <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
      <span className="text-[11px] font-semibold text-muted-foreground">Extra charge</span>
      <span className="text-sm font-extrabold text-primary">₹{cost}</span>
    </div>
    {error && (
      <p className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">{error}</p>
    )}
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="flex-1 rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
      >
        <X className="mr-1 inline h-3.5 w-3.5" /> Cancel
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="flex-1 rounded-xl gradient-primary py-2 text-xs font-bold text-primary-foreground shadow-soft disabled:opacity-60"
      >
        {submitting ? (
          <><Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" /> Sending…</>
        ) : (
          <><Send className="mr-1 inline h-3.5 w-3.5" /> Send request</>
        )}
      </button>
    </div>
  </div>
);

// ── Partner-side extension response panel ────────────────────────────────

interface PartnerExtensionPanelProps {
  booking: Booking;
}

export const PartnerExtensionPanel = ({ booking }: PartnerExtensionPanelProps) => {
  const { respondToExtension } = useApp();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);

  if (booking.status !== "in-progress") return null;
  const status = booking.extensionStatus ?? "none";
  if (status !== "pending") return null;

  const minutes = booking.extensionRequestMinutes ?? 0;
  const planned = booking.plannedDurationMinutes ?? parseDurationToMinutes(booking.service.duration, 60);
  const earnings = extensionCost(booking.service.price, planned, minutes);

  const respond = async (decision: "accept" | "decline") => {
    setBusy(decision);
    try {
      await respondToExtension(booking.id, decision);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 shadow-card animate-fade-in-up">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-warning" />
        <p className="text-sm font-bold text-foreground">Extension request</p>
        <span className="ml-auto rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning-foreground">
          New
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-card px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Extra time</p>
          <p className="text-base font-extrabold text-foreground">+{formatMinutes(minutes)}</p>
        </div>
        <div className="rounded-lg bg-card px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Extra earnings</p>
          <p className="text-base font-extrabold text-success">+₹{earnings}</p>
        </div>
      </div>
      {booking.extensionRequestMessage && (
        <div className="mt-2 rounded-lg bg-card px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> Customer note
          </p>
          <p className="mt-0.5 text-xs italic text-foreground">{booking.extensionRequestMessage}</p>
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => respond("decline")}
          disabled={busy != null}
          className={cn(
            "flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-smooth hover:bg-secondary disabled:opacity-50",
          )}
        >
          {busy === "decline" ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Declining…</>
          ) : (
            <><XCircle className="h-3.5 w-3.5" /> Decline</>
          )}
        </button>
        <button
          type="button"
          onClick={() => respond("accept")}
          disabled={busy != null}
          className="flex items-center justify-center gap-1 rounded-xl gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-soft transition-bounce active:scale-95 disabled:opacity-60"
        >
          {busy === "accept" ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Accepting…</>
          ) : (
            <><CheckCircle2 className="h-3.5 w-3.5" /> Accept</>
          )}
        </button>
      </div>
    </div>
  );
};
