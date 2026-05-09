import { ArrowLeft, ShieldCheck, KeyRound, Copy, CalendarClock } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";

interface Props { bookingId: string; }

export const PartnerOtpView = ({ bookingId }: Props) => {
  const { navigate, bookings } = useApp();
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return null;
  const otp = booking.startOtp ?? "----";
  const notYet = booking.type === "scheduled" && !!booking.scheduledAt && Date.now() < booking.scheduledAt.getTime() - 15 * 60_000;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(otp);
    } catch {
      // clipboard unavailable — OTP is visible on screen
    }
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
              The OTP will be available at
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
        <div className="rounded-3xl bg-card p-6 shadow-card">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-glow">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h2 className="mt-3 text-lg font-bold">Share start OTP</h2>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              Read this 4-digit OTP to the customer for{" "}
              <span className="font-semibold text-foreground">{booking.service.name}</span>. The
              customer enters it on their app to start the service & timer.
            </p>
          </div>

          <div className="mt-6 rounded-2xl bg-secondary py-6 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <KeyRound className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Booking OTP</span>
            </div>
            <p className="mt-3 text-4xl font-bold tracking-[0.4em] tabular-nums text-foreground">
              {otp}
            </p>
          </div>

          <Button onClick={copy} className="mt-6 w-full" variant="outline">
            <Copy className="h-4 w-4 mr-2" /> Copy OTP
          </Button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Status will update automatically once the customer enters this OTP.
          </p>
        </div>
      )}
    </div>
  );
};
