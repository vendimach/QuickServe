import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { Booking, Role, Service, BookingType, Professional } from "@/types";
import { professionals as allPros } from "@/data/services";
import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationContext";

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
  | { name: "partner-dashboard" };

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
  ) => Booking;
  partnerAcceptBooking: (bookingId: string, professional: Professional) => void;
  customerConfirmPartner: (bookingId: string, professional: Professional) => void;
  cancelBooking: (bookingId: string) => void;
  // partner availability
  availableNow: boolean;
  setAvailableNow: (v: boolean) => void;
  listedToday: boolean;
  setListedToday: (v: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { role: authRole } = useAuth();
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
    };
    setBookings((prev) => [booking, ...prev]);
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
        b.id === bookingId ? { ...b, professional, status: "confirmed" } : b,
      ),
    );
    push({
      kind: "confirm",
      title: "Booking confirmed",
      body: `${professional.name} will arrive in ${professional.eta}`,
    });
  };

  const cancelBooking: AppContextValue["cancelBooking"] = (bookingId) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b)),
    );
    push({ kind: "warning", title: "Booking cancelled" });
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
