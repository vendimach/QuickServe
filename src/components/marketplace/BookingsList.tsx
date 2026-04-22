import { Calendar, ChevronRight, Zap, CalendarClock, Inbox } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

export const BookingsList = () => {
  const { bookings, navigate } = useApp();

  return (
    <div className="-mt-5 px-5">
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <h2 className="text-base font-bold text-foreground">Your Bookings</h2>
        <p className="text-xs text-muted-foreground">Track all your service requests</p>
      </div>

      {bookings.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl bg-card p-8 text-center shadow-soft">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Inbox className="h-8 w-8" />
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground">No bookings yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Book a service to get started</p>
          <button
            onClick={() => navigate({ name: "home" })}
            className="mt-4 rounded-xl gradient-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-soft"
          >
            Explore Services
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {bookings.map((b) => {
            const statusStyles: Record<string, string> = {
              searching: "bg-warning/15 text-warning",
              confirmed: "bg-success/15 text-success",
              "in-progress": "bg-primary/15 text-primary",
              completed: "bg-muted text-muted-foreground",
              cancelled: "bg-destructive/15 text-destructive",
            };
            const labels: Record<string, string> = {
              searching: "Searching",
              confirmed: "Confirmed",
              "in-progress": "In Progress",
              completed: "Completed",
              cancelled: "Cancelled",
            };
            return (
              <button
                key={b.id}
                onClick={() => navigate({ name: "live-status", bookingId: b.id })}
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
                    {labels[b.status]}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">₹{b.service.price}</p>
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