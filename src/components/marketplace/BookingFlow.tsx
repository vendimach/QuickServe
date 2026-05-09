import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Zap, CalendarClock, MapPin, ChevronRight, Settings2, AlertTriangle, Check, Plus, Search, Heart, MessageSquare } from "lucide-react";
import { services } from "@/data/services";
import { useApp } from "@/contexts/AppContext";
import { useMarketplaceData } from "@/contexts/MarketplaceDataContext";
import { useUserData } from "@/contexts/UserDataContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { PreferencesEditor } from "./PreferencesEditor";
import { AddressSelector, type GeoAddress } from "./AddressSelector";
import { AvatarBadge } from "./AvatarBadge";
import { cancellationPolicy } from "@/data/services";
import { cn } from "@/lib/utils";

interface Props {
  serviceId: string;
}

// All possible 30-minute slots from 09:00 to 19:00
const ALL_TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 9; h <= 19; h++) {
    for (const min of [0, 30]) {
      if (h === 19 && min === 30) break;
      const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm = h < 12 ? "AM" : "PM";
      slots.push(`${String(h12).padStart(2, "0")}:${String(min).padStart(2, "0")} ${ampm}`);
    }
  }
  return slots;
})();

const dateOptions = Array.from({ length: 5 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d;
});

export const BookingFlow = ({ serviceId }: Props) => {
  const { navigate, goBack, createBooking } = useApp();
  const { preferences } = useMarketplaceData();
  const { addresses, defaultAddress } = useUserData();
  const { favorites } = useFavorites();
  const [targetPartnerId, setTargetPartnerId] = useState<string | null>(null);
  const [personalMessage, setPersonalMessage] = useState("");
  const service = services.find((s) => s.id === serviceId);
  const [mode, setMode] = useState<"instant" | "scheduled" | null>(null);
  const [date, setDate] = useState<Date>(dateOptions[0]);
  const [time, setTime] = useState<string>("");
  const [showPrefs, setShowPrefs] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    defaultAddress?.id ?? null,
  );
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [addrTab, setAddrTab] = useState<"saved" | "search">("saved");
  const [geoAddress, setGeoAddress] = useState<GeoAddress | null>(null);

  // Filter slots: on today's date hide anything within the next 2 hours.
  const availableTimeSlots = useMemo(() => {
    const isToday = date.toDateString() === new Date().toDateString();
    if (!isToday) return ALL_TIME_SLOTS;
    const threshold = Date.now() + 2 * 60 * 60 * 1000;
    return ALL_TIME_SLOTS.filter((slot) => {
      const [hStr, rest] = slot.split(":");
      const [mStr, ampm] = rest.split(" ");
      const h = (parseInt(hStr) % 12) + (ampm === "PM" ? 12 : 0);
      const slotDate = new Date(date);
      slotDate.setHours(h, parseInt(mStr), 0, 0);
      return slotDate.getTime() > threshold;
    });
  }, [date]);

  // Reset selected time when available slots change (e.g. date switches to today).
  useEffect(() => {
    if (availableTimeSlots.length === 0) {
      setTime("");
    } else if (!availableTimeSlots.includes(time)) {
      setTime(availableTimeSlots[0]);
    }
  }, [availableTimeSlots, time]);

  // Keep selection in sync if addresses load after first render.
  const selectedSavedAddress = useMemo(() => {
    if (selectedAddressId) {
      const found = addresses.find((a) => a.id === selectedAddressId);
      if (found) return found;
    }
    return defaultAddress;
  }, [addresses, selectedAddressId, defaultAddress]);

  // Effective address: geo search result takes priority over saved address
  const selectedAddress = addrTab === "search" && geoAddress
    ? {
        id: "geo",
        label: geoAddress.line1 || geoAddress.label.split(",")[0],
        line1: geoAddress.line1,
        city: geoAddress.city,
        pincode: geoAddress.pincode,
        state: geoAddress.state,
        latitude: geoAddress.lat,
        longitude: geoAddress.lng,
        is_default: false,
      }
    : selectedSavedAddress;

  if (!service) return null;

  const handleConfirm = () => {
    if (!mode || !selectedAddress) return;
    if (mode === "scheduled" && !time) return;
    let scheduledAt: Date | undefined;
    if (mode === "scheduled") {
      const [h, mPart] = time.split(":");
      const isPM = time.includes("PM");
      const hour = (parseInt(h) % 12) + (isPM ? 12 : 0);
      scheduledAt = new Date(date);
      scheduledAt.setHours(hour, parseInt(mPart), 0, 0);
    }
    const addressString = `${selectedAddress.label} — ${[selectedAddress.line1, selectedAddress.city, selectedAddress.pincode]
      .filter(Boolean)
      .join(", ")}`;
    const booking = createBooking(
      service,
      mode,
      scheduledAt,
      undefined,
      preferences[service.id],
      addressString,
      undefined,
      selectedAddress.latitude ?? undefined,
      selectedAddress.longitude ?? undefined,
      targetPartnerId ?? undefined,
      targetPartnerId && personalMessage.trim() ? personalMessage.trim() : undefined,
    );
    // Navigate directly to live-status which handles the "searching" state
    navigate({ name: "live-status", bookingId: booking.id });
  };

  const hasPrefs = !!preferences[service.id];

  return (
    <div className="px-5 pb-6">
      <button
        onClick={goBack}
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

      {/* Optional: send this booking directly to a favorite partner.
          Bypasses the general matching queue; only the chosen partner sees
          it in their "Personal Booking Requests" section. */}
      {mode && favorites.length > 0 && (
        <div className="mt-5 animate-fade-in-up rounded-2xl border border-destructive/20 bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 fill-destructive text-destructive" />
            <p className="text-sm font-bold text-foreground">Send directly to a favorite?</p>
            {targetPartnerId && (
              <button
                type="button"
                onClick={() => { setTargetPartnerId(null); setPersonalMessage(""); }}
                className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Skip the matching queue and route this booking to one favorite partner.
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {favorites.map((f) => {
              const selected = targetPartnerId === f.partnerId;
              return (
                <button
                  key={f.partnerId}
                  type="button"
                  onClick={() => setTargetPartnerId(selected ? null : f.partnerId)}
                  className={cn(
                    "flex min-w-[100px] shrink-0 flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 transition-bounce",
                    selected
                      ? "border-destructive bg-destructive/5 shadow-card"
                      : "border-border bg-card hover:border-destructive/40",
                  )}
                >
                  <AvatarBadge
                    src={f.partnerAvatarUrl}
                    name={f.partnerName}
                    className="h-10 w-10 text-xs"
                  />
                  <span className="line-clamp-1 text-[11px] font-semibold text-foreground">
                    {f.partnerName.split(" ")[0]}
                  </span>
                  {selected && (
                    <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-destructive-foreground">
                      Selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {targetPartnerId && (
            <div className="mt-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Note for the partner (optional)
              </label>
              <textarea
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={2}
                maxLength={240}
                placeholder="e.g. Could you bring extra cleaning supplies?"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/40"
              />
            </div>
          )}
        </div>
      )}

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
          {availableTimeSlots.length === 0 ? (
            <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
              No slots available today — please select a future date.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {availableTimeSlots.map((t) => (
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
          )}
        </div>
      )}

      {/* Address selector — REQUIRED before booking */}
      <div className={cn(
        "mt-5 rounded-2xl bg-card shadow-soft",
        !selectedAddress && "ring-2 ring-destructive/30",
      )}>
        <button
          type="button"
          onClick={() => setAddressPickerOpen((v) => !v)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div className="flex min-w-0 items-center gap-2">
            <MapPin className={cn("h-4 w-4 shrink-0", selectedAddress ? "text-primary" : "text-destructive")} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {selectedAddress ? selectedAddress.label : "Select service address"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {selectedAddress
                  ? [selectedAddress.line1, selectedAddress.city, selectedAddress.pincode]
                      .filter(Boolean)
                      .join(", ")
                  : "Tap to choose or search an address"}
              </p>
            </div>
          </div>
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              addressPickerOpen && "rotate-90",
            )}
          />
        </button>

        {addressPickerOpen && (
          <div className="border-t border-border p-3 space-y-3">
            {/* Tab switch */}
            <div className="flex rounded-xl bg-secondary p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setAddrTab("saved")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 transition-smooth",
                  addrTab === "saved" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
                )}
              >
                <MapPin className="h-3 w-3" /> Saved
              </button>
              <button
                type="button"
                onClick={() => setAddrTab("search")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 transition-smooth",
                  addrTab === "search" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
                )}
              >
                <Search className="h-3 w-3" /> Search
              </button>
            </div>

            {addrTab === "saved" ? (
              <div className="space-y-2">
                {addresses.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                    No saved addresses yet.
                  </p>
                )}
                {addresses.map((a) => {
                  const active = a.id === (selectedSavedAddress?.id ?? null) && addrTab === "saved";
                  return (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => {
                        setSelectedAddressId(a.id);
                        setGeoAddress(null);
                        setAddressPickerOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-xl border p-3 text-left transition-smooth",
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      <MapPin className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-bold text-foreground">{a.label}</span>
                          {a.is_default && (
                            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {[a.line1, a.city, a.pincode].filter(Boolean).join(", ")}
                        </p>
                      </div>
                      {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => navigate({ name: "addresses" })}
                  className="flex w-full items-center justify-center gap-1 rounded-xl bg-secondary py-2 text-[11px] font-semibold text-foreground transition-smooth hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5" /> Manage addresses
                </button>
              </div>
            ) : (
              <AddressSelector
                placeholder="Type area, street or landmark…"
                onChange={(r) => {
                  setGeoAddress(r);
                  setSelectedAddressId(null);
                  setAddressPickerOpen(false);
                }}
              />
            )}
          </div>
        )}
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

      {/* Address required hint */}
      {mode && !selectedAddress && (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive animate-fade-in-up">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          A service address is required before you can request
        </p>
      )}

      <button
        disabled={!mode || !selectedAddress || (mode === "scheduled" && !time)}
        onClick={handleConfirm}
        className={cn(
          "mt-4 w-full rounded-2xl py-4 text-sm font-bold transition-bounce active:scale-[0.98]",
          mode && selectedAddress && (mode !== "scheduled" || time)
            ? "gradient-primary text-primary-foreground shadow-elevated hover:-translate-y-0.5"
            : "bg-muted text-muted-foreground cursor-not-allowed",
        )}
      >
        {!mode
          ? "Choose an option above"
          : !selectedAddress
            ? "Select a service address first"
            : mode === "scheduled" && !time
              ? "No available time slots"
              : mode === "instant"
                ? "Request Service Now"
                : "Schedule Service"}
      </button>
    </div>
  );
};