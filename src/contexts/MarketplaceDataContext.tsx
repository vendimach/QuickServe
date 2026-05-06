import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import type { Review, ChatMessage, ServicePreferences } from "@/types";
import { seedReviews } from "@/data/services";

export interface ProfessionalRating {
  /** Average across all valid review ratings, rounded to 1dp. null if no reviews. */
  average: number | null;
  /** Total number of reviews used in the average. */
  count: number;
}

interface MarketplaceDataValue {
  reviews: Review[];
  addReview: (r: Omit<Review, "id" | "createdAt">) => void;
  reviewsForPro: (proId: string) => Review[];
  /** Dynamic rating computed from reviews. Replaces any static professional.rating value. */
  ratingForPro: (proId: string) => ProfessionalRating;

  chats: Record<string, ChatMessage[]>;
  sendMessage: (bookingId: string, from: "customer" | "partner", text: string) => void;

  preferences: Record<string, ServicePreferences>; // keyed by serviceId
  setPreferences: (serviceId: string, prefs: ServicePreferences) => void;
}

const MarketplaceDataContext = createContext<MarketplaceDataValue | null>(null);

const LS_REVIEWS = "qs_reviews";
const LS_PREFS = "qs_prefs";

export const MarketplaceDataProvider = ({ children }: { children: ReactNode }) => {
  const [reviews, setReviews] = useState<Review[]>(() => {
    try {
      const raw = localStorage.getItem(LS_REVIEWS);
      if (raw) {
        const parsed = JSON.parse(raw) as Review[];
        return [
          ...parsed.map((r) => ({ ...r, createdAt: new Date(r.createdAt) })),
          ...seedReviews.filter((s) => !parsed.find((p) => p.id === s.id)),
        ];
      }
    } catch {
      // ignore
    }
    return seedReviews;
  });

  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [preferences, setPrefsState] = useState<Record<string, ServicePreferences>>(() => {
    try {
      const raw = localStorage.getItem(LS_PREFS);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return {};
  });

  useEffect(() => {
    try {
      const userOnly = reviews.filter((r) => !seedReviews.find((s) => s.id === r.id));
      localStorage.setItem(LS_REVIEWS, JSON.stringify(userOnly));
    } catch {
      // ignore
    }
  }, [reviews]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_PREFS, JSON.stringify(preferences));
    } catch {
      // ignore
    }
  }, [preferences]);

  const addReview: MarketplaceDataValue["addReview"] = useCallback((r) => {
    setReviews((prev) => [
      { ...r, id: `rv-${Date.now()}`, createdAt: new Date() },
      ...prev,
    ]);
  }, []);

  const reviewsForPro = useCallback(
    (proId: string) => reviews.filter((r) => r.professionalId === proId),
    [reviews],
  );

  // Dynamic rating: average of valid review ratings (1–5). No static fallback —
  // returns { average: null, count: 0 } when there are no reviews so the UI
  // can render a clear empty state instead of a fake number.
  const ratingForPro = useCallback(
    (proId: string): ProfessionalRating => {
      const own = reviews.filter(
        (r) => r.professionalId === proId && typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5,
      );
      if (own.length === 0) return { average: null, count: 0 };
      const sum = own.reduce((s, r) => s + r.rating, 0);
      // Round to 1 decimal place (e.g. 4.7).
      const avg = Math.round((sum / own.length) * 10) / 10;
      return { average: avg, count: own.length };
    },
    [reviews],
  );

  const sendMessage: MarketplaceDataValue["sendMessage"] = useCallback((bookingId, from, text) => {
    const msg: ChatMessage = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      bookingId,
      from,
      text,
      createdAt: new Date(),
    };
    setChats((prev) => ({
      ...prev,
      [bookingId]: [...(prev[bookingId] ?? []), msg],
    }));

    // Auto-reply from the other side after a delay (demo)
    if (from === "customer") {
      setTimeout(() => {
        const reply: ChatMessage = {
          id: `m-${Date.now()}-r`,
          bookingId,
          from: "partner",
          text: "Got it! On my way 👍",
          createdAt: new Date(),
        };
        setChats((prev) => ({
          ...prev,
          [bookingId]: [...(prev[bookingId] ?? []), reply],
        }));
      }, 1800);
    }
  }, []);

  const setPreferences: MarketplaceDataValue["setPreferences"] = useCallback((serviceId, prefs) => {
    setPrefsState((prev) => ({ ...prev, [serviceId]: prefs }));
  }, []);

  return (
    <MarketplaceDataContext.Provider
      value={{ reviews, addReview, reviewsForPro, ratingForPro, chats, sendMessage, preferences, setPreferences }}
    >
      {children}
    </MarketplaceDataContext.Provider>
  );
};

export const useMarketplaceData = () => {
  const ctx = useContext(MarketplaceDataContext);
  if (!ctx) throw new Error("useMarketplaceData must be used inside MarketplaceDataProvider");
  return ctx;
};