import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";

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
  markAllRead: () => void;
  clear: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Periodically prune notifications older than 48 hours so the inbox stays
  // recent without requiring a refresh.
  useEffect(() => {
    const prune = () => {
      const cutoff = Date.now() - FORTY_EIGHT_HOURS_MS;
      setNotifications((prev) => {
        const next = prev.filter((n) => n.createdAt.getTime() >= cutoff);
        return next.length === prev.length ? prev : next;
      });
    };
    prune();
    const id = setInterval(prune, 60 * 1000); // every minute
    return () => clearInterval(id);
  }, []);

  const push: NotificationContextValue["push"] = useCallback((n) => {
    const item: AppNotification = {
      ...n,
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date(),
      read: false,
    };
    const cutoff = Date.now() - FORTY_EIGHT_HOURS_MS;
    setNotifications((prev) => [item, ...prev.filter((x) => x.createdAt.getTime() >= cutoff)]);
    const t =
      n.kind === "success" || n.kind === "confirm"
        ? toast.success
        : n.kind === "warning"
          ? toast.warning
          : n.kind === "match"
            ? toast.info
            : toast;
    t(n.title, { description: n.body });
  }, []);

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const clear = () => setNotifications([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, push, markAllRead, clear }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
};
