import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import type { Booking, Role, Service, BookingType, Professional, ServicePreferences } from "@/types";
import { professionals as allPros, services as allServices } from "@/data/services";
import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationContext";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate as useRouterNavigate, useParams } from "react-router-dom";

export type View =
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
  | { name: "addresses" }
  | { name: "payments" }
  | { name: "edit-profile" }
  | { name: "faqs" }
  | { name: "partner-otp"; bookingId: string };

// View <-> URL mapping
export const viewToPath = (v: View): string => {
  switch (v.name) {
    case "home": return "/";
    case "category": return `/category/${v.categoryId}`;
    case "service-detail": return `/service/${v.serviceId}`;
    case "booking-flow": return `/book/${v.serviceId}`;
    case "matching": return `/matching/${v.bookingId}`;
    case "live-status": return `/booking/${v.bookingId}`;
    case "bookings": return "/bookings";
    case "profile": return "/profile";
    case "notifications": return "/notifications";
    case "partner-dashboard": return "/partner";
    case "rate-booking": return `/rate/${v.bookingId}`;
    case "partner-profile": return `/partner-profile/${v.partnerId}`;
    case "chat": return `/chat/${v.bookingId}`;
    case "live-cam": return `/cam/${v.bookingId}`;
    case "refer-earn": return "/refer-earn";
    case "addresses": return "/profile/addresses";
    case "payments": return "/profile/payments";
    case "edit-profile": return "/profile/edit";
    case "faqs": return "/faqs";
    case "partner-otp": return `/partner-otp/${v.bookingId}`;
  }
};

export const pathToView = (pathname: string, role: Role): View => {
  const segs = pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (pathname === "/" || segs[0] === "") return role === "partner" ? { name: "partner-dashboard" } : { name: "home" };
  const [a, b] = segs;
  if (a === "category" && b) return { name: "category", categoryId: b };
  if (a === "service" && b) return { name: "service-detail", serviceId: b };
  if (a === "book" && b) return { name: "booking-flow", serviceId: b };
  if (a === "matching" && b) return { name: "matching", bookingId: b };
  if (a === "booking" && b) return { name: "live-status", bookingId: b };
  if (a === "bookings") return { name: "bookings" };
  if (a === "profile" && b === "addresses") return { name: "addresses" };
  if (a === "profile" && b === "payments") return { name: "payments" };
  if (a === "profile" && b === "edit") return { name: "edit-profile" };
  if (a === "profile") return { name: "profile" };
  if (a === "notifications") return { name: "notifications" };
  if (a === "partner") return { name: "partner-dashboard" };
  if (a === "rate" && b) return { name: "rate-booking", bookingId: b };
  if (a === "partner-profile" && b) return { name: "partner-profile", partnerId: b };
  if (a === "partner-otp" && b) return { name: "partner-otp", bookingId: b };
  if (a === "chat" && b) return { name: "chat", bookingId: b };
  if (a === "cam" && b) return { name: "live-cam", bookingId: b };
  if (a === "refer-earn") return { name: "refer-earn" };
  if (a === "faqs") return { name: "faqs" };
  return role === "partner" ? { name: "partner-dashboard" } : { name: "home" };
};

interface AppContextValue {
  role: Role;
  view: View;
  navigate: (v: View) => void;
  bookings: Booking[];
  loadingBookings: boolean;
  createBooking: (
    service: Service,
    type: BookingType,
    scheduledAt?: Date,
    initialPro?: Professional,
    preferences?: ServicePreferences,
    addressOverride?: string,
    paymentMethodLabel?: string,
  ) => Booking;
  partnerAcceptBooking: (bookingId: string, professional: Professional) => void;
  customerConfirmPartner: (bookingId: string, professional: Professional) => void;
  cancelBooking: (bookingId: string, reason?: string, fee?: number) => void;
  partnerStartService: (bookingId: string, otp: string) => boolean;
  completeBooking: (bookingId: string) => void;
  markRated: (bookingId: string) => void;
  saveRating: (bookingId: string, rating: number, comment?: string) => Promise<void>;
  // partner availability
  availableNow: boolean;
  setAvailableNow: (v: boolean) => void;
  listedToday: boolean;
  setListedToday: (v: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// DB row -> Booking type
type BookingRow = {
  id: string;
  service_id: string;
  service_name: string;
  category_id: string;
  booking_type: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  confirmed_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_fee: number | null;
  professional_id: string | null;
  professional_name: string | null;
  address: string;
  preferences: unknown;
  rating: number | null;
  rating_comment: string | null;
  payment_status: string;
  payment_method: string | null;
  start_otp: string | null;
  price: number;
};

const rowToBooking = (r: BookingRow): Booking => {
  const service = allServices.find((s) => s.id === r.service_id) ?? {
    id: r.service_id,
    name: r.service_name,
    categoryId: r.category_id,
    price: Number(r.price ?? 0),
    duration: "—",
    rating: 0,
    reviews: 0,
    description: "",
    icon: "Sparkles",
  };
  const professional = r.professional_id
    ? allPros.find((p) => p.id === r.professional_id) ?? {
        id: r.professional_id,
        name: r.professional_name ?? "Professional",
        rating: 4.8,
        jobs: 0,
        avatar: (r.professional_name ?? "P").slice(0, 2).toUpperCase(),
        eta: "8 min",
      }
    : undefined;
  return {
    id: r.id,
    service,
    type: (r.booking_type as BookingType) ?? "instant",
    status: r.status as Booking["status"],
    scheduledAt: r.scheduled_at ? new Date(r.scheduled_at) : undefined,
    createdAt: new Date(r.created_at),
    confirmedAt: r.confirmed_at ? new Date(r.confirmed_at) : undefined,
    arrivedAt: r.arrived_at ? new Date(r.arrived_at) : undefined,
    startedAt: r.started_at ? new Date(r.started_at) : undefined,
    completedAt: r.completed_at ? new Date(r.completed_at) : undefined,
    cancelledAt: r.cancelled_at ? new Date(r.cancelled_at) : undefined,
    cancellationFee: r.cancellation_fee ?? 0,
    professional,
    address: r.address,
    preferences: (r.preferences as Booking["preferences"]) ?? undefined,
    rated: r.rating != null,
    rating: r.rating ?? undefined,
    ratingComment: r.rating_comment ?? undefined,
    paymentStatus: (r.payment_status as Booking["paymentStatus"]) ?? "pending",
    paymentMethod: r.payment_method ?? undefined,
    startOtp: r.start_otp ?? undefined,
    acceptedBy: [],
  };
};

const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { role: authRole, user } = useAuth();
  const { push } = useNotifications();
  const routerNavigate = useRouterNavigate();
  const location = useLocation();
  const role: Role = authRole ?? "customer";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [availableNow, setAvailableNow] = useState(true);
  const [listedToday, setListedToday] = useState(true);
  const acceptSimRef = useRef<Set<string>>(new Set());

  // Derive view from current URL
  const view = useMemo<View>(() => pathToView(location.pathname, role), [location.pathname, role]);

  const navigate = useCallback((v: View) => {
    routerNavigate(viewToPath(v));
  }, [routerNavigate]);

  // Reset view when role changes
  useEffect(() => {
    // When role changes, send to role's home if currently on bare "/"
    if (location.pathname === "/" && role === "partner") {
      routerNavigate("/partner", { replace: true });
    }
  }, [role, location.pathname, routerNavigate]);

  // Initial load + realtime
  useEffect(() => {
    if (!user) {
      setBookings([]);
      return;
    }
    let mounted = true;
    setLoadingBookings(true);
    supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!mounted) return;
        setLoadingBookings(false);
        if (error) {
          console.error("Failed to load bookings", error);
          return;
        }
        setBookings((data as BookingRow[]).map(rowToBooking));
      });

    const channel = supabase
      .channel(`bookings-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const b = rowToBooking(payload.new as BookingRow);
            setBookings((prev) => (prev.find((x) => x.id === b.id) ? prev : [b, ...prev]));
          } else if (payload.eventType === "UPDATE") {
            const b = rowToBooking(payload.new as BookingRow);
            setBookings((prev) => prev.map((x) => (x.id === b.id ? { ...b, acceptedBy: x.acceptedBy } : x)));
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            setBookings((prev) => prev.filter((x) => x.id !== id));
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createBooking: AppContextValue["createBooking"] = (
    service,
    type,
    scheduledAt,
    initialPro,
    preferences,
    addressOverride,
    paymentMethodLabel,
  ) => {
    const otp = generateOtp();
    const tempId = `b-${Date.now()}`;
    const booking: Booking = {
      id: tempId,
      service,
      type,
      status: type === "instant" ? "searching" : "awaiting-customer-confirm",
      scheduledAt,
      createdAt: new Date(),
      address: addressOverride ?? "Home — 12, MG Road, Bengaluru",
      acceptedBy: type === "scheduled" && initialPro ? [initialPro] : [],
      professional: undefined,
      preferences,
      paymentStatus: "pending",
      paymentMethod: paymentMethodLabel,
      startOtp: otp,
    };
    setBookings((prev) => [booking, ...prev]);

    if (user) {
      supabase
        .from("bookings")
        .insert({
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
          preferences: preferences ? (preferences as unknown as object) : null,
          payment_method: paymentMethodLabel ?? null,
          start_otp: otp,
        })
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error("Failed to persist booking", error);
            return;
          }
          if (data) {
            const real = rowToBooking(data as BookingRow);
            setBookings((prev) => prev.map((x) => (x.id === tempId ? { ...real, acceptedBy: x.acceptedBy } : x)));
            booking.id = real.id;
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
            prev.map((b) => {
              if (b.id !== booking.id && b.id !== tempId) return b;
              if (acceptSimRef.current.has(`${b.id}-${p.id}`)) return b;
              acceptSimRef.current.add(`${b.id}-${p.id}`);
              return { ...b, acceptedBy: [...(b.acceptedBy ?? []), p], status: "awaiting-customer-confirm" };
            }),
          );
          if (user) {
            supabase
              .from("bookings")
              .update({ status: "awaiting-customer-confirm" })
              .eq("id", booking.id)
              .then(() => {});
          }
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
    const now = new Date();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, professional, status: "confirmed", confirmedAt: now }
          : b,
      ),
    );
    if (user) {
      supabase
        .from("bookings")
        .update({
          professional_id: professional.id,
          professional_name: professional.name,
          status: "confirmed",
          confirmed_at: now.toISOString(),
        })
        .eq("id", bookingId)
        .then(() => {});
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
      const arrivedAt = new Date();
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...b, arrivedAt }
            : b,
        ),
      );
      // Note: status stays "confirmed" until partner enters OTP and starts service
      if (user) {
        supabase
          .from("bookings")
          .update({ arrived_at: arrivedAt.toISOString() })
          .eq("id", bookingId)
          .then(() => {});
      }
      push({
        kind: "success",
        title: `${professional.name} has arrived`,
        body: "Share the start OTP to begin service",
      });
    }, Math.max(arriveMs, 8000));
  };

  const cancelBooking: AppContextValue["cancelBooking"] = (bookingId, reason, fee = 0) => {
    const now = new Date();
    const wasPaid = bookings.find((b) => b.id === bookingId)?.paymentStatus === "paid";
    const newStatus: Booking["status"] = wasPaid ? "refunded" : "cancelled";
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, status: newStatus, cancelledAt: now, cancellationFee: fee }
          : b,
      ),
    );
    if (user) {
      supabase
        .from("bookings")
        .update({
          status: newStatus,
          cancelled_at: now.toISOString(),
          cancellation_reason: reason ?? null,
          cancellation_fee: fee,
          ...(wasPaid ? { refund_status: "initiated" } : {}),
        })
        .eq("id", bookingId)
        .then(() => {});
    }
    push({ kind: "warning", title: wasPaid ? "Booking cancelled — refund initiated" : "Booking cancelled" });
  };

  const partnerStartService: AppContextValue["partnerStartService"] = (bookingId, otp) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b || !b.startOtp) return false;
    if (b.startOtp !== otp.trim()) return false;
    const now = new Date();
    setBookings((prev) =>
      prev.map((x) => (x.id === bookingId ? { ...x, status: "in-progress", startedAt: now } : x)),
    );
    if (user) {
      supabase
        .from("bookings")
        .update({ status: "in-progress", started_at: now.toISOString() })
        .eq("id", bookingId)
        .then(() => {});
    }
    push({ kind: "success", title: "Service started", body: "Have a great job!" });
    return true;
  };

  const completeBooking: AppContextValue["completeBooking"] = (bookingId) => {
    const now = new Date();
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: "completed", completedAt: now } : b)),
    );
    if (user) {
      supabase
        .from("bookings")
        .update({ status: "completed", completed_at: now.toISOString() })
        .eq("id", bookingId)
        .then(() => {});
    }
    push({ kind: "success", title: "Service completed", body: "Please rate your professional" });
  };

  const markRated: AppContextValue["markRated"] = (bookingId) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, rated: true } : b)),
    );
  };

  const saveRating: AppContextValue["saveRating"] = async (bookingId, rating, comment) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, rated: true, rating, ratingComment: comment } : b)),
    );
    if (user) {
      await supabase
        .from("bookings")
        .update({ rating, rating_comment: comment ?? null })
        .eq("id", bookingId);
    }
  };

  return (
    <AppContext.Provider
      value={{
        role,
        view,
        navigate,
        bookings,
        loadingBookings,
        createBooking,
        partnerAcceptBooking,
        customerConfirmPartner,
        cancelBooking,
        partnerStartService,
        completeBooking,
        markRated,
        saveRating,
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
