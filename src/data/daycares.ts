export interface DaycareCenter {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  tag: "Verified" | "Top Rated" | "Premium" | "New Partner";
  gradientFrom: string;
  gradientTo: string;
  gradientVia?: string;
}

export const daycareCenters: DaycareCenter[] = [
  {
    id: "dc1",
    name: "Sunshine Kids Daycare",
    address: "Koramangala, Bengaluru",
    rating: 4.9,
    reviewCount: 312,
    tag: "Top Rated",
    gradientFrom: "#f97316",
    gradientVia: "#fb923c",
    gradientTo: "#fbbf24",
  },
  {
    id: "dc2",
    name: "Little Wonders Centre",
    address: "Banjara Hills, Hyderabad",
    rating: 4.8,
    reviewCount: 218,
    tag: "Verified",
    gradientFrom: "#6366f1",
    gradientVia: "#8b5cf6",
    gradientTo: "#a78bfa",
  },
  {
    id: "dc3",
    name: "Rainbow Nursery",
    address: "Andheri West, Mumbai",
    rating: 4.7,
    reviewCount: 410,
    tag: "Premium",
    gradientFrom: "#0ea5e9",
    gradientVia: "#06b6d4",
    gradientTo: "#2dd4bf",
  },
  {
    id: "dc4",
    name: "Tiny Steps Learning",
    address: "Alwarpet, Chennai",
    rating: 4.9,
    reviewCount: 156,
    tag: "Top Rated",
    gradientFrom: "#10b981",
    gradientVia: "#059669",
    gradientTo: "#047857",
  },
  {
    id: "dc5",
    name: "Happy Minds Daycare",
    address: "Aundh, Pune",
    rating: 4.6,
    reviewCount: 289,
    tag: "Verified",
    gradientFrom: "#ec4899",
    gradientVia: "#f43f5e",
    gradientTo: "#fb7185",
  },
  {
    id: "dc6",
    name: "Bloomfield Kids Hub",
    address: "Salt Lake, Kolkata",
    rating: 4.8,
    reviewCount: 193,
    tag: "New Partner",
    gradientFrom: "#f59e0b",
    gradientVia: "#d97706",
    gradientTo: "#b45309",
  },
  {
    id: "dc7",
    name: "Sprouts Childcare",
    address: "Vasant Kunj, New Delhi",
    rating: 4.7,
    reviewCount: 374,
    tag: "Premium",
    gradientFrom: "#3b82f6",
    gradientVia: "#2563eb",
    gradientTo: "#1d4ed8",
  },
];
