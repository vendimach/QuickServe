import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

export const FAVORITES_LIMIT = 5;

export interface FavoritePartner {
  partnerId: string;
  partnerName: string;
  partnerAvatarUrl?: string;
  /** Most-recent booking id with this partner — used by the Rebook button. */
  lastBookingId?: string;
  addedAt: string; // ISO
}

interface FavoritesContextValue {
  favorites: FavoritePartner[];
  count: number;
  canAddMore: boolean;
  isFavorite: (partnerId: string) => boolean;
  /**
   * Add a partner to favorites. Returns reason on failure (limit reached,
   * duplicate, missing required data).
   */
  addFavorite: (partner: Omit<FavoritePartner, "addedAt">) => { ok: boolean; reason?: string };
  removeFavorite: (partnerId: string) => void;
  /**
   * Cross-user signal: how many DISTINCT users in this browser have
   * favourited a given partner. Used by partnerTrust to nudge the
   * reliability score and tier progression.
   */
  favoritedByCount: (partnerId: string) => number;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const userKey = (uid: string) => `qs.favorites.v1.${uid}`;
// Compact reverse index keeping a count of how many users have favorited a
// given partner — refreshed on every add/remove. Demo-only (single device).
const REVERSE_INDEX_KEY = "qs.favorites.reverse-index.v1";

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota/security */
  }
};

const readReverseIndex = (): Record<string, string[]> =>
  readJSON<Record<string, string[]>>(REVERSE_INDEX_KEY, {});
const writeReverseIndex = (idx: Record<string, string[]>) =>
  writeJSON(REVERSE_INDEX_KEY, idx);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [favorites, setFavorites] = useState<FavoritePartner[]>([]);
  const [reverseIndex, setReverseIndex] = useState<Record<string, string[]>>(() => readReverseIndex());

  // Hydrate per-user favorites whenever the active user changes. Reset to
  // empty on sign-out so the next user can't see the previous one's list.
  useEffect(() => {
    if (!userId) {
      setFavorites([]);
      return;
    }
    const stored = readJSON<FavoritePartner[]>(userKey(userId), []);
    setFavorites(stored);
  }, [userId]);

  // Persist favorites + keep the reverse index in sync. We rebuild the
  // reverse index entirely from the per-user record to keep it correct after
  // sign-outs and storage edits.
  useEffect(() => {
    if (!userId) return;
    writeJSON(userKey(userId), favorites);
    setReverseIndex((prev) => {
      const next = { ...prev };
      // Strip this user from every partner's list, then re-add for current favorites.
      for (const pid of Object.keys(next)) {
        next[pid] = (next[pid] ?? []).filter((id) => id !== userId);
      }
      for (const f of favorites) {
        const list = next[f.partnerId] ?? [];
        if (!list.includes(userId)) list.push(userId);
        next[f.partnerId] = list;
      }
      // Drop empty arrays so the index doesn't grow forever.
      for (const pid of Object.keys(next)) {
        if ((next[pid]?.length ?? 0) === 0) delete next[pid];
      }
      writeReverseIndex(next);
      return next;
    });
  }, [favorites, userId]);

  const isFavorite = useCallback(
    (partnerId: string) => favorites.some((f) => f.partnerId === partnerId),
    [favorites],
  );

  const addFavorite: FavoritesContextValue["addFavorite"] = useCallback(
    (partner) => {
      if (!partner.partnerId) return { ok: false, reason: "Missing partner id" };
      if (!userId) return { ok: false, reason: "Sign in to add favorites" };
      if (isFavorite(partner.partnerId)) {
        return { ok: false, reason: "Already in your favorites" };
      }
      if (favorites.length >= FAVORITES_LIMIT) {
        return { ok: false, reason: `You can favorite up to ${FAVORITES_LIMIT} partners. Remove one first.` };
      }
      setFavorites((prev) => [
        { ...partner, addedAt: new Date().toISOString() },
        ...prev,
      ]);
      return { ok: true };
    },
    [favorites, isFavorite, userId],
  );

  const removeFavorite: FavoritesContextValue["removeFavorite"] = useCallback(
    (partnerId) => {
      setFavorites((prev) => prev.filter((f) => f.partnerId !== partnerId));
    },
    [],
  );

  const favoritedByCount: FavoritesContextValue["favoritedByCount"] = useCallback(
    (partnerId) => (reverseIndex[partnerId]?.length ?? 0),
    [reverseIndex],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      count: favorites.length,
      canAddMore: favorites.length < FAVORITES_LIMIT,
      isFavorite,
      addFavorite,
      removeFavorite,
      favoritedByCount,
    }),
    [favorites, isFavorite, addFavorite, removeFavorite, favoritedByCount],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside FavoritesProvider");
  return ctx;
};
