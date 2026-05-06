import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import type { DayOfWeek } from "@/types";

export interface PartnerScheduleSlot {
  id: string;
  days: DayOfWeek[];
  start: string;
  end: string;
  position: number;
}

export interface EarningEntry {
  id: string;
  bookingId: string;
  serviceName: string;
  amount: number;
  customerName: string | null;
  earnedAt: Date;
}

/** Aggregate stats used by the trust ecosystem (tier, reliability, badges). */
export interface PartnerTrustStats {
  completedBookings: number;
  totalBookings: number;
  partnerCancellations: number;
  averageRating: number | null;
  ratedBookings: number;
  responseRatePct: number | null;
  punctualityMinutesLate: number | null;
  repeatCustomerRatio: number | null;
}

interface PartnerDataValue {
  // weekly schedule
  schedule: PartnerScheduleSlot[];
  loadingSchedule: boolean;
  refreshSchedule: () => Promise<void>;
  saveSchedule: (slots: Omit<PartnerScheduleSlot, "id">[]) => Promise<void>;

  // availability flags
  availableNow: boolean;
  listedToday: boolean;
  setAvailableNow: (v: boolean) => Promise<void>;
  setListedToday: (v: boolean) => Promise<void>;

  // earnings ledger
  earnings: EarningEntry[];
  refreshEarnings: () => Promise<void>;
  earningsToday: number;
  earningsTotal: number;
  jobsCompletedTotal: number;
  averageRating: number | null;

  /** Trust-system stats for the *current* partner. Null when not a partner. */
  trustStats: PartnerTrustStats | null;
}

const PartnerDataContext = createContext<PartnerDataValue | null>(null);

export const PartnerDataProvider = ({ children }: { children: ReactNode }) => {
  const { user, role } = useAuth();
  const [schedule, setSchedule] = useState<PartnerScheduleSlot[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [availableNow, setAvailableNowState] = useState(false);
  const [listedToday, setListedTodayState] = useState(false);
  const [earnings, setEarnings] = useState<EarningEntry[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [jobsCompletedTotal, setJobsCompletedTotal] = useState(0);
  const [trustStats, setTrustStats] = useState<PartnerTrustStats | null>(null);

  const isPartner = role === "partner" && !!user;

  const refreshSchedule = useCallback(async () => {
    if (!isPartner) {
      setSchedule([]);
      return;
    }
    setLoadingSchedule(true);
    const { data, error } = await supabase
      .from("partner_schedule")
      .select("id, days, start_time, end_time, position")
      .eq("partner_id", user!.id)
      .order("position", { ascending: true });
    setLoadingSchedule(false);
    if (error) {
      console.error("Failed to load schedule", error);
      return;
    }
    setSchedule(
      (data ?? []).map((row) => ({
        id: row.id,
        days: (row.days ?? []) as DayOfWeek[],
        start: row.start_time,
        end: row.end_time,
        position: row.position ?? 0,
      })),
    );
  }, [isPartner, user]);

  const saveSchedule: PartnerDataValue["saveSchedule"] = useCallback(
    async (slots) => {
      if (!isPartner) return;
      // Replace-all strategy: delete then insert. Simpler than diffing.
      const { error: delErr } = await supabase
        .from("partner_schedule")
        .delete()
        .eq("partner_id", user!.id);
      if (delErr) {
        console.error("Failed to clear schedule", delErr);
        throw delErr;
      }
      if (slots.length === 0) {
        setSchedule([]);
        return;
      }
      const rows = slots.map((s, i) => ({
        partner_id: user!.id,
        days: s.days,
        start_time: s.start,
        end_time: s.end,
        position: s.position ?? i,
      }));
      const { error: insErr } = await supabase.from("partner_schedule").insert(rows);
      if (insErr) {
        console.error("Failed to save schedule", insErr);
        throw insErr;
      }
      await refreshSchedule();
    },
    [isPartner, user, refreshSchedule],
  );

  const loadAvailability = useCallback(async () => {
    if (!isPartner) {
      setAvailableNowState(false);
      setListedTodayState(false);
      return;
    }
    const { data } = await supabase
      .from("partner_availability")
      .select("available_now, listed_today")
      .eq("partner_id", user!.id)
      .maybeSingle();
    if (data) {
      setAvailableNowState(!!data.available_now);
      setListedTodayState(!!data.listed_today);
    } else {
      // create default row
      await supabase
        .from("partner_availability")
        .insert({ partner_id: user!.id, available_now: false, listed_today: false });
    }
  }, [isPartner, user]);

  const upsertAvailability = useCallback(
    async (patch: Partial<{ available_now: boolean; listed_today: boolean }>) => {
      if (!isPartner) return;
      await supabase
        .from("partner_availability")
        .upsert(
          { partner_id: user!.id, ...patch },
          { onConflict: "partner_id" },
        );
    },
    [isPartner, user],
  );

  const setAvailableNow: PartnerDataValue["setAvailableNow"] = useCallback(
    async (v) => {
      setAvailableNowState(v);
      await upsertAvailability({ available_now: v });
    },
    [upsertAvailability],
  );
  const setListedToday: PartnerDataValue["setListedToday"] = useCallback(
    async (v) => {
      setListedTodayState(v);
      await upsertAvailability({ listed_today: v });
    },
    [upsertAvailability],
  );

  const refreshEarnings = useCallback(async () => {
    if (!isPartner) {
      setEarnings([]);
      return;
    }
    const { data } = await supabase
      .from("partner_earnings")
      .select("id, booking_id, service_name, amount, customer_name, earned_at")
      .eq("partner_id", user!.id)
      .order("earned_at", { ascending: false });
    setEarnings(
      (data ?? []).map((row) => ({
        id: row.id,
        bookingId: row.booking_id,
        serviceName: row.service_name,
        amount: Number(row.amount ?? 0),
        customerName: row.customer_name,
        earnedAt: new Date(row.earned_at),
      })),
    );

    // Pull every booking row this partner has touched — we need it for the
    // full trust-stats aggregate, not just rating + completed count.
    const { data: stats } = await supabase
      .from("bookings")
      .select("rating, status, user_id, scheduled_at, arrived_at, cancelled_at, cancellation_reason")
      .eq("partner_id", user!.id);
    if (!stats) {
      setTrustStats(null);
      return;
    }
    const completed = stats.filter((s) => s.status === "completed");
    setJobsCompletedTotal(completed.length);

    const rated = stats.filter((s) => typeof s.rating === "number");
    let avg: number | null = null;
    if (rated.length > 0) {
      const sum = rated.reduce((acc, r) => acc + (r.rating ?? 0), 0);
      avg = Math.round((sum / rated.length) * 10) / 10;
    }
    setAverageRating(avg);

    // Trust-stats aggregate. All numbers come straight from the bookings table.
    // - partnerCancellations is approximated by status=cancelled where the
    //   cancellation_reason hints at the partner side (we don't have a direct
    //   field). Customers cancelling explicitly will widen this slightly,
    //   which is acceptable until a dedicated `cancelled_by` column ships.
    const partnerCancellations = stats.filter(
      (s) => s.status === "cancelled" && (s.cancellation_reason ?? "").toLowerCase().includes("partner"),
    ).length;

    // Repeat-customer ratio: distinct customers with >1 completed booking
    // ÷ distinct customers overall. Null when there are no completed jobs.
    const completedByUser = new Map<string, number>();
    for (const row of completed) {
      if (!row.user_id) continue;
      completedByUser.set(row.user_id, (completedByUser.get(row.user_id) ?? 0) + 1);
    }
    const repeats = Array.from(completedByUser.values()).filter((n) => n > 1).length;
    const distinctCustomers = completedByUser.size;
    const repeatCustomerRatio = distinctCustomers > 0 ? repeats / distinctCustomers : null;

    // Punctuality: average arrival lateness (minutes) for bookings with both
    // a scheduled and arrival timestamp. Negative means early — we clamp
    // those to 0 in computeReliability.
    const punctualitySamples = stats
      .filter((s) => s.arrived_at && s.scheduled_at)
      .map((s) => {
        const lateMs = new Date(s.arrived_at!).getTime() - new Date(s.scheduled_at!).getTime();
        return lateMs / 60000;
      });
    const punctualityMinutesLate =
      punctualitySamples.length > 0
        ? punctualitySamples.reduce((a, b) => a + b, 0) / punctualitySamples.length
        : null;

    // Response rate: % of partner-touched rows that ended in confirmed/completed
    // (not cancelled). Proxy until we track per-request acceptance.
    const respondedTotal = stats.length;
    const responded = stats.filter(
      (s) => s.status !== "cancelled" && s.status !== "refunded",
    ).length;
    const responseRatePct =
      respondedTotal > 0 ? Math.round((responded / respondedTotal) * 100) : null;

    setTrustStats({
      completedBookings: completed.length,
      totalBookings: stats.length,
      partnerCancellations,
      averageRating: avg,
      ratedBookings: rated.length,
      responseRatePct,
      punctualityMinutesLate,
      repeatCustomerRatio,
    });
  }, [isPartner, user]);

  // Load when becoming a partner
  useEffect(() => {
    if (!isPartner) {
      setSchedule([]);
      setEarnings([]);
      setAvailableNowState(false);
      setListedTodayState(false);
      setAverageRating(null);
      setJobsCompletedTotal(0);
      setTrustStats(null);
      return;
    }
    refreshSchedule();
    loadAvailability();
    refreshEarnings();
  }, [isPartner, refreshSchedule, loadAvailability, refreshEarnings]);

  // Realtime updates for earnings (trigger inserts row)
  useEffect(() => {
    if (!isPartner) return;
    const channel = supabase
      .channel(`partner-earnings-${user!.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "partner_earnings", filter: `partner_id=eq.${user!.id}` },
        () => {
          refreshEarnings();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isPartner, user, refreshEarnings]);

  const earningsToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const t = start.getTime();
    return earnings
      .filter((e) => e.earnedAt.getTime() >= t)
      .reduce((s, e) => s + e.amount, 0);
  }, [earnings]);
  const earningsTotal = useMemo(
    () => earnings.reduce((s, e) => s + e.amount, 0),
    [earnings],
  );

  return (
    <PartnerDataContext.Provider
      value={{
        schedule,
        loadingSchedule,
        refreshSchedule,
        saveSchedule,
        availableNow,
        listedToday,
        setAvailableNow,
        setListedToday,
        earnings,
        refreshEarnings,
        earningsToday,
        earningsTotal,
        jobsCompletedTotal,
        averageRating,
        trustStats,
      }}
    >
      {children}
    </PartnerDataContext.Provider>
  );
};

export const usePartnerData = () => {
  const ctx = useContext(PartnerDataContext);
  if (!ctx) throw new Error("usePartnerData must be used inside PartnerDataProvider");
  return ctx;
};