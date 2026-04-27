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

    // also pull aggregate rating + jobs completed
    const { data: stats } = await supabase
      .from("bookings")
      .select("rating, status")
      .eq("partner_id", user!.id);
    if (stats) {
      const completed = stats.filter((s) => s.status === "completed");
      setJobsCompletedTotal(completed.length);
      const rated = stats.filter((s) => typeof s.rating === "number");
      if (rated.length > 0) {
        const avg = rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length;
        setAverageRating(Math.round(avg * 10) / 10);
      } else {
        setAverageRating(null);
      }
    }
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