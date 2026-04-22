import { useState } from "react";
import { MapPin, Star, TrendingUp, Wallet, CheckCircle2, X, Zap, CalendarClock, Briefcase } from "lucide-react";
import { samplePartnerRequests } from "@/data/services";
import type { PartnerRequest } from "@/types";
import { cn } from "@/lib/utils";

export const PartnerDashboard = () => {
  const [online, setOnline] = useState(true);
  const [requests, setRequests] = useState<PartnerRequest[]>(samplePartnerRequests);
  const [accepted, setAccepted] = useState<PartnerRequest[]>([]);

  const respond = (id: string, action: "accept" | "decline") => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    setRequests((prev) => prev.filter((r) => r.id !== id));
    if (action === "accept") setAccepted((prev) => [req, ...prev]);
  };

  return (
    <div className="-mt-5 space-y-5 px-5 pb-6">
      {/* Online toggle */}
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">You are</p>
            <p className="text-base font-bold text-foreground">{online ? "Online & Available" : "Offline"}</p>
          </div>
          <button
            onClick={() => setOnline((o) => !o)}
            className={cn(
              "relative h-7 w-12 rounded-full transition-smooth",
              online ? "bg-success shadow-glow" : "bg-muted",
            )}
            aria-pressed={online}
          >
            <span
              className={cn(
                "absolute top-0.5 h-6 w-6 rounded-full bg-card shadow-soft transition-bounce",
                online ? "left-[1.375rem]" : "left-0.5",
              )}
            />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Wallet, label: "Today", value: "₹2,840", color: "text-primary bg-primary/10" },
          { icon: TrendingUp, label: "Jobs", value: "8", color: "text-accent bg-accent/10" },
          { icon: Star, label: "Rating", value: "4.9", color: "text-warning bg-warning/15" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl bg-card p-3 text-center shadow-soft">
              <div className={cn("mx-auto flex h-9 w-9 items-center justify-center rounded-xl", s.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-base font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Incoming */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Incoming Requests</h2>
          <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase text-warning">
            {requests.length} new
          </span>
        </div>
        {!online ? (
          <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
            <p className="text-xs text-muted-foreground">Go online to receive job requests</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
            <p className="text-xs text-muted-foreground">No new requests right now</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="overflow-hidden rounded-2xl bg-card shadow-card animate-fade-in-up">
                <div className="flex items-center justify-between bg-secondary px-4 py-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {r.type === "instant" ? (
                      <><Zap className="h-3.5 w-3.5 text-primary" /><span className="text-primary">Instant Request</span></>
                    ) : (
                      <><CalendarClock className="h-3.5 w-3.5 text-accent" /><span className="text-accent">Scheduled</span></>
                    )}
                  </div>
                  <span className="text-xs font-bold text-foreground">₹{r.price}</span>
                </div>
                <div className="p-4">
                  <p className="text-sm font-bold text-foreground">{r.serviceName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">For {r.customerName}</p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" /> {r.distance}
                    </span>
                    <span className="truncate">{r.address}</span>
                  </div>
                  {r.scheduledAt && (
                    <p className="mt-1 text-[11px] font-medium text-foreground">
                      {r.scheduledAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => respond(r.id, "decline")}
                      className="flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-smooth hover:bg-secondary"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                    <button
                      onClick={() => respond(r.id, "accept")}
                      className="flex items-center justify-center gap-1 rounded-xl gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-soft transition-bounce active:scale-95"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Accepted jobs */}
      {accepted.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold text-foreground">Active Jobs</h2>
          <div className="space-y-3">
            {accepted.map((j) => (
              <div key={j.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{j.serviceName}</p>
                  <p className="text-[11px] text-muted-foreground">{j.customerName} • {j.distance}</p>
                </div>
                <span className="text-sm font-bold text-primary">₹{j.price}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};