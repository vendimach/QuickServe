import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import type { Booking, ExtensionStatus, Role, Service, BookingType, Professional, ServicePreferences } from "@/types";
import { professionals as allPros, services as allServices } from "@/data/services";
import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationContext";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerData } from "./PartnerDataContext";
import { useWallet } from "./WalletContext";
import { useLocation, useNavigate as useRouterNavigate, useParams } from "react-router-dom";
import {
  parseDurationToMinutes,
  finalBilledAmount,
  extensionCost,
} from "@/lib/bookingTimer";

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
  | { name: "wallet" }
  | { name: "favorites" }
  | { name: "addresses" }
  | { name: "payments" }
  | { name: "edit-profile" }
  | { name: "faqs" }
  | { name: "partner-otp"; bookingId: string }
  | { name: "booking-summary"; bookingId: string }
  | { name: "partner-earnings" }
  | { name: "partner-job"; bookingId: string }
  | { name: "partner-job-complete"; bookingId: string };

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
    case "wallet": return "/profile/wallet";
    case "favorites": return "/profile/favorites";
    case "addresses": return "/profile/addresses";
    case "payments": return "/profile/payments";
    case "edit-profile": return "/profile/edit";
    case "faqs": return "/faqs";
    case "partner-otp": return `/partner-otp/${v.bookingId}`;
    case "booking-summary": return `/summary/${v.bookingId}`;
    case "partner-earnings": return "/partner/earnings";
    case "partner-job": return `/partner/job/${v.bookingId}`;
    case "partner-job-complete": return `/partner/job/${v.bookingId}/complete`;
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
  if (a === "profile" && b === "wallet") return { name: "wallet" };
  if (a === "profile" && b === "favorites") return { name: "favorites" };
  if (a === "profile" && b === "edit") return { name: "edit-profile" };
  if (a === "profile") return { name: "profile" };
  if (a === "notifications") return { name: "notifications" };
  if (a === "partner" && b === "earnings") return { name: "partner-earnings" };
  if (a === "partner" && b === "job" && segs[2] && segs[3] === "complete") return { name: "partner-job-complete", bookingId: segs[2] };
  if (a === "partner" && b === "job" && segs[2]) return { name: "partner-job", bookingId: segs[2] };
  if (a === "partner") return { name: "partner-dashboard" };
  if (a === "rate" && b) return { name: "rate-booking", bookingId: b };
  if (a === "partner-profile" && b) return { name: "partner-profile", partnerId: b };
  if (a === "partner-otp" && b) return { name: "partner-otp", bookingId: b };
  if (a === "summary" && b) return { name: "booking-summary", bookingId: b };
  if (a === "chat" && b) return { name: "chat", bookingId: b };
  if (a === "cam" && b) return { name: "live-cam", bookingId: b };
  if (a === "refer-earn") return { name: "refer-earn" };
  if (a === "faqs") return { name: "faqs" };
  return role === "partner" ? { name: "partner-dashboard" } : { name: "home" };
};

interface AppContextValue {
  role: Role;
  view: View;
  navigate: (v: View, opts?: { replace?: boolean }) => void;
  /** Navigate to the previous entry in browser history. Falls back to role home if history is empty. */
  goBack: () => void;
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
    addressLat?: number,
    addressLng?: number,
    /** Send this booking exclusively to a specific favorite partner. */
    targetPartnerId?: string,
    /** Note shown alongside a personal request on the partner's card. */
    personalMessage?: string,
  ) => Booking;
  availableBookings: Booking[];
  partnerAcceptBooking: (bookingId: string, professional: Professional) => Promise<{ ok: boolean; reason?: string }>;
  customerConfirmPartner: (bookingId: string, professional: Professional) => void;
  cancelBooking: (bookingId: string, reason?: string, fee?: number) => void;
  partnerStartService: (bookingId: string, otp: string) => boolean;
  completeBooking: (bookingId: string) => void;
  markRated: (bookingId: string) => void;
  saveRating: (bookingId: string, rating: number, comment?: string) => Promise<void>;
  /** Customer requests extra time. Returns reason on failure. */
  requestExtension: (bookingId: string, minutes: number, message?: string) => Promise<{ ok: boolean; reason?: string }>;
  /** Partner responds to a pending extension request. */
  respondToExtension: (bookingId: string, decision: "accept" | "decline") => Promise<{ ok: boolean; reason?: string }>;
}

const AppContext = createContext<AppContextValue | null>(null);

// DB row -> Booking type
type BookingRow = {
  id: string;
  user_id: string;
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
  cancellation_reason: string | null;
  professional_id: string | null;
  professional_name: string | null;
  partner_id: string | null;
  partner_user_id: string | null;
  address: string;
  preferences: unknown;
  rating: number | null;
  rating_comment: string | null;
  payment_status: string;
  payment_method: string | null;
  start_otp: string | null;
  price: number;
  user_lat: number | null;
  user_lng: number | null;
  partner_lat: number | null;
  partner_lng: number | null;
  // Timer / billing
  planned_duration_minutes?: number | null;
  planned_end_time?: string | null;
  actual_duration_minutes?: number | null;
  final_amount?: number | null;
  extension_minutes?: number | null;
  extension_charges?: number | null;
  extension_request_minutes?: number | null;
  extension_request_message?: string | null;
  extension_status?: ExtensionStatus | null;
  requested_partner_id?: string | null;
  personal_message?: string | null;
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
    cancellationReason: r.cancellation_reason ?? undefined,
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
    userLat: r.user_lat ?? undefined,
    userLng: r.user_lng ?? undefined,
    partnerLat: r.partner_lat ?? undefined,
    partnerLng: r.partner_lng ?? undefined,
    partnerUserId: r.partner_user_id ?? undefined,
    plannedDurationMinutes: r.planned_duration_minutes ?? undefined,
    plannedEndTime: r.planned_end_time ? new Date(r.planned_end_time) : undefined,
    actualDurationMinutes: r.actual_duration_minutes ?? undefined,
    finalAmount: r.final_amount != null ? Number(r.final_amount) : undefined,
    extensionMinutes: r.extension_minutes ?? 0,
    extensionCharges: r.extension_charges != null ? Number(r.extension_charges) : 0,
    extensionRequestMinutes: r.extension_request_minutes ?? undefined,
    extensionRequestMessage: r.extension_request_message ?? undefined,
    extensionStatus: (r.extension_status ?? "none") as ExtensionStatus,
    requestedPartnerId: r.requested_partner_id ?? undefined,
    personalMessage: r.personal_message ?? undefined,
  };
};

const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

const generateBookingId = (): string => {
  // Prefer the browser's native UUID generator (RFC 4122 v4).
  // Fallback for older runtimes where crypto.randomUUID is missing.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { role: authRole, user } = useAuth();
  const { push } = useNotifications();
  const { creditRefund, onFirstBookingCompleted } = useWallet();
  const routerNavigate = useRouterNavigate();
  const location = useLocation();
  const role: Role = authRole ?? "customer";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availableBookings, setAvailableBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Derive view from current URL
  const view = useMemo<View>(() => pathToView(location.pathname, role), [location.pathname, role]);

  const navigate = useCallback((v: View, opts?: { replace?: boolean }) => {
    routerNavigate(viewToPath(v), { replace: opts?.replace });
  }, [routerNavigate]);

  const goBack = useCallback(() => {
    // history.length > 2 means there's a real previous page (1 = the page loaded
    // directly, 2 = no real back entry). We check window.history directly so we
    // never navigate back into an unrelated origin.
    if (window.history.length > 2) {
      routerNavigate(-1);
    } else {
      routerNavigate(role === "partner" ? "/partner" : "/", { replace: true });
    }
  }, [routerNavigate, role]);

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
      setAvailableBookings([]);
      return;
    }
    let mounted = true;
    setLoadingBookings(true);

    // Always start fresh on (re)load to prevent ghost rows from a previous
    // session/role from leaking into the new state. The fetch below replaces,
    // never merges — but clearing first guarantees that if the fetch fails
    // or is slow, the UI doesn't briefly render stale data.
    setBookings([]);
    setAvailableBookings([]);

    // Own bookings (created by or assigned to this user)
    supabase
      .from("bookings")
      .select("*")
      .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!mounted) return;
        setLoadingBookings(false);
        if (error) { console.error("Failed to load bookings", error); return; }
        setBookings((data as BookingRow[]).map(rowToBooking));
      });

    // Available searching bookings for partners.
    // Strict server-side filter: must be 'searching', no partner assigned,
    // and not the partner's own booking. Anything cancelled / completed /
    // confirmed / accepted-by-someone-else has a different status or a
    // partner_id, so it can never come back from this query.
    if (role === "partner") {
      supabase
        .from("bookings")
        .select("*")
        .eq("status", "searching")
        .is("partner_id", null)
        .neq("user_id", user.id)
        // Personal-request rows are only visible to their target partner.
        // Everyone else sees them as if they don't exist.
        .or(`requested_partner_id.is.null,requested_partner_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (!mounted || !data) return;
          const rows = data as BookingRow[];
          const mapped = rows.map(rowToBooking);
          // Drop scheduled bookings whose scheduledAt has already passed —
          // they're stale even if the DB still has them as 'searching'.
          const now = Date.now();
          const fresh = mapped.filter((b) => {
            if (b.type === "scheduled" && b.scheduledAt && b.scheduledAt.getTime() < now) {
              return false;
            }
            return true;
          });
          console.log(
            `[incoming-requests] initial fetch: ${rows.length} raw row(s) →` +
            ` ${fresh.length} active after stale filter`,
          );
          // REPLACE state — never merge with whatever was there before.
          setAvailableBookings(fresh);
        });
    }

    const channel = supabase
      .channel(`bookings-${user.id}-${role}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as BookingRow;
            const b = rowToBooking(row);
            // Route to availableBookings only if it's a fresh searching booking
            // from another user with no partner assigned. Same guards as the
            // initial fetch.
            const isFreshScheduled =
              b.type !== "scheduled" || !b.scheduledAt || b.scheduledAt.getTime() >= Date.now();
            // Personal-request gating: if requested_partner_id is set, only
            // the target partner is allowed to see it; everyone else skips.
            const personalAllowed =
              !row.requested_partner_id || row.requested_partner_id === user.id;
            if (
              role === "partner" &&
              b.status === "searching" &&
              row.user_id !== user.id &&
              !row.partner_id &&
              isFreshScheduled &&
              personalAllowed
            ) {
              setAvailableBookings((prev) => prev.find((x) => x.id === b.id) ? prev : [b, ...prev]);
            } else {
              setBookings((prev) => prev.find((x) => x.id === b.id) ? prev : [b, ...prev]);
            }
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as BookingRow;
            const b = rowToBooking(row);
            // Any transition out of 'searching' (cancelled, refunded,
            // confirmed, in-progress, completed, awaiting-customer-confirm)
            // OR any partner_id assignment immediately removes the row from
            // the partner's incoming list — no refresh needed.
            const stillOpen = b.status === "searching" && !row.partner_id;
            if (!stillOpen) {
              setAvailableBookings((prev) => {
                const next = prev.filter((x) => x.id !== b.id);
                if (next.length !== prev.length) {
                  console.log(
                    `[realtime] removing booking ${b.id} from incoming requests` +
                    ` (status=${b.status}, partner_id=${row.partner_id ?? "null"})`,
                  );
                }
                return next;
              });
            } else if (role === "partner" && row.user_id !== user.id) {
              // Still searching → either update an existing entry OR add a
              // newly-eligible row (e.g. partner_id was cleared by the
              // backend). Honors the same scheduled freshness rule and the
              // personal-request target check.
              const isFreshScheduled =
                b.type !== "scheduled" || !b.scheduledAt || b.scheduledAt.getTime() >= Date.now();
              const personalAllowed =
                !row.requested_partner_id || row.requested_partner_id === user.id;
              if (isFreshScheduled && personalAllowed) {
                setAvailableBookings((prev) => {
                  const exists = prev.find((x) => x.id === b.id);
                  if (exists) {
                    return prev.map((x) => x.id === b.id ? { ...b, acceptedBy: x.acceptedBy } : x);
                  }
                  return [b, ...prev];
                });
              }
            }
            // Update in own bookings if user is involved.
            // Preserve the local professional when the DB row doesn't have one — this
            // prevents a Realtime update (e.g. OTP start) from wiping the partner info
            // that was set locally via partnerAcceptBooking.
            if (row.user_id === user.id || row.partner_id === user.id) {
              setBookings((prev) =>
                prev.map((x) => {
                  if (x.id !== b.id) return x;
                  return {
                    ...b,
                    acceptedBy: x.acceptedBy,
                    professional: b.professional ?? x.professional,
                  };
                }),
              );
            }
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            setBookings((prev) => prev.filter((x) => x.id !== id));
            setAvailableBookings((prev) => prev.filter((x) => x.id !== id));
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, role]);

  const createBooking: AppContextValue["createBooking"] = (
    service,
    type,
    scheduledAt,
    _initialPro,
    preferences,
    addressOverride,
    paymentMethodLabel,
    addressLat,
    addressLng,
    targetPartnerId,
    personalMessage,
  ) => {
    const bookingId = generateBookingId();
    const isPersonal = !!targetPartnerId;
    const booking: Booking = {
      id: bookingId,
      service,
      type,
      status: "searching",
      scheduledAt,
      createdAt: new Date(),
      address: addressOverride ?? "Home — 12, MG Road, Bengaluru",
      acceptedBy: [],
      professional: undefined,
      preferences,
      paymentStatus: "pending",
      paymentMethod: paymentMethodLabel,
      startOtp: undefined,
      userLat: addressLat,
      userLng: addressLng,
      requestedPartnerId: targetPartnerId,
      personalMessage: personalMessage,
    };
    setBookings((prev) => [booking, ...prev]);

    if (user) {
      supabase
        .from("bookings")
        .insert([{
          id: bookingId,
          user_id: user.id,
          service_id: service.id,
          service_name: service.name,
          category_id: service.categoryId,
          booking_type: type,
          status: "searching",
          scheduled_at: scheduledAt?.toISOString() ?? null,
          address: booking.address,
          price: service.price,
          duration: service.duration,
          preferences: preferences ? JSON.parse(JSON.stringify(preferences)) : null,
          payment_method: paymentMethodLabel ?? null,
          user_lat: addressLat ?? null,
          user_lng: addressLng ?? null,
          requested_partner_id: targetPartnerId ?? null,
          personal_message: personalMessage ?? null,
        }])
        .select()
        .single()
        .then(({ error }) => {
          if (error) {
            console.error("Failed to persist booking", error);
            setBookings((prev) => prev.filter((x) => x.id !== bookingId));
          }
        });
    }

    push({
      kind: "info",
      title: isPersonal ? "Personal request sent" : "Searching for partners",
      body: isPersonal
        ? `${service.name} • Sent to your favorite partner`
        : `${service.name} • Awaiting partner acceptances`,
    });

    return booking;
  };

  const partnerAcceptBooking: AppContextValue["partnerAcceptBooking"] = async (bookingId, professional) => {
    if (!user) return { ok: false, reason: "Sign in required" };
    const target =
      availableBookings.find((x) => x.id === bookingId) ?? bookings.find((x) => x.id === bookingId);
    if (!target) return { ok: false, reason: "Booking not found" };

    const now = new Date();
    // Generate OTP here, on accept — never at booking creation.
    // This means the OTP is only ever written by the partner's device and
    // only ever displayed in the partner's job view (not the customer's screen).
    const otp = generateOtp();

    // Persist acceptance: go straight to confirmed (no customer confirmation needed).
    // Use optimistic lock (.eq status = searching) so two partners can't double-accept.
    // Race condition prevention: if two partners try simultaneously, only the first
    // update succeeds because .eq("status","searching") fails for the second partner
    // once the first has changed the row to "confirmed".
    const { error } = await supabase
      .from("bookings")
      .update({
        partner_id: user.id,
        partner_user_id: user.id,
        professional_id: professional.id,
        professional_name: professional.name,
        status: "confirmed",
        confirmed_at: now.toISOString(),
        start_otp: otp,
      })
      .eq("id", bookingId)
      .eq("status", "searching");

    if (error) {
      console.error("partnerAcceptBooking failed", error);
      return { ok: false, reason: error.message };
    }

    // Optimistic local update: move from available → own bookings.
    // Include the OTP so PartnerJobView can display it immediately without
    // waiting for the Realtime echo.
    setAvailableBookings((prev) => prev.filter((x) => x.id !== bookingId));
    const confirmed: Booking = {
      ...target,
      status: "confirmed",
      professional,
      confirmedAt: now,
      partnerUserId: user.id,
      startOtp: otp,
    };
    setBookings((prev) => {
      if (prev.find((x) => x.id === bookingId)) {
        return prev.map((b) => (b.id === bookingId ? confirmed : b));
      }
      return [confirmed, ...prev];
    });

    push({ kind: "success", title: "Job accepted — heading to customer" });

    // Simulate partner arrival after 8 s (demo; real partners would update location)
    setTimeout(() => {
      const arrivedAt = new Date();
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, arrivedAt } : b)),
      );
      supabase
        .from("bookings")
        .update({ arrived_at: arrivedAt.toISOString() })
        .eq("id", bookingId)
        .then(() => {});
      push({ kind: "success", title: "You've arrived at the customer" });
    }, 8000);

    return { ok: true };
  };

  const customerConfirmPartner: AppContextValue["customerConfirmPartner"] = (bookingId, professional) => {
    // Partners now auto-confirm on acceptance — this is kept for compatibility only.
    const now = new Date();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, professional, status: "confirmed", confirmedAt: now } : b,
      ),
    );
  };

  const cancelBooking: AppContextValue["cancelBooking"] = (bookingId, reason, fee = 0) => {
    const now = new Date();
    const target = bookings.find((b) => b.id === bookingId);
    const wasPaid = target?.paymentStatus === "paid";
    const newStatus: Booking["status"] = wasPaid ? "refunded" : "cancelled";
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, status: newStatus, cancelledAt: now, cancellationFee: fee, cancellationReason: reason }
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
    // Refunds land in the user's wallet (minus any cancellation fee). Idempotent
    // by bookingId so a re-fired cancellation can never double-credit.
    if (wasPaid && target) {
      const refundAmount = Math.max(0, target.service.price - fee);
      if (refundAmount > 0) {
        creditRefund(bookingId, refundAmount, `Refund for ${target.service.name}`);
      }
    }
    push({ kind: "warning", title: wasPaid ? "Booking cancelled — refund credited to wallet" : "Booking cancelled" });
  };

  const partnerStartService: AppContextValue["partnerStartService"] = (bookingId, otp) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b || !b.startOtp) return false;
    if (b.startOtp !== otp.trim()) return false;
    const now = new Date();
    // Snapshot the planned duration at start. Anything we add later (extensions)
    // is layered on top of this baseline; the original price/duration ratio is
    // what drives prorated early-completion billing.
    const plannedMinutes = parseDurationToMinutes(b.service.duration, 60);
    const plannedEnd = new Date(now.getTime() + plannedMinutes * 60_000);
    console.log("[booking/timer] start", {
      bookingId,
      startedAt: now.toISOString(),
      plannedMinutes,
      plannedEnd: plannedEnd.toISOString(),
    });
    setBookings((prev) =>
      prev.map((x) =>
        x.id === bookingId
          ? {
              ...x,
              status: "in-progress",
              startedAt: now,
              plannedDurationMinutes: plannedMinutes,
              plannedEndTime: plannedEnd,
              extensionMinutes: 0,
              extensionCharges: 0,
              extensionStatus: "none",
            }
          : x,
      ),
    );
    if (user) {
      supabase
        .from("bookings")
        .update({
          status: "in-progress",
          started_at: now.toISOString(),
          planned_duration_minutes: plannedMinutes,
          planned_end_time: plannedEnd.toISOString(),
          extension_minutes: 0,
          extension_charges: 0,
          extension_status: "none",
        })
        .eq("id", bookingId)
        .then(() => {});
    }
    push({ kind: "success", title: "Service started", body: "Have a great job!" });
    return true;
  };

  const completeBooking: AppContextValue["completeBooking"] = (bookingId) => {
    const now = new Date();
    // Capture pre-completion state so we can detect "this user's first
    // successful booking" for the referral payout.
    const target = bookings.find((b) => b.id === bookingId);
    const completedByCustomer = target?.partnerUserId !== user?.id;
    const previouslyCompleted = bookings.some(
      (b) => b.status === "completed" && b.id !== bookingId,
    );

    // Compute prorated final amount. If the timer hadn't started (legacy rows
    // or partner completing without OTP) we just bill the full service price.
    let actualMinutes = 0;
    let finalAmount = target?.service.price ?? 0;
    if (target?.startedAt && target?.plannedDurationMinutes) {
      actualMinutes = Math.max(
        0,
        Math.round((now.getTime() - target.startedAt.getTime()) / 60_000),
      );
      const billing = finalBilledAmount({
        price: target.service.price,
        plannedMinutes: target.plannedDurationMinutes,
        elapsedMinutes: actualMinutes,
        extensionMinutes: target.extensionMinutes ?? 0,
      });
      finalAmount = billing.total;
      console.log("[booking/timer] complete", {
        bookingId,
        actualMinutes,
        plannedMinutes: target.plannedDurationMinutes,
        extensionMinutes: target.extensionMinutes ?? 0,
        basePortion: billing.basePortion,
        extensionPortion: billing.extensionPortion,
        finalAmount,
      });
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: "completed",
              completedAt: now,
              actualDurationMinutes: actualMinutes,
              finalAmount,
            }
          : b,
      ),
    );
    if (user) {
      supabase
        .from("bookings")
        .update({
          status: "completed",
          completed_at: now.toISOString(),
          actual_duration_minutes: actualMinutes,
          final_amount: finalAmount,
        })
        .eq("id", bookingId)
        .then(() => {});
    }
    // Referral payout: only when the *customer*'s first booking completes.
    if (completedByCustomer && !previouslyCompleted) {
      onFirstBookingCompleted(bookingId);
    }
    push({ kind: "success", title: "Service completed", body: "Please rate your professional" });
  };

  // ── Extension flow ────────────────────────────────────────────────────────
  const requestExtension: AppContextValue["requestExtension"] = async (
    bookingId,
    minutes,
    message,
  ) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return { ok: false, reason: "Booking not found" };
    if (b.status !== "in-progress") return { ok: false, reason: "Service is not active" };
    if (b.extensionStatus === "pending") {
      return { ok: false, reason: "An extension request is already pending" };
    }
    if (minutes <= 0) return { ok: false, reason: "Invalid extension duration" };

    console.log("[booking/extension] request", { bookingId, minutes, message });
    setBookings((prev) =>
      prev.map((x) =>
        x.id === bookingId
          ? {
              ...x,
              extensionStatus: "pending",
              extensionRequestMinutes: minutes,
              extensionRequestMessage: message,
            }
          : x,
      ),
    );
    if (user) {
      const { error } = await supabase
        .from("bookings")
        .update({
          extension_status: "pending",
          extension_request_minutes: minutes,
          extension_request_message: message ?? null,
        })
        .eq("id", bookingId);
      if (error) {
        console.error("[booking/extension] persist failed", error);
        // Roll the optimistic state back so the UI reflects reality.
        setBookings((prev) =>
          prev.map((x) =>
            x.id === bookingId
              ? { ...x, extensionStatus: "none", extensionRequestMinutes: undefined, extensionRequestMessage: undefined }
              : x,
          ),
        );
        return { ok: false, reason: error.message };
      }
    }
    push({ kind: "info", title: "Extension request sent", body: `Asked for ${minutes} more minutes` });
    return { ok: true };
  };

  const respondToExtension: AppContextValue["respondToExtension"] = async (
    bookingId,
    decision,
  ) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return { ok: false, reason: "Booking not found" };
    if (b.extensionStatus !== "pending" || !b.extensionRequestMinutes) {
      return { ok: false, reason: "No pending extension request" };
    }

    if (decision === "decline") {
      console.log("[booking/extension] declined", { bookingId, minutes: b.extensionRequestMinutes });
      setBookings((prev) =>
        prev.map((x) =>
          x.id === bookingId
            ? { ...x, extensionStatus: "declined", extensionRequestMinutes: undefined, extensionRequestMessage: undefined }
            : x,
        ),
      );
      if (user) {
        await supabase
          .from("bookings")
          .update({
            extension_status: "declined",
            extension_request_minutes: null,
            extension_request_message: null,
          })
          .eq("id", bookingId);
      }
      push({ kind: "warning", title: "Extension declined" });
      return { ok: true };
    }

    // Accept: extend planned end time, accumulate extension minutes/charges.
    const addedMinutes = b.extensionRequestMinutes;
    const newExtensionMinutes = (b.extensionMinutes ?? 0) + addedMinutes;
    const addedCost = extensionCost(
      b.service.price,
      b.plannedDurationMinutes ?? parseDurationToMinutes(b.service.duration, 60),
      addedMinutes,
    );
    const newCharges = (b.extensionCharges ?? 0) + addedCost;
    const baseEnd = b.plannedEndTime ?? (b.startedAt
      ? new Date(b.startedAt.getTime() + (b.plannedDurationMinutes ?? 60) * 60_000)
      : new Date());
    const newEnd = new Date(baseEnd.getTime() + addedMinutes * 60_000);

    console.log("[booking/extension] accepted", {
      bookingId,
      addedMinutes,
      newExtensionMinutes,
      addedCost,
      newPlannedEnd: newEnd.toISOString(),
    });
    setBookings((prev) =>
      prev.map((x) =>
        x.id === bookingId
          ? {
              ...x,
              extensionStatus: "accepted",
              extensionMinutes: newExtensionMinutes,
              extensionCharges: newCharges,
              plannedEndTime: newEnd,
              extensionRequestMinutes: undefined,
              extensionRequestMessage: undefined,
            }
          : x,
      ),
    );
    if (user) {
      const { error } = await supabase
        .from("bookings")
        .update({
          extension_status: "accepted",
          extension_minutes: newExtensionMinutes,
          extension_charges: newCharges,
          planned_end_time: newEnd.toISOString(),
          extension_request_minutes: null,
          extension_request_message: null,
        })
        .eq("id", bookingId);
      if (error) {
        console.error("[booking/extension] accept persist failed", error);
        return { ok: false, reason: error.message };
      }
    }
    push({ kind: "success", title: "Extension accepted", body: `+${addedMinutes} min · +₹${addedCost}` });
    return { ok: true };
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
        goBack,
        bookings,
        availableBookings,
        loadingBookings,
        createBooking,
        partnerAcceptBooking,
        customerConfirmPartner,
        cancelBooking,
        partnerStartService,
        completeBooking,
        markRated,
        saveRating,
        requestExtension,
        respondToExtension,
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
