import { useState } from "react";
import { ArrowLeft, Zap, CalendarClock, MapPin, ChevronRight, Settings2, AlertTriangle } from "lucide-react";
import { services } from "@/data/services";
import { useApp } from "@/contexts/AppContext";
import { useMarketplaceData } from "@/contexts/MarketplaceDataContext";
import { PreferencesEditor } from "./PreferencesEditor";
import { cancellationPolicy } from "@/data/services";
import { cn } from "@/lib/utils";

interface Props {
  serviceId: string;
}

const timeSlots = ["09:00 AM", "11:00 AM", "01:00 PM", "03:00 PM", "05:00 PM", "07:00 PM"];

const dateOptions = Array.from({ length: 5 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d;
});

export const BookingFlow = ({ serviceId }: Props) => {
  const { navigate, createBooking } = useApp();
  const { preferences } = useMarketplaceData();
  const service = services.find((s) => s.id === serviceId);
  const [mode, setMode] = useState<"instant" | "scheduled" | null>(null);
  const [date, setDate] = useState<Date>(dateOptions[0]);
  const [time, setTime] = useState<string>(timeSlots[0]);
  const [showPrefs, setShowPrefs] = useState(false);

  if (!service) return null;

  const handleConfirm = () => {
    if (!mode) return;
    let scheduledAt: Date | undefined;
    if (mode === "scheduled") {
      const [h, mPart] = time.split(":");
      const isPM = time.includes("PM");
      const hour = (parseInt(h) % 12) + (isPM ? 12 : 0);
      scheduledAt = new Date(date);
      scheduledAt.setHours(hour, parseInt(mPart), 0, 0);
    }
    const booking = createBooking(service, mode, scheduledAt, undefined, preferences[service.id]);
    navigate({ name: "matching", bookingId: booking.id });
  };

  const hasPrefs = !!preferences[service.id];

  return (
    <div className="-mt-5 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "service-detail", serviceId: service.id })}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="rounded-2xl bg-card p-4 shadow-card">
        <p className="text-xs text-muted-foreground">Booking</p>
        <h2 className="text-base font-bold text-foreground">{service.name}</h2>
        <p className="mt-1 text-sm font-semibold text-primary">₹{service.price} • {service.duration}</p>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">When do you need it?</p>
        <div className="grid gap-3">
          <button
            onClick={() => setMode("instant")}
            className={cn(
              "flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-bounce",
              mode === "instant"
                ? "border-primary bg-primary/5 shadow-card"
                : "border-border bg-card shadow-soft hover:border-primary/40",
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary text-primary-foreground">
              <Zap className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground">Book Immediately</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Match with nearest pro now</p>
            </div>
            {mode === "instant" && <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-glow" />}
          </button>

          <button
            onClick={() => setMode("scheduled")}
            className={cn(
              "flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-bounce",
              mode === "scheduled"
                ? "border-accent bg-accent/5 shadow-card"
                : "border-border bg-card shadow-soft hover:border-accent/40",
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-accent text-accent-foreground">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground">Schedule for Later</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Pick your preferred date & time</p>
            </div>
            {mode === "scheduled" && <div className="h-2.5 w-2.5 rounded-full bg-accent" />}
          </button>
        </div>
      </div>

      {mode === "scheduled" && (
        <div className="mt-5 animate-fade-in-up rounded-2xl bg-card p-4 shadow-card">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Select date</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dateOptions.map((d) => {
              const active = d.toDateString() === date.toDateString();
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setDate(d)}
                  className={cn(
                    "flex shrink-0 flex-col items-center rounded-xl px-3 py-2 transition-smooth",
                    active ? "gradient-primary text-primary-foreground shadow-elevated" : "bg-secondary text-foreground hover:bg-muted",
                  )}
                >
                  <span className="text-[10px] font-medium uppercase">
                    {d.toLocaleDateString("en", { weekday: "short" })}
                  </span>
                  <span className="text-base font-bold">{d.getDate()}</span>
                  <span className="text-[10px]">
                    {d.toLocaleDateString("en", { month: "short" })}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Select time</p>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((t) => (
              <button
                key={t}
                onClick={() => setTime(t)}
                className={cn(
                  "rounded-xl py-2 text-xs font-semibold transition-smooth",
                  t === time ? "gradient-primary text-primary-foreground shadow-soft" : "bg-secondary text-foreground hover:bg-muted",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">Home</p>
              <p className="text-[11px] text-muted-foreground">12, MG Road, Bengaluru</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Preferences */}
      <div className="mt-3">
        <button
          onClick={() => setShowPrefs((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl bg-card p-4 shadow-soft"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-accent" />
            <div className="text-left">
              <p className="text-xs font-semibold text-foreground">
                Service preferences {hasPrefs && <span className="text-success">• Saved</span>}
              </p>
              <p className="text-[11px] text-muted-foreground">
                e.g. walk at 6, food at 8, medicine at 9
              </p>
            </div>
          </div>
          <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", showPrefs && "rotate-90")} />
        </button>
        {showPrefs && (
          <div className="mt-3">
            <PreferencesEditor service={service} onSaved={() => setShowPrefs(false)} />
          </div>
        )}
      </div>

      {/* Cancellation rules notice */}
      <div className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-3">
        <div className="flex items-start gap-2 text-[11px] text-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold">Cancellation policy</p>
            <p className="mt-0.5 text-muted-foreground">
              Free before partner accepts • ₹{cancellationPolicy.afterAcceptFee} after acceptance • ₹{cancellationPolicy.withinArrivalFee} within 15 min of arrival.
            </p>
          </div>
        </div>
      </div>

      <button
        disabled={!mode}
        onClick={handleConfirm}
        className={cn(
          "mt-6 w-full rounded-2xl py-4 text-sm font-bold transition-bounce active:scale-[0.98]",
          mode
            ? "gradient-primary text-primary-foreground shadow-elevated hover:-translate-y-0.5"
            : "bg-muted text-muted-foreground",
        )}
      >
        {mode === "instant" ? "Find Professional Now" : mode === "scheduled" ? "Confirm Booking" : "Choose an option"}
      </button>
    </div>
  );
};