import { ArrowLeft, ShieldCheck, KeyRound, Copy } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props { bookingId: string; }

export const PartnerOtpView = ({ bookingId }: Props) => {
  const { navigate, bookings } = useApp();
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return null;
  const otp = booking.startOtp ?? "----";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(otp);
      toast.success("OTP copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="-mt-5 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "live-status", bookingId: booking.id })}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

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
    </div>
  );
};
