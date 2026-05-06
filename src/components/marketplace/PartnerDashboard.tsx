import { useEffect, useState } from "react";
import {
  MapPin, Star, TrendingUp, Wallet, CheckCircle2, X, Zap, CalendarClock, Briefcase, Eye,
  CalendarDays, Plus, Trash2, ChevronRight, Loader2, Home, Heart, MessageSquare, Sparkles,
} from "lucide-react";
import type { DayOfWeek, Professional } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { usePartnerData } from "@/contexts/PartnerDataContext";
import { useUserData } from "@/contexts/UserDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBadges } from "@/contexts/BadgeContext";
import { cn } from "@/lib/utils";
import { TierProgressCard, BadgeChips } from "./TrustBadges";

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
    trustStats,
  } = usePartnerData();
  const { badgesForPartner } = useBadges();
  const { push } = useNotifications();

  const { defaultAddress } = useUserData();

  const [partnerLat, setPartnerLat] = useState<number | null>(null);
  const [partnerLng, setPartnerLng] = useState<number | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  // IDs the partner has declined locally — we hide them from the list so the
  // card doesn't re-render after the click. The booking stays in 'searching'
  // state in the DB so other partners can still pick it up.
  const [declinedIds, setDeclinedIds] = useState<Set<string>>(() => new Set());
  const [schedule, setSchedule] = useState<{ days: DayOfWeek[]; start: string; end: string }[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Partner's saved-address default doubles as their reserved-booking home.
  // This replaces the standalone "Home area" UI: there's a single source of
  // truth for the partner's home location now (the address book), and
  // reserved bookings match against its coordinates.
  const homeLat = defaultAddress?.latitude ?? null;
  const homeLng = defaultAddress?.longitude ?? null;

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

  // Log default-address coordinates whenever they change so distance debugging
  // is symmetrical with the live-GPS log above.
  useEffect(() => {
    if (homeLat && homeLng) {
      console.log(`[partner-location] default address: ${homeLat.toFixed(6)}, ${homeLng.toFixed(6)}`);
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
  // Defensive guard against stale rows after a realtime reconnect — even if
  // the upstream context briefly holds a stale row, it is hidden here.
  const pendingRequests = availableBookings.filter((b) => {
    if (b.status !== "searching") return false;
    if (b.partnerUserId) return false;
    // Reserved bookings whose scheduled time has passed are no longer
    // actionable — drop them so they cannot ghost back into the UI on refresh.
    if (b.type === "scheduled" && b.scheduledAt && b.scheduledAt.getTime() < Date.now()) {
      return false;
    }
    // Locally-declined rows stay searchable for other partners but are
    // hidden from this partner's dashboard.
    if (declinedIds.has(b.id)) return false;
    return true;
  });

  // Distance filter — shared signature, but each caller must pass the
  // correct reference location for its booking type. There is NO implicit
  // fallback inside this helper: callers decide.
  const withinRadius = (b: typeof pendingRequests[number], radiusKm: number, refLat: number | null, refLng: number | null): boolean => {
    if (!b.userLat || !b.userLng) {
      console.warn(`[distance] booking ${b.id} (${b.type}) has no user coordinates — hiding`);
      return false;
    }
    if (refLat == null || refLng == null) {
      console.warn(`[distance] booking ${b.id} (${b.type}): no partner reference location yet — hiding`);
      return false;
    }
    const dist = haversineKm(refLat, refLng, b.userLat, b.userLng);
    const pass = dist <= radiusKm;
    console.log(
      `[distance] booking ${b.id} type=${b.type}` +
      ` service_addr=(${b.userLat.toFixed(4)}, ${b.userLng.toFixed(4)})` +
      ` partner_ref=(${refLat.toFixed(4)}, ${refLng.toFixed(4)})` +
      ` dist=${dist.toFixed(2)} km  max=${radiusKm} km  → ${pass ? "SHOW" : "HIDE"}`,
    );
    return pass;
  };

  // Personal requests targeted directly at THIS partner — bypass the
  // distance/availability filters entirely, since the customer chose us.
  const personalRequests = pendingRequests.filter(
    (b) => b.requestedPartnerId === user?.id,
  );

  // Instant: partner's CURRENT (live GPS) location, ≤ 10 km.
  // Personal-request rows are surfaced separately and excluded here.
  const instantRequests = pendingRequests.filter(
    (b) =>
      b.type === "instant" &&
      !b.requestedPartnerId &&
      withinRadius(b, INSTANT_RADIUS_KM, partnerLat, partnerLng),
  );

  // Reserved (scheduled): partner's DEFAULT (saved home) location, ≤ 30 km.
  // STRICT: never falls back to live GPS — if the partner has not set a home
  // area, no reserved requests are shown (the empty state prompts them to
  // configure it). Mixing in current GPS would silently break the spec.
  const reservedRefLat = homeLat;
  const reservedRefLng = homeLng;
  const reservedHomeSet = reservedRefLat != null && reservedRefLng != null;
  console.log(
    `[partner-location] current=(${partnerLat?.toFixed(4) ?? "null"}, ${partnerLng?.toFixed(4) ?? "null"})` +
    ` default=(${homeLat?.toFixed(4) ?? "null"}, ${homeLng?.toFixed(4) ?? "null"})`,
  );
  const reservedRequests = reservedHomeSet
    ? pendingRequests.filter(
        (b) =>
          b.type === "scheduled" &&
          !b.requestedPartnerId &&
          withinRadius(b, SCHEDULED_RADIUS_KM, reservedRefLat, reservedRefLng),
      )
    : [];

  // Partner's active jobs (confirmed / in-progress)
  const activeJobs = bookings.filter(
    (b) => (b.status === "confirmed" || b.status === "in-progress") && b.partnerUserId === user?.id,
  );

  const respond = async (id: string, action: "accept" | "decline") => {
    if (action === "decline") {
      // Optimistic local hide — the row stays 'searching' in the DB so other
      // partners can still see and accept it. We use a brief "Declining…"
      // state to confirm the click registered, then commit to declinedIds.
      console.log("[partner/decline] click", { bookingId: id });
      setDeclining(id);
      // Tiny micro-delay so the spinner is perceivable and double-clicks
      // can't double-fire the push notification.
      await new Promise((r) => setTimeout(r, 120));
      setDeclinedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setDeclining(null);
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
        // 0 sentinels "no reviews yet" — UI renders dynamically from
        // ratingForPro() so this number is never displayed to users.
        rating: averageRating ?? 0,
        jobs: jobsCompletedTotal,
        avatar: partnerName.slice(0, 2).toUpperCase(),
        avatarUrl: profile?.avatar_url ?? undefined,
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

  // Trust ecosystem inputs — fall back to a stub when stats aren't loaded yet
  // so the card renders something predictable on first paint.
  const myStats = trustStats ?? {
    completedBookings: jobsCompletedTotal,
    totalBookings: jobsCompletedTotal,
    partnerCancellations: 0,
    averageRating,
    ratedBookings: averageRating != null ? jobsCompletedTotal : 0,
    responseRatePct: null,
    punctualityMinutesLate: null,
    repeatCustomerRatio: null,
  };
  const myBadges = user
    ? badgesForPartner(user.id, myStats, { aadhaarVerified: profile?.aadhaar_verified })
    : [];

  return (
    <div className="space-y-5 px-5 pb-6">
      {/* Trust progress + tier — top of the partner home */}
      {user && (
        <div className="space-y-2">
          <TierProgressCard stats={myStats} badgeCount={myBadges.length} />
          {myBadges.length > 0 && (
            <BadgeChips
              partnerId={user.id}
              stats={myStats}
              aadhaarVerified={profile?.aadhaar_verified}
              size="md"
              className="px-1"
            />
          )}
        </div>
      )}

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
                declining={declining === r.id}
                onAccept={() => respond(r.id, "accept")}
                onDecline={() => respond(r.id, "decline")}
              />
            ))}
          </div>
        )}
      </section>

      {/* Personal Requests — direct from a customer who favorited this partner.
           Bypass distance/availability filters; show with premium styling. */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-1.5 text-base font-bold text-foreground">
              <Heart className="h-4 w-4 fill-destructive text-destructive" />
              Personal Booking Requests
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Direct requests from customers who favorited you · always shown
            </p>
          </div>
          {personalRequests.length > 0 && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
              {personalRequests.length} new
            </span>
          )}
        </div>
        {personalRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-soft">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-semibold text-foreground">No personal requests yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Customers who favorite you can send bookings here directly.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {personalRequests.map((r) => (
              <PersonalRequestCard
                key={r.id}
                request={r}
                accepting={accepting === r.id}
                declining={declining === r.id}
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
        ) : !reservedHomeSet ? (
          <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
            <Home className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-semibold text-foreground">Add a default address</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Reserved bookings match against your default saved address. Add one in Profile → Saved Addresses.
            </p>
            <button
              onClick={() => navigate({ name: "addresses" })}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-soft"
            >
              <Plus className="h-3.5 w-3.5" /> Add address
            </button>
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
  declining: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const RequestCard = ({ request: r, refLat, refLng, accepting, declining, onAccept, onDecline }: RequestCardProps) => {
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
        {/* Click targets — explicit type=button + relative/z-10 so a parent
            decoration can never sit on top and intercept the tap. */}
        <div className="mt-3 grid grid-cols-2 gap-2 relative z-10">
          <button
            type="button"
            onClick={onDecline}
            disabled={accepting || declining}
            className="flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-smooth hover:bg-secondary active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {declining ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Declining…</>
            ) : (
              <><X className="h-3.5 w-3.5" /> Decline</>
            )}
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={accepting || declining}
            className="flex items-center justify-center gap-1 rounded-xl gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-soft transition-bounce active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
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

interface PersonalRequestCardProps {
  request: import("@/types").Booking;
  accepting: boolean;
  declining: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const PersonalRequestCard = ({
  request: r, accepting, declining, onAccept, onDecline,
}: PersonalRequestCardProps) => {
  const isReserved = r.type === "scheduled";
  return (
    <div className="overflow-hidden rounded-2xl border border-destructive/30 bg-card shadow-card animate-fade-in-up">
      {/* Premium ribbon */}
      <div className="flex items-center justify-between gradient-primary px-4 py-2 text-primary-foreground">
        <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider">
          <Heart className="h-3.5 w-3.5 fill-current" />
          Personal Request
        </div>
        <span className="text-xs font-bold">₹{r.service.price}</span>
      </div>
      <div className="p-4">
        <p className="text-sm font-bold text-foreground">{r.service.name}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          {isReserved ? (
            <><CalendarClock className="h-3 w-3 text-accent" /> Scheduled booking</>
          ) : (
            <><Zap className="h-3 w-3 text-primary" /> Instant booking</>
          )}
        </p>
        {r.personalMessage && (
          <div className="mt-2 rounded-lg bg-secondary px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Customer note
            </p>
            <p className="mt-0.5 text-xs italic text-foreground">{r.personalMessage}</p>
          </div>
        )}
        <div className="mt-2 flex items-start gap-1 text-[11px] text-muted-foreground">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          <span className="line-clamp-2">{r.address}</span>
        </div>
        {isReserved && r.scheduledAt && (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-foreground">
            <CalendarClock className="h-3 w-3 text-accent" />
            {r.scheduledAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 relative z-10">
          <button
            type="button"
            onClick={onDecline}
            disabled={accepting || declining}
            className="flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-smooth hover:bg-secondary active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {declining ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Declining…</>
            ) : (
              <><X className="h-3.5 w-3.5" /> Decline</>
            )}
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={accepting || declining}
            className="flex items-center justify-center gap-1 rounded-xl gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-soft transition-bounce active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
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
