import { createContext, useContext, useState, ReactNode } from "react";
import type { Booking, Role, Service, BookingType, Professional } from "@/types";
import { professionals } from "@/data/services";

type View =
  | { name: "home" }
  | { name: "category"; categoryId: string }
  | { name: "service-detail"; serviceId: string }
  | { name: "booking-flow"; serviceId: string }
  | { name: "live-status"; bookingId: string }
  | { name: "bookings" }
  | { name: "profile" }
  | { name: "partner-dashboard" };

interface AppContextValue {
  role: Role;
  setRole: (r: Role) => void;
  view: View;
  navigate: (v: View) => void;
  bookings: Booking[];
  createBooking: (
    service: Service,
    type: BookingType,
    scheduledAt?: Date,
  ) => Booking;
  confirmMatch: (bookingId: string, professional?: Professional) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<Role>("customer");
  const [view, setView] = useState<View>({ name: "home" });
  const [bookings, setBookings] = useState<Booking[]>([]);

  const createBooking: AppContextValue["createBooking"] = (
    service,
    type,
    scheduledAt,
  ) => {
    const booking: Booking = {
      id: `b-${Date.now()}`,
      service,
      type,
      status: type === "instant" ? "searching" : "confirmed",
      scheduledAt,
      createdAt: new Date(),
      address: "Home — 12, MG Road, Bengaluru",
      professional:
        type === "scheduled" ? professionals[0] : undefined,
    };
    setBookings((prev) => [booking, ...prev]);
    return booking;
  };

  const confirmMatch: AppContextValue["confirmMatch"] = (
    bookingId,
    professional,
  ) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: "confirmed",
              professional: professional ?? professionals[0],
            }
          : b,
      ),
    );
  };

  return (
    <AppContext.Provider
      value={{ role, setRole, view, navigate: setView, bookings, createBooking, confirmMatch }}
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