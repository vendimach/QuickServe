import { Bell, CheckCircle2, AlertTriangle, Info, Sparkles, Trash2 } from "lucide-react";
import { useNotifications, type AppNotification } from "@/contexts/NotificationContext";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const iconFor = (k: AppNotification["kind"]) => {
  switch (k) {
    case "success":
    case "confirm":
      return { Icon: CheckCircle2, cls: "bg-success/15 text-success" };
    case "warning":
      return { Icon: AlertTriangle, cls: "bg-warning/15 text-warning" };
    case "match":
      return { Icon: Sparkles, cls: "bg-primary/15 text-primary" };
    default:
      return { Icon: Info, cls: "bg-accent/15 text-accent" };
  }
};

const timeAgo = (d: Date) => {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

export const NotificationsView = () => {
  const { notifications, markAllRead, clear } = useNotifications();

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <div className="-mt-5 px-5 pb-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {notifications.length} notification{notifications.length === 1 ? "" : "s"}
        </p>
        {notifications.length > 0 && (
          <button
            onClick={clear}
            className="inline-flex items-center gap-1 text-xs font-semibold text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center shadow-soft">
          <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No notifications yet</p>
          <p className="text-xs text-muted-foreground">You'll see booking updates here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const { Icon, cls } = iconFor(n.kind);
            return (
              <div
                key={n.id}
                className={cn(
                  "flex gap-3 rounded-2xl bg-card p-3 shadow-soft transition-smooth",
                  !n.read && "ring-1 ring-primary/30",
                )}
              >
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", cls)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  )}
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
