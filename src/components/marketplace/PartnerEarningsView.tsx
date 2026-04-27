import { useEffect } from "react";
import { ArrowLeft, Wallet, TrendingUp, Briefcase } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { usePartnerData } from "@/contexts/PartnerDataContext";

export const PartnerEarningsView = () => {
  const { navigate } = useApp();
  const { earnings, refreshEarnings, earningsToday, earningsTotal, jobsCompletedTotal } = usePartnerData();

  useEffect(() => {
    refreshEarnings();
  }, [refreshEarnings]);

  return (
    <div className="space-y-4 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "partner-dashboard" })}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="rounded-2xl gradient-primary p-5 text-primary-foreground shadow-card">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Lifetime earnings</p>
        <p className="mt-1 text-3xl font-bold">₹{earningsTotal.toLocaleString("en-IN")}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
          <div className="rounded-xl bg-primary-foreground/10 p-3">
            <p className="opacity-80">Today</p>
            <p className="mt-0.5 text-base font-bold">₹{earningsToday.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-3">
            <p className="opacity-80">Jobs done</p>
            <p className="mt-0.5 text-base font-bold">{jobsCompletedTotal}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          History
        </p>
        {earnings.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 text-center shadow-soft">
            <Wallet className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">No earnings yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Money you earn from completed bookings will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {earnings.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{e.serviceName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {e.earnedAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <p className="text-sm font-bold text-success">+₹{e.amount.toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};