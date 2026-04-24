import { useState } from "react";
import { ArrowLeft, CreditCard, Wallet, Banknote, CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  bookingId: string;
}

const methods = [
  { id: "upi", label: "UPI", icon: Wallet, sub: "Google Pay, PhonePe, Paytm" },
  { id: "card", label: "Card", icon: CreditCard, sub: "Credit / Debit" },
  { id: "cash", label: "Cash", icon: Banknote, sub: "Pay partner directly" },
] as const;

export const PaymentScreen = ({ bookingId }: Props) => {
  const { bookings, navigate } = useApp();
  const { user } = useAuth();
  const { push } = useNotifications();
  const booking = bookings.find((b) => b.id === bookingId);
  const [method, setMethod] = useState<string>("upi");
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [refunding, setRefunding] = useState(false);

  if (!booking) return null;
  const amount = booking.service.price;

  const writePayment = async (status: "paid" | "refunded") => {
    if (!user) return;
    // Try persisting; fail silently if booking not in DB yet
    await supabase.from("payments").insert({
      booking_id: bookingId,
      user_id: user.id,
      amount,
      method,
      status,
      transaction_ref: `TXN${Date.now()}`,
    });
    await supabase
      .from("bookings")
      .update({
        payment_status: status,
        payment_method: method,
        refund_status: status === "refunded" ? "refunded" : null,
      })
      .eq("id", bookingId);
  };

  const handlePay = async () => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1200));
    try {
      await writePayment("paid");
    } catch {
      /* ignore - booking may not be persisted */
    }
    setProcessing(false);
    setPaid(true);
    push({ kind: "success", title: "Payment successful", body: `₹${amount} paid via ${method.toUpperCase()}` });
  };

  const handleRefund = async () => {
    if (!confirm(`Request a refund of ₹${amount}? We'll process it within 5-7 days.`)) return;
    setRefunding(true);
    await new Promise((r) => setTimeout(r, 1000));
    try {
      await writePayment("refunded");
    } catch {
      /* ignore */
    }
    setRefunding(false);
    push({ kind: "success", title: "Refund requested", body: "₹" + amount + " will be credited soon" });
    navigate({ name: "bookings" });
  };

  return (
    <div className="-mt-5 space-y-4 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "bookings" })}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="rounded-2xl bg-card p-5 shadow-card">
        <p className="text-xs text-muted-foreground">Pay for your service</p>
        <h2 className="text-base font-bold text-foreground">{booking.service.name}</h2>
        <p className="mt-3 text-3xl font-extrabold text-primary">₹{amount}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Includes all taxes & service fee</p>
      </div>

      {!paid ? (
        <>
          <div className="space-y-2">
            {methods.map((m) => {
              const Icon = m.icon;
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-bounce",
                    active
                      ? "border-primary bg-primary/5 shadow-card"
                      : "border-border bg-card shadow-soft hover:border-primary/40",
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{m.label}</p>
                    <p className="text-[11px] text-muted-foreground">{m.sub}</p>
                  </div>
                  {active && <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-glow" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={handlePay}
            disabled={processing}
            className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {processing ? "Processing…" : `Pay ₹${amount}`}
          </button>
        </>
      ) : (
        <>
          <div className="rounded-2xl bg-success/10 p-6 text-center shadow-soft">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <p className="mt-3 text-sm font-bold text-foreground">Payment successful</p>
            <p className="mt-1 text-xs text-muted-foreground">Receipt sent to your email</p>
          </div>

          <div className="rounded-2xl bg-card p-4 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Not satisfied?</p>
            <p className="mt-1 text-xs text-foreground">
              If the service didn't meet your expectations, request a refund within 24 hours and we'll review your case.
            </p>
            <button
              onClick={handleRefund}
              disabled={refunding}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-warning/40 bg-warning/10 py-2.5 text-xs font-bold text-warning"
            >
              {refunding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Request refund
            </button>
          </div>

          <button
            onClick={() => navigate({ name: "bookings" })}
            className="w-full rounded-2xl bg-card py-3 text-sm font-bold text-foreground shadow-soft"
          >
            Done
          </button>
        </>
      )}
    </div>
  );
};
