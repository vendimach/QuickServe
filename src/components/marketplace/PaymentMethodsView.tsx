import { useState } from "react";
import { ArrowLeft, CreditCard, Plus, Trash2, Star, Banknote, Wallet, Smartphone } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useUserData, type PaymentMethod } from "@/contexts/UserDataContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const kindIcon = (k: PaymentMethod["kind"]) =>
  k === "card" ? CreditCard : k === "upi" ? Smartphone : k === "wallet" ? Wallet : Banknote;

export const PaymentMethodsView = () => {
  const { navigate } = useApp();
  const { paymentMethods, addPaymentMethod, deletePaymentMethod, setDefaultPayment } = useUserData();
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<PaymentMethod["kind"]>("upi");
  const [upi, setUpi] = useState("");
  const [last4, setLast4] = useState("");
  const [brand, setBrand] = useState("Visa");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (kind === "upi") {
        if (!/^[\w.\-]+@[\w]+$/.test(upi)) return;
        await addPaymentMethod({ kind, label: upi, upi_id: upi });
      } else if (kind === "card") {
        if (last4.length !== 4) return;
        await addPaymentMethod({ kind, label: `${brand} ••${last4}`, last4, brand });
      } else if (kind === "wallet") {
        await addPaymentMethod({ kind, label: "Wallet" });
      } else {
        await addPaymentMethod({ kind, label: "Cash on delivery" });
      }
      setAdding(false); setUpi(""); setLast4("");
    } catch {
      // addPaymentMethod error — silently ignored, UI stays in adding mode
    }
  };

  return (
    <div className="space-y-3 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "profile" })}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="rounded-2xl bg-card p-4 shadow-card">
        <h2 className="text-base font-bold text-foreground">Payment Methods</h2>
        <p className="text-xs text-muted-foreground">Tap a method to set as default.</p>
      </div>

      <div className="space-y-2">
        {paymentMethods.map((p) => {
          const Icon = kindIcon(p.kind);
          return (
            <div key={p.id} className={cn("rounded-2xl bg-card p-4 shadow-soft", p.is_default && "ring-2 ring-primary/40")}>
              <button onClick={() => setDefaultPayment(p.id)} className="flex w-full items-center gap-3 text-left">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{p.label}</p>
                    {p.is_default && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        <Star className="h-3 w-3" /> Default
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground capitalize">{p.kind}</p>
                </div>
              </button>
              <div className="mt-3">
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30"
                  onClick={() => deletePaymentMethod(p.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {!adding ? (
        <Button onClick={() => setAdding(true)} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add payment method
        </Button>
      ) : (
        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-card p-4 shadow-card">
          <p className="text-sm font-bold">New payment method</p>
          <div className="grid grid-cols-4 gap-2">
            {(["upi", "card", "wallet", "cod"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-xl border-2 py-2 text-xs font-semibold uppercase",
                  kind === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                )}
              >
                {k}
              </button>
            ))}
          </div>
          {kind === "upi" && (
            <div>
              <Label>UPI ID</Label>
              <Input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@bank" />
            </div>
          )}
          {kind === "card" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Brand</Label>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Visa" />
              </div>
              <div>
                <Label>Last 4</Label>
                <Input value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" maxLength={4} />
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">Add</Button>
          </div>
        </form>
      )}
    </div>
  );
};
