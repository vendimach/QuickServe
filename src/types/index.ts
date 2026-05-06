export type Role = "customer" | "partner" | "admin";

export type BookingType = "instant" | "scheduled";

export type BookingStatus =
  | "searching"
  | "awaiting-customer-confirm"
  | "confirmed"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "refunded";

export interface Service {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  duration: string;
  rating: number;
  reviews: number;
  description: string;
  icon: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface ScheduleSlot {
  days: DayOfWeek[];
  start: string; // "17:00"
  end: string;   // "22:00"
}

export interface Review {
  id: string;
  professionalId: string;
  bookingId: string;
  rating: number; // 1-5
  comment?: string;
  customerName: string;
  createdAt: Date;
  tags?: string[]; // e.g. "Punctual", "Polite"
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  from: "customer" | "partner";
  text: string;
  createdAt: Date;
}

export interface ServicePreferences {
  serviceId: string;
  notes: string;
  schedule?: { label: string; time: string }[]; // e.g. [{label: "Walk", time: "06:00"}]
}

export interface Professional {
  id: string;
  name: string;
  rating: number;
  jobs: number;
  /** Two-letter initials shown when no photo is available. */
  avatar: string;
  /** Optional uploaded photo (data URI or remote URL). */
  avatarUrl?: string;
  eta: string;
  categoryIds?: string[];
  availableNow?: boolean;
  listedToday?: boolean;
  distance?: string;
  schedule?: ScheduleSlot[];
  bio?: string;
}

export type ExtensionStatus = "none" | "pending" | "accepted" | "declined";

export interface Booking {
  id: string;
  service: Service;
  type: BookingType;
  status: BookingStatus;
  scheduledAt?: Date;
  createdAt: Date;
  professional?: Professional;
  address: string;
  acceptedBy?: Professional[];
  arrivedAt?: Date;
  confirmedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationFee?: number;
  cancellationReason?: string;
  startOtp?: string;
  paymentStatus?: "pending" | "paid" | "failed" | "refunded";
  paymentMethod?: string;
  rating?: number;
  ratingComment?: string;
  preferences?: ServicePreferences;
  rated?: boolean;
  userLat?: number;
  userLng?: number;
  partnerLat?: number;
  partnerLng?: number;
  partnerUserId?: string;

  /** When set, this booking is targeted at a specific favorite partner only. */
  requestedPartnerId?: string;
  /** Optional note from the customer when sending a personal request. */
  personalMessage?: string;

  // ── Timer + extension fields ───────────────────────────────────────────
  /** Original duration of the booked service in minutes, snapshotted at start. */
  plannedDurationMinutes?: number;
  /** When the timer is expected to auto-complete (start + plannedDuration + extensionMinutes). */
  plannedEndTime?: Date;
  /** Filled in at completion time; how long the partner actually worked. */
  actualDurationMinutes?: number;
  /** Final billed amount (base + extension). null until completion. */
  finalAmount?: number;
  /** Cumulative extra minutes added through accepted extensions. */
  extensionMinutes?: number;
  /** Cumulative extension charges to date (added to finalAmount). */
  extensionCharges?: number;
  /** Pending extension request — minutes the user is asking for. */
  extensionRequestMinutes?: number;
  /** Pending extension request — optional message from the user. */
  extensionRequestMessage?: string;
  /** Lifecycle of the latest extension request. */
  extensionStatus?: ExtensionStatus;
}

export interface PartnerRequest {
  id: string;
  serviceName: string;
  customerName: string;
  distance: string;
  price: number;
  type: BookingType;
  scheduledAt?: Date;
  address: string;
}