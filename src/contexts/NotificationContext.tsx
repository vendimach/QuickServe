import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export type NotificationKind = "info" | "success" | "warning" | "match" | "confirm";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  createdAt: Date;
  read: boolean;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  push: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  pushFor: (userId: string, n: Omit<AppNotification, "id" | "createdAt" | "read">) => Promise<void>;
  markAllRead: () => void;
  clear: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      seenIdsRef.current = new Set();
      return;
    }
    let mounted = true;
    const cutoffIso = new Date(Date.now() - FORTY_EIGHT_HOURS_MS).toISOString();
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!mounted || !data) return;
        const items = data.map((row) => ({
          id: row.id,
          kind: row.kind as NotificationKind,
          title: row.title,
          body: row.body ?? undefined,
          read: !!row.read,
          createdAt: new Date(row.created_at),
        }));
        seenIdsRef.current = new Set(items.map((i) => i.id));
        setNotifications(items);
      });

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as {
            id: string; kind: string; title: string; body: string | null;
            read: boolean; created_at: string;
          };
          if (seenIdsRef.current.has(row.id)) return;
          seenIdsRef.current.add(row.id);
          setNotifications((prev) => [
            {
              id: row.id,
              kind: row.kind as NotificationKind,
              title: row.title,
              body: row.body ?? undefined,
              read: row.read,
              createdAt: new Date(row.created_at),
            },
            ...prev,
          ]);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Periodically prune notifications older than 48 hours so the inbox stays
  // recent without requiring a refresh.
  useEffect(() => {
    const prune = () => {
      const cutoff = Date.now() - FORTY_EIGHT_HOURS_MS;
      setNotifications((prev) => {
        const next = prev.filter((n) => n.createdAt.getTime() >= cutoff);
        return next.length === prev.length ? prev : next;
      });
      // also prune in DB (best-effort)
      if (user) {
        const cutoffIso = new Date(cutoff).toISOString();
        supabase
          .from("notifications")
          .delete()
          .eq("user_id", user.id)
          .lt("created_at", cutoffIso)
          .then(() => {});
      }
    };
    prune();
    const id = setInterval(prune, 60 * 1000); // every minute
    return () => clearInterval(id);
  }, [user]);

  const push: NotificationContextValue["push"] = useCallback((n) => {
    if (!user) return;
    // Persist; the realtime INSERT handler will add it to local state.
    supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        kind: n.kind,
        title: n.title,
        body: n.body ?? null,
      })
      .then(({ error }) => {
        if (error) console.error("Failed to persist notification", error);
      });
  }, [user]);

  // Push to ANOTHER user (e.g. notify a partner from the customer's session)
  const pushFor: NotificationContextValue["pushFor"] = useCallback(async (userId, n) => {
    const { error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        kind: n.kind,
        title: n.title,
        body: n.body ?? null,
      });
    if (error) console.error("Failed to push notification for user", error);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (user) {
      supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false)
        .then(() => {});
    }
  };
  const clear = () => {
    setNotifications([]);
    if (user) {
      supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id)
        .then(() => {});
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, push, pushFor, markAllRead, clear }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
};
