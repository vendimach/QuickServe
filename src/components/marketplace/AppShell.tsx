import { ReactNode } from "react";
import { Home, Calendar, User, Briefcase, Bell, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { AiAssistant } from "./AiAssistant";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
}

export const AppShell = ({ children, title, subtitle, showHeader = true }: AppShellProps) => {
  const { role, view, navigate } = useApp();
  const { profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();

  const customerTabs = [
    { name: "Home", icon: Home, view: { name: "home" as const } },
    { name: "Bookings", icon: Calendar, view: { name: "bookings" as const } },
    { name: "Profile", icon: User, view: { name: "profile" as const } },
  ];

  const partnerTabs = [
    { name: "Home", icon: Home, view: { name: "partner-dashboard" as const } },
    { name: "Jobs", icon: Briefcase, view: { name: "bookings" as const } },
    { name: "Profile", icon: User, view: { name: "profile" as const } },
  ];

  const greeting = profile?.full_name?.split(" ")[0] ?? (role === "partner" ? "Partner" : "there");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background shadow-elevated sm:my-4 sm:min-h-[calc(100vh-2rem)] sm:rounded-3xl sm:overflow-hidden lg:max-w-lg">
        {showHeader && (
          <header className="gradient-hero relative px-5 pt-6 pb-8 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-80">
                  {role === "customer" ? `Hi ${greeting} 👋` : "Service Partner"}
                </p>
                <h1 className="text-xl font-bold">{title ?? "QuickServe"}</h1>
                {subtitle && (
                  <p className="mt-0.5 text-sm opacity-90">{subtitle}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Toggle theme"
                  onClick={toggleTheme}
                  className="rounded-full bg-white/15 p-2.5 backdrop-blur-sm transition-smooth hover:bg-white/25"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <button
                  aria-label="Notifications"
                  onClick={() => navigate({ name: "notifications" })}
                  className="relative rounded-full bg-white/15 p-2.5 backdrop-blur-sm transition-smooth hover:bg-white/25"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto pb-24">{children}</main>

        <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 items-center justify-around border-t border-border bg-card/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:absolute sm:bottom-0 sm:left-0 sm:translate-x-0 lg:max-w-lg">
          {(role === "customer" ? customerTabs : partnerTabs).map((tab) => {
            const active = view.name === tab.view.name;
            const Icon = tab.icon;
            return (
              <button
                key={tab.name}
                onClick={() => navigate(tab.view)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 transition-smooth",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110")} />
                <span className="text-[11px] font-medium">{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <AiAssistant />
    </div>
  );
};
