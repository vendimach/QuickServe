import { useState, useMemo } from "react";
import { Calendar, ChevronRight, Zap, CalendarClock, Inbox, RotateCcw, CheckCheck, XCircle } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

type Tab = "scheduled" | "completed" | "cancelled" | "refunds";

const tabs: { id: Tab; label: string; icon: typeof Calendar }[] = [
  { id: "scheduled", label: "Scheduled", icon: CalendarClock },
  { id: "completed", label: "Completed", icon: CheckCheck },
  { id: "cancelled", label: "Cancelled", icon: XCircle },
  { id: "refunds", label: "Refunds", icon: RotateCcw },
];

export const BookingsList = () => {
  const { bookings, navigate } = useApp();
  const [active, setActive] = useState<Tab>("scheduled");

  const filtered = useMemo(() => {
    if (active === "scheduled") {
      return bookings.filter((b) =>
        ["searching", "awaiting-customer-confirm", "confirmed", "in-progress"].includes(b.status),
      );
    }
    if (active === "completed") return bookings.filter((b) => b.status === "completed");
    if (active === "cancelled") return bookings.filter((b) => b.status === "cancelled");
    return bookings.filter((b) => b.status === "refunded" || b.status === "cancelled");
  }, [bookings, active]);

  return (
    <div className="-mt-5 space-y-4 px-5">
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <h2 className="text-base font-bold text-foreground">Your Bookings</h2>
        <p className="text-xs text-muted-foreground">Track all your service requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-secondary p-1.5 shadow-soft">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 py-2 text-[11px] font-semibold transition-smooth",
                isActive
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl bg-card p-8 text-center shadow-soft">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Inbox className="h-8 w-8" />
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground">
            No {active} bookings
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {active === "refunds"
              ? "Refunded bookings will appear here"
              : "Nothing to show in this tab yet"}
          </p>
          <button
            onClick={() => navigate({ name: "home" })}
            className="mt-4 rounded-xl gradient-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-soft"
          >
            Explore Services
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((b) => {
            const statusStyles: Record<string, string> = {
              searching: "bg-warning/15 text-warning",
              "awaiting-customer-confirm": "bg-warning/15 text-warning",
              confirmed: "bg-success/15 text-success",
              "in-progress": "bg-primary/15 text-primary",
              completed: "bg-muted text-muted-foreground",
              cancelled: "bg-destructive/15 text-destructive",
              refunded: "bg-success/15 text-success",
            };
            const labels: Record<string, string> = {
              searching: "Searching",
              "awaiting-customer-confirm": "Choose Partner",
              confirmed: "Confirmed",
              "in-progress": "In Progress",
              completed: "Completed",
              cancelled: "Cancelled",
              refunded: "Refunded",
            };
            return (
              <button
                key={b.id}
                onClick={() => {
                  if (b.status === "completed" && !b.rated) {
                    navigate({ name: "rate-booking", bookingId: b.id });
                  } else if (b.status === "awaiting-customer-confirm" || b.status === "searching") {
                    navigate({ name: "matching", bookingId: b.id });
                  } else {
                    navigate({ name: "live-status", bookingId: b.id });
                  }
                }}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-soft transition-smooth hover:shadow-card"
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  b.type === "instant" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent",
                )}>
                  {b.type === "instant" ? <Zap className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{b.service.name}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {b.scheduledAt
                      ? b.scheduledAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })
                      : b.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                  <span className={cn("mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", statusStyles[b.status])}>
                    {active === "refunds" ? "Refunded" : labels[b.status]}
                  </span>
                  {b.status === "completed" && !b.rated && (
                    <span className="ml-1 inline-block rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase text-warning">
                      ⭐ Rate
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-bold",
                    active === "refunds" ? "text-success" : "text-foreground",
                  )}>
                    {active === "refunds" ? "+" : ""}₹{b.service.price}
                  </p>
                  <ChevronRight className="ml-auto mt-1 h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};