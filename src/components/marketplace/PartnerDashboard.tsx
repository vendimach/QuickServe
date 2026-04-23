import { useEffect, useState } from "react";
import { MapPin, Star, TrendingUp, Wallet, CheckCircle2, X, Zap, CalendarClock, Briefcase, Eye, CalendarDays, Plus, Trash2 } from "lucide-react";
import { samplePartnerRequests, professionals } from "@/data/services";
import type { PartnerRequest, ScheduleSlot, DayOfWeek } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";

const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const PartnerDashboard = () => {
  const { availableNow, setAvailableNow, listedToday, setListedToday, bookings } = useApp();
  const { push } = useNotifications();
  const [requests, setRequests] = useState<PartnerRequest[]>(samplePartnerRequests);
  const [accepted, setAccepted] = useState<PartnerRequest[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>(
    professionals[0].schedule ?? [{ days: ["Mon", "Wed", "Fri"], start: "17:00", end: "22:00" }],
  );

  // Notify partner when one of their accepted bookings is confirmed by the customer
  useEffect(() => {
    const confirmed = bookings.find(
      (b) => b.status === "confirmed" && b.professional?.id === professionals[0].id,
    );
    if (confirmed) {
      // No-op duplicate suppression; just illustrative
    }
  }, [bookings]);

  const respond = (id: string, action: "accept" | "decline") => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    setRequests((prev) => prev.filter((r) => r.id !== id));
    if (action === "accept") {
      setAccepted((prev) => [req, ...prev]);
      push({
        kind: "success",
        title: "Job accepted",
        body: `${req.serviceName} • Waiting for customer to confirm`,
      });
      // Simulate customer confirming after a short delay
      setTimeout(() => {
        push({
          kind: "confirm",
          title: "Customer confirmed!",
          body: `${req.customerName} chose you for ${req.serviceName}`,
        });
      }, 3500);
    } else {
      push({ kind: "info", title: "Request declined" });
    }
  };

  const toggleDay = (i: number, day: DayOfWeek) => {
    setSchedule((prev) =>
      prev.map((slot, idx) =>
        idx !== i
          ? slot
          : {
              ...slot,
              days: slot.days.includes(day)
                ? slot.days.filter((d) => d !== day)
                : [...slot.days, day],
            },
      ),
    );
  };
  const updateSlot = (i: number, field: "start" | "end", value: string) => {
    setSchedule((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  };
  const addSlot = () => setSchedule((prev) => [...prev, { days: ["Mon"], start: "09:00", end: "17:00" }]);
  const removeSlot = (i: number) => setSchedule((prev) => prev.filter((_, idx) => idx !== i));
  const saveSchedule = () => push({ kind: "success", title: "Schedule updated", body: `${schedule.length} slot(s) saved` });

  return (
    <div className="-mt-5 space-y-5 px-5 pb-6">
      {/* Two availability switches */}
      <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
        <SwitchRow
          icon={<Zap className="h-4 w-4" />}
          title="Available right now"
          subtitle="Get instant booking requests live"
          on={availableNow}
          onChange={(v) => {
            setAvailableNow(v);
            push({
              kind: v ? "success" : "info",
              title: v ? "You're live for instant bookings" : "Instant matching paused",
            });
          }}
          color="success"
        />
        <div className="border-t border-border" />
        <SwitchRow
          icon={<Eye className="h-4 w-4" />}
          title="Show in today's listings"
          subtitle="Customers can see & book you for today"
          on={listedToday}
          onChange={(v) => {
            setListedToday(v);
            push({
              kind: v ? "success" : "info",
              title: v ? "You're listed for today" : "Removed from today's list",
            });
          }}
          color="primary"
        />
      </div>

      {/* Schedule editor */}
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold text-foreground">Weekly availability</p>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Customers see you in scheduled-listings during these slots.
        </p>
        <div className="mt-3 space-y-3">
          {schedule.map((slot, i) => (
            <div key={i} className="rounded-xl border border-border bg-secondary/40 p-3">
              <div className="flex flex-wrap gap-1">
                {DAYS.map((d) => {
                  const on = slot.days.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => toggleDay(i, d)}
                      className={cn(
                        "rounded-lg px-2 py-1 text-[10px] font-bold uppercase transition-smooth",
                        on ? "gradient-primary text-primary-foreground shadow-soft" : "bg-card text-muted-foreground",
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="time"
                  value={slot.start}
                  onChange={(e) => updateSlot(i, "start", e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="time"
                  value={slot.end}
                  onChange={(e) => updateSlot(i, "end", e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                />
                <button
                  onClick={() => removeSlot(i)}
                  aria-label="Remove slot"
                  className="rounded-lg bg-destructive/10 p-1.5 text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={addSlot}
            className="flex items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-card py-2 text-xs font-semibold text-muted-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Add slot
          </button>
          <button
            onClick={saveSchedule}
            className="rounded-xl gradient-primary py-2 text-xs font-bold text-primary-foreground shadow-soft"
          >
            Save schedule
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
        {!availableNow && !listedToday ? (
          <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
            <p className="text-xs text-muted-foreground">Turn on availability to receive job requests</p>
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

      {accepted.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold text-foreground">Awaiting Customer Confirmation</h2>
          <div className="space-y-3">
            {accepted.map((j) => (
              <div key={j.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15 text-warning">
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

interface SwitchRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  on: boolean;
  onChange: (v: boolean) => void;
  color: "success" | "primary";
}

const SwitchRow = ({ icon, title, subtitle, on, onChange, color }: SwitchRowProps) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-3 min-w-0">
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
        color === "success" ? "bg-success/15 text-success" : "bg-primary/15 text-primary",
      )}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-smooth",
        on ? (color === "success" ? "bg-success shadow-glow" : "bg-primary shadow-glow") : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-6 w-6 rounded-full bg-card shadow-soft transition-bounce",
          on ? "left-[1.375rem]" : "left-0.5",
        )}
      />
    </button>
  </div>
);
