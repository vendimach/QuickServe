import { useState } from "react";
import { ArrowLeft, KeyRound, CalendarClock } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface Props { bookingId: string; }

export const PartnerOtpView = ({ bookingId }: Props) => {
  const { navigate, bookings, partnerStartService } = useApp();
  const booking = bookings.find((b) => b.id === bookingId);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");

  if (!booking) return null;
  const notYet = booking.type === "scheduled" && !!booking.scheduledAt && Date.now() < booking.scheduledAt.getTime() - 15 * 60_000;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    if (otpInput.length !== 4) return;
    const ok = partnerStartService(booking.id, otpInput);
    if (!ok) {
      setOtpError("Wrong OTP — ask the customer for the correct code.");
      return;
    }
    setOtpInput("");
    navigate({ name: "partner-job", bookingId: booking.id });
  };

  return (
    <div className="px-5 pb-6">
      <button
        onClick={() => navigate({ name: "partner-job", bookingId: booking.id })}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      {notYet ? (
        <div className="rounded-3xl bg-card p-6 shadow-card">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <CalendarClock className="h-7 w-7" />
            </div>
            <h2 className="mt-3 text-lg font-bold">Not started yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              OTP entry opens at
            </p>
            <p className="mt-1 text-sm font-bold text-foreground">
              {new Date(booking.scheduledAt!.getTime() - 15 * 60_000).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <p className="mt-3 text-xs text-muted-foreground max-w-xs">
              Head to the customer's location a few minutes before the scheduled start.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-3xl bg-card p-6 shadow-card">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-glow">
              <KeyRound className="h-7 w-7" />
            </div>
            <h2 className="mt-3 text-lg font-bold">Enter customer's OTP</h2>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              Ask the customer for their 4-digit OTP for{" "}
              <span className="font-semibold text-foreground">{booking.service.name}</span> to start
              the service &amp; timer.
            </p>
          </div>

          <input
            value={otpInput}
            onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 4)); setOtpError(""); }}
            inputMode="numeric"
            maxLength={4}
            placeholder="0000"
            className={`mt-6 w-full rounded-xl border bg-secondary px-4 py-4 text-center text-3xl font-bold tracking-[0.5em] tabular-nums text-foreground placeholder:text-muted-foreground focus:outline-none ${otpError ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"}`}
          />
          {otpError && (
            <p className="mt-2 text-center text-xs font-medium text-destructive">{otpError}</p>
          )}

          <button
            type="submit"
            disabled={otpInput.length !== 4}
            className="mt-4 w-full rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
          >
            Start service &amp; timer
          </button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Status updates automatically once the OTP is verified.
          </p>
        </form>
      )}
    </div>
  );
};
