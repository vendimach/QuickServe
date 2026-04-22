export type Role = "customer" | "partner";

export type BookingType = "instant" | "scheduled";

export type BookingStatus =
  | "searching"
  | "confirmed"
  | "in-progress"
  | "completed"
  | "cancelled";

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

export interface Professional {
  id: string;
  name: string;
  rating: number;
  jobs: number;
  avatar: string;
  eta: string;
}

export interface Booking {
  id: string;
  service: Service;
  type: BookingType;
  status: BookingStatus;
  scheduledAt?: Date;
  createdAt: Date;
  professional?: Professional;
  address: string;
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