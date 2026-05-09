import { useState, useMemo } from "react";
import {
  Calendar,
  ChevronRight,
  Zap,
  CalendarClock,
  Inbox,
  RotateCcw,
  CheckCheck,
  XCircle,
  KeyRound,
  Filter,
  X,
  MapPin,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

type Tab = "scheduled" | "completed" | "cancelled" | "refunds";

const tabs: { id: Tab; label: string; icon: typeof Calendar }[] = [
  { id: "scheduled", label: "Scheduled", icon: CalendarClock },
  { id: "completed", label: "Completed", icon: CheckCheck },
  { id: "cancelled", label: "Cancelled", icon: XCircle },
  { id: "refunds", label: "Refunds", icon: RotateCcw },
];

const RANGE_DAYS = 30;
const RANGE_MS = RANGE_DAYS * 24 * 60 * 60 * 1000;

type DateFilter = "all" | "today" | "7d" | "30d";
const dateFilters: { id: DateFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

export const BookingsList = () => {
  const { bookings, navigate, role } = useApp();
  const [active, setActive] = useState<Tab>("scheduled");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Restrict the entire history view to the last 30 days regardless of tab.
  // Active "scheduled" bookings always show, since they may pre-date the
  // window but are still in flight.
  const recent = useMemo(() => {
    const cutoff = Date.now() - RANGE_MS;
    return bookings.filter((b) => {
      const ts = (b.scheduledAt ?? b.createdAt).getTime();
      const isActive = ["searching", "awaiting-customer-confirm", "confirmed", "in-progress"].includes(b.status);
      return isActive || ts >= cutoff;
    });
  }, [bookings]);

  const serviceOptions = useMemo(() => {
    const map = new Map<string, string>();
    recent.forEach((b) => map.set(b.service.id, b.service.name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [recent]);

  const filtered = useMemo(() => {
    let list = recent;
    if (active === "scheduled") {
      list = list.filter((b) =>
        ["searching", "awaiting-customer-confirm", "confirmed", "in-progress"].includes(b.status),
      );
    } else if (active === "completed") {
      list = list.filter((b) => b.status === "completed");
    } else if (active === "cancelled") {
      list = list.filter((b) => b.status === "cancelled");
    } else {
      list = list.filter((b) => b.status === "refunded");
    }

    if (serviceFilter !== "all") {
      list = list.filter((b) => b.service.id === serviceFilter);
    }

    if (dateFilter !== "all") {
      const now = Date.now();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const todayStart = start.getTime();
      const cutoff =
        dateFilter === "today"
          ? todayStart
          : dateFilter === "7d"
            ? now - 7 * 24 * 60 * 60 * 1000
            : now - RANGE_MS;
      list = list.filter((b) => (b.scheduledAt ?? b.createdAt).getTime() >= cutoff);
    }
    return list;
  }, [recent, active, dateFilter, serviceFilter]);

  const filtersActive = dateFilter !== "all" || serviceFilter !== "all";

  return (
    <div className="space-y-4 px-5">
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Your Bookings</h2>
            <p className="text-xs text-muted-foreground">
              Showing the last {RANGE_DAYS} days · synced to your account
            </p>
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition-smooth",
              filtersActive || showFilters
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-muted",
            )}
          >
            <Filter className="h-3 w-3" /> Filters
            {filtersActive && (
              <span className="ml-1 rounded-full bg-primary-foreground/25 px-1.5 text-[10px]">
                on
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Date
              </p>
              <div className="flex flex-wrap gap-1.5">
                {dateFilters.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDateFilter(d.id)}
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-semibold transition-smooth",
                      dateFilter === d.id
                        ? "gradient-primary text-primary-foreground shadow-soft"
                        : "bg-secondary text-foreground hover:bg-muted",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Service
              </p>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
              >
                <option value="all">All services</option>
                {serviceOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {filtersActive && (
              <button
                onClick={() => {
                  setDateFilter("all");
                  setServiceFilter("all");
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-stretch gap-1.5 overflow-x-auto rounded-2xl bg-secondary p-1.5 shadow-soft">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                "flex min-h-[36px] flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 py-2 text-[11px] font-semibold leading-none transition-smooth",
                isActive
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
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
              searching: "Finding Partner",
              "awaiting-customer-confirm": "Choose Partner",
              confirmed: "Confirmed",
              "in-progress": "In Progress",
              completed: "Completed",
              cancelled: "Cancelled",
              refunded: "Refunded",
            };
            const goToDetails = () => {
              if (b.status === "completed" || b.status === "refunded" || b.status === "cancelled") {
                navigate({ name: "booking-summary", bookingId: b.id });
              } else if (b.status === "awaiting-customer-confirm") {
                navigate({ name: "matching", bookingId: b.id });
              } else if (b.status === "searching") {
                navigate({ name: "live-status", bookingId: b.id });
              } else if (role === "partner") {
                navigate({ name: "partner-job", bookingId: b.id });
              } else {
                navigate({ name: "live-status", bookingId: b.id });
              }
            };
            return (
              <div
                key={b.id}
                className="overflow-hidden rounded-2xl bg-card shadow-soft transition-smooth hover:shadow-card"
              >
                <button
                  onClick={goToDetails}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    b.type === "instant" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent",
                  )}>
                    {b.type === "instant" ? <Zap className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-bold text-foreground">{b.service.name}</p>
                      <p className={cn(
                        "shrink-0 text-sm font-bold",
                        active === "refunds" ? "text-success" : "text-foreground",
                      )}>
                        {active === "refunds" ? "+" : ""}₹{b.service.price}
                      </p>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {b.scheduledAt
                          ? b.scheduledAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })
                          : b.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    {b.address && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{b.address}</span>
                      </div>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", statusStyles[b.status])}>
                        {active === "refunds" ? "Refunded" : labels[b.status]}
                      </span>
                      {b.status === "completed" && !b.rated && (
                        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase text-warning">
                          ⭐ Rate
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
                {role === "partner" && b.status === "confirmed" && (() => {
                  const notYet = b.type === "scheduled" && !!b.scheduledAt && Date.now() < b.scheduledAt.getTime() - 15 * 60_000;
                  return (
                    <div className="border-t border-border bg-secondary/40 px-4 py-2">
                      <button
                        disabled={notYet}
                        onClick={() => !notYet && navigate({ name: "partner-otp", bookingId: b.id })}
                        className={cn(
                          "inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold",
                          notYet
                            ? "bg-secondary text-muted-foreground cursor-not-allowed"
                            : "bg-primary/15 text-primary hover:bg-primary/25",
                        )}
                      >
                        <KeyRound className="h-3 w-3" />
                        {notYet
                          ? `Starts at ${b.scheduledAt!.toLocaleTimeString("en", { timeStyle: "short" })}`
                          : "Verify OTP to start service"}
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};