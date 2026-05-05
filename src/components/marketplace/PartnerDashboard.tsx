import { useEffect, useState } from "react";
import {
  MapPin, Star, TrendingUp, Wallet, CheckCircle2, X, Zap, CalendarClock, Briefcase, Eye,
  CalendarDays, Plus, Trash2, ChevronRight, Loader2, Home,
} from "lucide-react";
import type { DayOfWeek, Professional } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { usePartnerData } from "@/contexts/PartnerDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AddressSelector, type GeoAddress } from "./AddressSelector";

const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const INSTANT_RADIUS_KM = 10;
const SCHEDULED_RADIUS_KM = 30;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export const PartnerDashboard = () => {
  const { bookings, availableBookings, navigate, partnerAcceptBooking } = useApp();
  const { user, profile } = useAuth();
  const {
    schedule: dbSchedule,
    saveSchedule,
    availableNow,
    listedToday,
    setAvailableNow,
    setListedToday,
    earningsToday,
    earningsTotal,
    jobsCompletedTotal,
    averageRating,
  } = usePartnerData();
  const { push } = useNotifications();

  const [partnerLat, setPartnerLat] = useState<number | null>(null);
  const [partnerLng, setPartnerLng] = useState<number | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<{ days: DayOfWeek[]; start: string; end: string }[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [homeGeo, setHomeGeo] = useState<GeoAddress | null>(null);
  const [savingHome, setSavingHome] = useState(false);
  const [showHomeSelector, setShowHomeSelector] = useState(false);

  // Partner's saved home location (from profiles) — used for scheduled booking radius
  const homeLat = profile?.home_lat ?? null;
  const homeLng = profile?.home_lng ?? null;

  // Get partner's live GPS for instant-booking radius
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        console.log(`[partner-location] live GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setPartnerLat(latitude);
        setPartnerLng(longitude);
      },
      () => { console.warn("[partner-location] live GPS unavailable"); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  // Log home area whenever it changes
  useEffect(() => {
    if (homeLat && homeLng) {
      console.log(`[partner-location] home area: ${homeLat.toFixed(6)}, ${homeLng.toFixed(6)}`);
    }
  }, [homeLat, homeLng]);

  // Hydrate local form state from persisted schedule
  useEffect(() => {
    if (dbSchedule.length > 0) {
      setSchedule(dbSchedule.map((s) => ({ days: s.days, start: s.start, end: s.end })));
    } else {
      setSchedule([{ days: ["Mon", "Wed", "Fri"], start: "17:00", end: "22:00" }]);
    }
  }, [dbSchedule]);

  // Pending requests = anything still in 'searching' with no partner assigned.
  // Defensive guard against stale rows after a realtime reconnect.
  const pendingRequests = availableBookings.filter(
    (b) => b.status === "searching" && !b.partnerUserId,
  );

  // Distance filter shared by both instant and reserved.
  // Reserved (scheduled) bookings MUST evaluate against the partner's saved
  // HOME location — never live GPS — per product spec, and run independently
  // of the instant flow so they show up even when the partner is not live.
  const withinRadius = (b: typeof pendingRequests[number], radiusKm: number, refLat: number | null, refLng: number | null): boolean => {
    if (!b.userLat || !b.userLng) {
      console.warn(`[distance] booking ${b.id} (${b.type}) has no user coordinates — showing by default`);
      return true;
    }
    if (refLat == null || refLng == null) {
      console.warn(`[distance] booking ${b.id} (${b.type}): no partner reference location yet — showing by default`);
      return true;
    }
    const dist = haversineKm(refLat, refLng, b.userLat, b.userLng);
    const pass = dist <= radiusKm;
    console.log(
      `[distance] booking ${b.id} (${b.type}):` +
      ` user=(${b.userLat.toFixed(4)}, ${b.userLng.toFixed(4)})` +
      ` partner_ref=(${refLat.toFixed(4)}, ${refLng.toFixed(4)})` +
      ` dist=${dist.toFixed(2)} km  max=${radiusKm} km  → ${pass ? "SHOW" : "HIDE"}`,
    );
    return pass;
  };

  // Instant: live GPS, ≤ 10 km
  const instantRequests = pendingRequests.filter(
    (b) => b.type === "instant" && withinRadius(b, INSTANT_RADIUS_KM, partnerLat, partnerLng),
  );

  // Reserved (scheduled): partner's DEFAULT home location, ≤ 30 km.
  // Falls back to live GPS only if the partner has not yet set a home area
  // (so a brand-new partner still sees something while we wait for them to
  // configure their default).
  const reservedRefLat = homeLat ?? partnerLat;
  const reservedRefLng = homeLng ?? partnerLng;
  const reservedRequests = pendingRequests.filter(
    (b) => b.type === "scheduled" && withinRadius(b, SCHEDULED_RADIUS_KM, reservedRefLat, reservedRefLng),
  );

  // Partner's active jobs (confirmed / in-progress)
  const activeJobs = bookings.filter(
    (b) => (b.status === "confirmed" || b.status === "in-progress") && b.partnerUserId === user?.id,
  );

  const respond = async (id: string, action: "accept" | "decline") => {
    if (action === "decline") {
      // Just remove from the local list (the booking stays searching in DB for other partners)
      push({ kind: "info", title: "Request declined" });
      return;
    }
    if (!user) return;
    setAccepting(id);
    try {
      const partnerName = (user.user_metadata?.full_name as string | undefined)
        ?? user.email?.split("@")[0]
        ?? "Partner";
      const professional: Professional = {
        id: user.id,
        name: partnerName,
        rating: averageRating ?? 5.0,
        jobs: jobsCompletedTotal,
        avatar: partnerName.slice(0, 2).toUpperCase(),
        eta: "8 min",
      };
      const result = await partnerAcceptBooking(id, professional);
      if (result.ok) {
        navigate({ name: "partner-job", bookingId: id });
      } else {
        push({ kind: "warning", title: result.reason ?? "Could not accept job" });
      }
    } finally {
      setAccepting(null);
    }
  };

  const toggleDay = (i: number, day: DayOfWeek) => {
    setSchedule((prev) =>
      prev.map((slot, idx) =>
        idx !== i
          ? slot
          : { ...slot, days: slot.days.includes(day) ? slot.days.filter((d) => d !== day) : [...slot.days, day] },
      ),
    );
  };
  const updateSlot = (i: number, field: "start" | "end", value: string) => {
    setSchedule((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  };
  const addSlot = () => setSchedule((prev) => [...prev, { days: ["Mon"], start: "09:00", end: "17:00" }]);
  const removeSlot = (i: number) => setSchedule((prev) => prev.filter((_, idx) => idx !== i));
  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      await saveSchedule(schedule.map((s, i) => ({ days: s.days, start: s.start, end: s.end, position: i })));
      push({ kind: "success", title: "Schedule saved", body: `${schedule.length} slot(s) synced` });
    } catch (e) {
      console.error("Couldn't save schedule", e);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSaveHomeArea = async (geo: GeoAddress) => {
    if (!user) return;
    setSavingHome(true);
    try {
      await supabase
        .from("profiles")
        .update({ home_lat: geo.lat, home_lng: geo.lng })
        .eq("id", user.id);
      setHomeGeo(geo);
      setShowHomeSelector(false);
      push({ kind: "success", title: "Home area updated", body: geo.line1 || geo.label.split(",")[0] });
    } catch {
      push({ kind: "warning", title: "Couldn't save home area. Try again." });
    } finally {
      setSavingHome(false);
    }
  };

  return (
    <div className="space-y-5 px-5 pb-6">
      {/* Two availability switches — with clear separation of concerns */}
      <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
        <SwitchRow
          icon={<Zap className="h-4 w-4" />}
          title="Available right now"
          subtitle="Receive instant real-time job requests"
          on={availableNow}
          onChange={async (v) => {
            await setAvailableNow(v);
            push({ kind: v ? "success" : "info", title: v ? "You're live — instant requests enabled" : "Instant requests paused" });
            // First-time only: if partner has never set a home area, seed it with
            // the current GPS so scheduled-booking radius has a reference.
            // NEVER overwrite an explicitly chosen home area — that's a data loss
            // bug that would silently replace a search-picked location with GPS.
            const noHomeSet = homeLat == null || homeLng == null;
            if (v && user && noHomeSet && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                ({ coords }) => {
                  console.log(`[partner-location] seeding home area from GPS (no prior home set): ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
                  supabase.from("profiles").update({ home_lat: coords.latitude, home_lng: coords.longitude }).eq("id", user.id).then(() => {});
                },
                () => {},
                { enableHighAccuracy: true, timeout: 8000 },
              );
            }
          }}
          color="success"
        />
        <div className="border-t border-border" />
        <SwitchRow
          icon={<Eye className="h-4 w-4" />}
          title="Show in today's listings"
          subtitle="Profile visible for scheduled bookings only"
          on={listedToday}
          onChange={async (v) => {
            await setListedToday(v);
            push({ kind: v ? "success" : "info", title: v ? "Listed in today's scheduled bookings" : "Removed from today's listings" });
          }}
          color="primary"
        />
      </div>

      {/* Home area — used as reference for scheduled booking radius */}
      <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Home className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Home area</p>
              <p className="text-[11px] text-muted-foreground">
                Used as reference for scheduled bookings ({SCHEDULED_RADIUS_KM} km radius)
              </p>
            </div>
          </div>
          {!showHomeSelector && (
            <button
              onClick={() => setShowHomeSelector(true)}
              className="rounded-lg bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-foreground"
            >
              {homeLat || homeGeo ? "Change" : "Set"}
            </button>
          )}
        </div>

        {(homeGeo || homeLat) && !showHomeSelector && (
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              {homeGeo ? (
                <>
                  <p className="truncate text-xs font-semibold text-foreground">
                    {homeGeo.line1 || homeGeo.label.split(",")[0]}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {[homeGeo.city, homeGeo.state].filter(Boolean).join(", ")}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Home area saved</p>
              )}
            </div>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
          </div>
        )}

        {showHomeSelector && (
          <div className="space-y-2">
            <AddressSelector
              placeholder="Search your home area or neighbourhood…"
              onChange={(geo) => { setHomeGeo(geo); }}
            />
            {homeGeo && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setHomeGeo(null); setShowHomeSelector(false); }}
                  className="flex-1 rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingHome}
                  onClick={() => handleSaveHomeArea(homeGeo)}
                  className="flex-1 rounded-xl gradient-primary py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
                >
                  {savingHome ? <><Loader2 className="inline h-3.5 w-3.5 animate-spin mr-1" />Saving…</> : "Confirm area"}
                </button>
              </div>
            )}
            {!homeGeo && (
              <button
                type="button"
                onClick={() => setShowHomeSelector(false)}
                className="w-full rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Schedule editor */}
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold text-foreground">Weekly availability</p>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Sets your profile availability for <span className="font-semibold text-foreground">scheduled bookings only</span>.
          Not used for instant real-time requests.
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
            onClick={handleSaveSchedule}
            disabled={savingSchedule}
            className="rounded-xl gradient-primary py-2 text-xs font-bold text-primary-foreground shadow-soft disabled:opacity-60"
          >
            {savingSchedule ? "Saving…" : "Save schedule"}
          </button>
        </div>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Wallet, label: "Today", value: `₹${earningsToday.toLocaleString("en-IN")}`, color: "text-primary bg-primary/10" },
          { icon: TrendingUp, label: "Jobs", value: jobsCompletedTotal.toString(), color: "text-accent bg-accent/10" },
          { icon: Star, label: "Rating", value: averageRating != null ? averageRating.toFixed(1) : "—", color: "text-warning bg-warning/15" },
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

      {/* Credit account */}
      <button
        onClick={() => navigate({ name: "partner-earnings" })}
        className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 shadow-soft transition-smooth hover:bg-secondary/40"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
          <Wallet className="h-5 w-5" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-foreground">Credit account</p>
          <p className="text-[11px] text-muted-foreground">
            Lifetime earnings · ₹{earningsTotal.toLocaleString("en-IN")}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold text-foreground">Active Jobs</h2>
          <div className="space-y-3">
            {activeJobs.map((j) => (
              <button
                key={j.id}
                onClick={() => navigate({ name: "partner-job", bookingId: j.id })}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 shadow-soft transition-smooth hover:bg-secondary/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="truncate text-sm font-bold text-foreground">{j.service.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{j.address}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-primary">₹{j.service.price}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Instant Requests — gated by "Available right now". Live GPS, 10 km radius. */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Instant Requests</h2>
            <p className="text-[10px] text-muted-foreground">Real-time · {INSTANT_RADIUS_KM} km of your live location</p>
          </div>
          {availableNow && instantRequests.length > 0 && (
            <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase text-warning">
              {instantRequests.length} new
            </span>
          )}
        </div>
        {!availableNow ? (
          <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
            <Zap className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-semibold text-foreground">Instant requests are off</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Toggle "Available right now" above to start receiving real-time job requests
            </p>
          </div>
        ) : instantRequests.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
            <div className="flex items-center justify-center gap-1.5 text-success mb-2">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Live</span>
            </div>
            <p className="text-sm font-semibold text-foreground">Waiting for requests</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No instant requests within {INSTANT_RADIUS_KM} km right now.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {instantRequests.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                refLat={partnerLat}
                refLng={partnerLng}
                accepting={accepting === r.id}
                onAccept={() => respond(r.id, "accept")}
                onDecline={() => respond(r.id, "decline")}
              />
            ))}
          </div>
        )}
      </section>

      {/* Reserved Requests — gated by "Show in today's listings". Home location, 30 km radius.
           Independent of availableNow so partners receive scheduled jobs even when not live. */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Reserved Requests</h2>
            <p className="text-[10px] text-muted-foreground">Scheduled · {SCHEDULED_RADIUS_KM} km of your home area</p>
          </div>
          {listedToday && reservedRequests.length > 0 && (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
              {reservedRequests.length} new
            </span>
          )}
        </div>
        {!listedToday ? (
          <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
            <CalendarClock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-semibold text-foreground">Listings are off</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Toggle "Show in today's listings" above to receive reserved bookings
            </p>
          </div>
        ) : reservedRequests.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
            <div className="flex items-center justify-center gap-1.5 text-accent mb-2">
              <CalendarClock className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Listed</span>
            </div>
            <p className="text-sm font-semibold text-foreground">No reserved bookings nearby</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No scheduled bookings within {SCHEDULED_RADIUS_KM} km of your home area.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservedRequests.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                refLat={reservedRefLat}
                refLng={reservedRefLng}
                accepting={accepting === r.id}
                onAccept={() => respond(r.id, "accept")}
                onDecline={() => respond(r.id, "decline")}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

interface RequestCardProps {
  request: import("@/types").Booking;
  refLat: number | null;
  refLng: number | null;
  accepting: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const RequestCard = ({ request: r, refLat, refLng, accepting, onAccept, onDecline }: RequestCardProps) => {
  const distKm =
    refLat != null && refLng != null && r.userLat != null && r.userLng != null
      ? haversineKm(refLat, refLng, r.userLat, r.userLng).toFixed(1) + " km"
      : null;
  const isReserved = r.type === "scheduled";
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-card animate-fade-in-up">
      <div className="flex items-center justify-between bg-secondary px-4 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {isReserved ? (
            <><CalendarClock className="h-3.5 w-3.5 text-accent" /><span className="text-accent">Reserved</span></>
          ) : (
            <><Zap className="h-3.5 w-3.5 text-primary" /><span className="text-primary">Instant Request</span></>
          )}
        </div>
        <span className="text-xs font-bold text-foreground">₹{r.service.price}</span>
      </div>
      <div className="p-4">
        <p className="text-sm font-bold text-foreground">{r.service.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Customer request</p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          {distKm && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-primary" /> {distKm}
            </span>
          )}
          <span className="truncate">{r.address}</span>
        </div>
        {isReserved && r.scheduledAt && (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-foreground">
            <CalendarClock className="h-3 w-3 text-accent" />
            {r.scheduledAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={onDecline}
            disabled={accepting}
            className="flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-smooth hover:bg-secondary disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Decline
          </button>
          <button
            onClick={onAccept}
            disabled={accepting}
            className="flex items-center justify-center gap-1 rounded-xl gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-soft transition-bounce active:scale-95 disabled:opacity-60"
          >
            {accepting ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Accepting…</>
            ) : (
              <><CheckCircle2 className="h-3.5 w-3.5" /> Accept</>
            )}
          </button>
        </div>
      </div>
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
