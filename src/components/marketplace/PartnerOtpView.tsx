import { useState } from "react";
import { ArrowLeft, ShieldCheck, KeyRound } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props { bookingId: string; }

export const PartnerOtpView = ({ bookingId }: Props) => {
  const { navigate, bookings, partnerStartService } = useApp();
  const booking = bookings.find((b) => b.id === bookingId);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  if (!booking) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 4) return toast.error("Enter 4-digit OTP");
    setVerifying(true);
    const ok = partnerStartService(booking.id, otp);
    setVerifying(false);
    if (!ok) return toast.error("Wrong OTP. Ask the customer to share again.");
    toast.success("OTP verified — service started");
    navigate({ name: "live-status", bookingId: booking.id });
  };

  return (
    <div className="-mt-5 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "live-status", bookingId: booking.id })}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <form onSubmit={submit} className="rounded-3xl bg-card p-6 shadow-card">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-glow">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="mt-3 text-lg font-bold">Verify start OTP</h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            Ask <span className="font-semibold text-foreground">{booking.service.name}</span> customer to share the 4-digit OTP. Service can't begin without it.
          </p>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              className="max-w-[140px] text-center text-2xl font-bold tracking-[0.5em]"
            />
          </div>
        </div>

        <Button type="submit" className="mt-6 w-full" disabled={verifying || otp.length !== 4}>
          {verifying ? "Verifying…" : "Start service"}
        </Button>
      </form>
    </div>
  );
};
