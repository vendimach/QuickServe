import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { Booking, Role, Service, BookingType, Professional, ServicePreferences } from "@/types";
import { professionals as allPros } from "@/data/services";
import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationContext";
import { supabase } from "@/integrations/supabase/client";

type View =
  | { name: "home" }
  | { name: "category"; categoryId: string }
  | { name: "service-detail"; serviceId: string }
  | { name: "booking-flow"; serviceId: string }
  | { name: "matching"; bookingId: string }
  | { name: "live-status"; bookingId: string }
  | { name: "bookings" }
  | { name: "profile" }
  | { name: "notifications" }
  | { name: "partner-dashboard" }
  | { name: "rate-booking"; bookingId: string }
  | { name: "partner-profile"; partnerId: string }
  | { name: "chat"; bookingId: string }
  | { name: "live-cam"; bookingId: string }
  | { name: "refer-earn" }
  | { name: "saved-addresses" }
  | { name: "edit-profile" }
  | { name: "admin" }
  | { name: "payment"; bookingId: string };

interface AppContextValue {
  role: Role;
  view: View;
  navigate: (v: View) => void;
  bookings: Booking[];
  createBooking: (
    service: Service,
    type: BookingType,
    scheduledAt?: Date,
    initialPro?: Professional,
    preferences?: ServicePreferences,
  ) => Booking;
  partnerAcceptBooking: (bookingId: string, professional: Professional) => void;
  customerConfirmPartner: (bookingId: string, professional: Professional) => void;
  cancelBooking: (bookingId: string) => void;
  completeBooking: (bookingId: string) => void;
  markRated: (bookingId: string) => void;
  // partner availability
  availableNow: boolean;
  setAvailableNow: (v: boolean) => void;
  listedToday: boolean;
  setListedToday: (v: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { role: authRole, user } = useAuth();
  const { push } = useNotifications();
  const role: Role = authRole ?? "customer";
  const [view, setView] = useState<View>({ name: "home" });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availableNow, setAvailableNow] = useState(true);
  const [listedToday, setListedToday] = useState(true);

  // Reset view when role changes
  useEffect(() => {
    setView(role === "partner" ? { name: "partner-dashboard" } : { name: "home" });
  }, [role]);

  const createBooking: AppContextValue["createBooking"] = (
    service,
    type,
    scheduledAt,
    initialPro,
    preferences,
  ) => {
    const booking: Booking = {
      id: `b-${Date.now()}`,
      service,
      type,
      status: type === "instant" ? "searching" : "awaiting-customer-confirm",
      scheduledAt,
      createdAt: new Date(),
      address: "Home — 12, MG Road, Bengaluru",
      acceptedBy: type === "scheduled" && initialPro ? [initialPro] : [],
      professional: undefined,
      preferences,
    };
    setBookings((prev) => [booking, ...prev]);
    // Persist to DB (best-effort, non-blocking)
    if (user) {
      const insertRow = {
        user_id: user.id,
        service_id: service.id,
        service_name: service.name,
        category_id: service.categoryId,
        booking_type: type,
        status: booking.status,
        scheduled_at: scheduledAt?.toISOString() ?? null,
        address: booking.address,
        price: service.price,
        duration: service.duration,
        preferences: preferences ? JSON.parse(JSON.stringify(preferences)) : null,
      };
      supabase
        .from("bookings")
        .insert(insertRow)
        .select("id")
        .single()
        .then(({ data }) => {
          if (data?.id) {
            // swap local id with DB id so updates work
            setBookings((prev) =>
              prev.map((b) => (b.id === booking.id ? { ...b, id: data.id } : b)),
            );
            booking.id = data.id;
          }
        });
    }
    push({
      kind: "info",
      title: type === "instant" ? "Searching for partners" : "Booking request sent",
      body: `${service.name} • Awaiting partner acceptances`,
    });

    // Simulate partners accepting over time for instant bookings
    if (type === "instant") {
      const matches = allPros
        .filter((p) => p.categoryIds?.includes(service.categoryId) && p.availableNow)
        .slice(0, 4);
      matches.forEach((p, i) => {
        setTimeout(() => {
          setBookings((prev) =>
            prev.map((b) =>
              b.id === booking.id
                ? { ...b, acceptedBy: [...(b.acceptedBy ?? []), p], status: "awaiting-customer-confirm" }
                : b,
            ),
          );
          push({
            kind: "match",
            title: `${p.name} is available`,
            body: `Tap to view & confirm for ${service.name}`,
          });
        }, 1200 + i * 1500);
      });
    }
    return booking;
  };

  const partnerAcceptBooking: AppContextValue["partnerAcceptBooking"] = (bookingId, professional) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, acceptedBy: [...(b.acceptedBy ?? []), professional] }
          : b,
      ),
    );
    push({ kind: "success", title: "Job accepted", body: "Waiting for customer confirmation" });
  };

  const customerConfirmPartner: AppContextValue["customerConfirmPartner"] = (bookingId, professional) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, professional, status: "confirmed", confirmedAt: new Date() }
          : b,
      ),
    );
    if (user) {
      supabase
        .from("bookings")
        .update({
          status: "confirmed",
          professional_id: professional.id,
          professional_name: professional.name,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
    }
    push({
      kind: "confirm",
      title: "Booking confirmed",
      body: `${professional.name} will arrive in ${professional.eta}`,
    });

    // Simulate partner arrival after their ETA (compressed for demo)
    const etaMinutes = parseInt(professional.eta) || 8;
    const arriveMs = Math.min(etaMinutes, 1) * 1000 * 30; // 30s per minute, capped
    setTimeout(() => {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...b, status: "in-progress", arrivedAt: new Date() }
            : b,
        ),
      );
      push({
        kind: "success",
        title: `${professional.name} has arrived`,
        body: "Live cam is now available",
      });
    }, Math.max(arriveMs, 8000));
  };

  const cancelBooking: AppContextValue["cancelBooking"] = (bookingId) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b)),
    );
    if (user) supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    push({ kind: "warning", title: "Booking cancelled" });
  };

  const completeBooking: AppContextValue["completeBooking"] = (bookingId) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: "completed" } : b)),
    );
    if (user) {
      supabase
        .from("bookings")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", bookingId);
    }
    push({ kind: "success", title: "Service completed", body: "Please rate your professional" });
  };

  const markRated: AppContextValue["markRated"] = (bookingId) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, rated: true } : b)),
    );
  };

  return (
    <AppContext.Provider
      value={{
        role,
        view,
        navigate: setView,
        bookings,
        createBooking,
        partnerAcceptBooking,
        customerConfirmPartner,
        cancelBooking,
        completeBooking,
        markRated,
        availableNow,
        setAvailableNow,
        listedToday,
        setListedToday,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
};
