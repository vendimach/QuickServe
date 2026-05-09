import {
  ArrowLeft,
  Wallet,
  Gift,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Sparkles,
  Loader2,
  Receipt,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useWallet, type WalletTxnType } from "@/contexts/WalletContext";
import { cn } from "@/lib/utils";

const TYPE_META: Record<WalletTxnType, { label: string; icon: typeof Gift; tone: string }> = {
  referral:     { label: "Referral",     icon: Gift,         tone: "bg-success/15 text-success" },
  signup_bonus: { label: "Signup bonus", icon: Sparkles,     tone: "bg-primary/15 text-primary" },
  refund:       { label: "Refund",       icon: RotateCcw,    tone: "bg-warning/15 text-warning" },
  payment:      { label: "Payment",      icon: ArrowUpRight, tone: "bg-secondary text-foreground" },
  adjustment:   { label: "Adjustment",   icon: Receipt,      tone: "bg-secondary text-foreground" },
};

export const WalletView = () => {
  const { navigate, goBack } = useApp();
  const { balance, transactions, loading } = useWallet();

  return (
    <div className="space-y-4 px-5 pb-6">
      <button
        onClick={goBack}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      {/* Balance */}
      <div className="relative overflow-hidden rounded-3xl gradient-primary p-6 text-primary-foreground shadow-card">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider opacity-85">Wallet balance</p>
            <p className="mt-1 text-3xl font-extrabold leading-none">₹{balance.toLocaleString("en-IN")}</p>
          </div>
        </div>
        <p className="relative mt-3 text-xs opacity-85">
          Use credits at checkout. Refunds and referral rewards land here automatically.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate({ name: "refer-earn" })}
          className="flex items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-soft transition-smooth hover:bg-secondary/40"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15 text-success">
            <Gift className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Refer & Earn</p>
            <p className="text-[11px] text-muted-foreground">Invite friends</p>
          </div>
        </button>
        <button
          onClick={() => navigate({ name: "bookings" })}
          className="flex items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-soft transition-smooth hover:bg-secondary/40"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Receipt className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Bookings</p>
            <p className="text-[11px] text-muted-foreground">See history</p>
          </div>
        </button>
      </div>

      {/* Transactions */}
      <div>
        <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Transactions
        </p>
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl bg-card py-8 shadow-soft">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Loading…</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
            <Wallet className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold text-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground">
              Refunds and referral rewards will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-card shadow-soft">
            {transactions.map((t, i) => {
              const meta = TYPE_META[t.type] ?? TYPE_META.adjustment;
              const Icon = t.amount < 0 ? ArrowUpRight : meta.icon;
              const isCredit = t.amount > 0;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    i !== transactions.length - 1 && "border-b border-border",
                  )}
                >
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", meta.tone)}>
                    {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{t.description}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full bg-secondary px-1.5 py-0.5 font-bold uppercase tracking-wider text-[9px]">
                        {meta.label}
                      </span>
                      <span>{new Date(t.timestamp).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</span>
                      {t.status !== "completed" && (
                        <span className="font-semibold text-warning capitalize">{t.status}</span>
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    "text-sm font-extrabold",
                    isCredit ? "text-success" : "text-foreground",
                  )}>
                    {isCredit ? "+" : ""}₹{Math.abs(t.amount).toLocaleString("en-IN")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
