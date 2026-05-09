import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import type { Review, ServicePreferences } from "@/types";
import { seedReviews } from "@/data/services";

export interface ProfessionalRating {
  average: number | null;
  count: number;
}

interface MarketplaceDataValue {
  reviews: Review[];
  addReview: (r: Omit<Review, "id" | "createdAt">) => void;
  reviewsForPro: (proId: string) => Review[];
  ratingForPro: (proId: string) => ProfessionalRating;

  preferences: Record<string, ServicePreferences>;
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
    } catch { /* ignore */ }
    return seedReviews;
  });

  const [preferences, setPrefsState] = useState<Record<string, ServicePreferences>>(() => {
    try {
      const raw = localStorage.getItem(LS_PREFS);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {};
  });

  useEffect(() => {
    try {
      const userOnly = reviews.filter((r) => !seedReviews.find((s) => s.id === r.id));
      localStorage.setItem(LS_REVIEWS, JSON.stringify(userOnly));
    } catch { /* ignore */ }
  }, [reviews]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_PREFS, JSON.stringify(preferences));
    } catch { /* ignore */ }
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

  const ratingForPro = useCallback(
    (proId: string): ProfessionalRating => {
      const own = reviews.filter(
        (r) => r.professionalId === proId && typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5,
      );
      if (own.length === 0) return { average: null, count: 0 };
      const sum = own.reduce((s, r) => s + r.rating, 0);
      const avg = Math.round((sum / own.length) * 10) / 10;
      return { average: avg, count: own.length };
    },
    [reviews],
  );

  const setPreferences: MarketplaceDataValue["setPreferences"] = useCallback((serviceId, prefs) => {
    setPrefsState((prev) => ({ ...prev, [serviceId]: prefs }));
  }, []);

  return (
    <MarketplaceDataContext.Provider
      value={{ reviews, addReview, reviewsForPro, ratingForPro, preferences, setPreferences }}
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
