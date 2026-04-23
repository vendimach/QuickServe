import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import type { Review, ChatMessage, ServicePreferences } from "@/types";
import { seedReviews } from "@/data/services";

interface MarketplaceDataValue {
  reviews: Review[];
  addReview: (r: Omit<Review, "id" | "createdAt">) => void;
  reviewsForPro: (proId: string) => Review[];

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
      value={{ reviews, addReview, reviewsForPro, chats, sendMessage, preferences, setPreferences }}
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