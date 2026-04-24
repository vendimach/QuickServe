import { ReactNode } from "react";
import { Home, Calendar, User, Briefcase, Bell, Sun, Moon, LayoutDashboard, Sparkles } from "lucide-react";
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

  const tabs = role === "partner" ? partnerTabs : customerTabs;
  const greeting = profile?.full_name?.split(" ")[0] ?? (role === "partner" ? "Partner" : "there");

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 xl:w-72 lg:flex-col lg:border-r lg:border-border lg:bg-card lg:px-4 lg:py-6 lg:fixed lg:inset-y-0 lg:left-0 lg:z-20">
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-soft">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-extrabold text-foreground">QuickServe</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {role === "partner" ? "Partner" : role === "admin" ? "Admin" : "Customer"}
            </p>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = view.name === tab.view.name;
            return (
              <button
                key={tab.name}
                onClick={() => navigate(tab.view)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-smooth",
                  active
                    ? "gradient-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" /> {tab.name}
              </button>
            );
          })}
          <button
            onClick={() => navigate({ name: "notifications" })}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-smooth",
              view.name === "notifications"
                ? "gradient-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Bell className="h-4 w-4" /> Notifications
            {unreadCount > 0 && (
              <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                {unreadCount}
              </span>
            )}
          </button>
          {role === "admin" && (
            <button
              onClick={() => navigate({ name: "admin" })}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-smooth",
                view.name === "admin"
                  ? "gradient-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <LayoutDashboard className="h-4 w-4" /> Admin
            </button>
          )}
        </nav>

        <div className="mt-auto space-y-2">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-foreground transition-smooth hover:bg-secondary"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <p className="px-2 text-[10px] text-muted-foreground">
            Hi {greeting} 👋
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="lg:flex-1 lg:ml-64 xl:ml-72">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background shadow-elevated sm:my-4 sm:min-h-[calc(100vh-2rem)] sm:rounded-3xl sm:overflow-hidden lg:my-0 lg:max-w-none lg:rounded-none lg:shadow-none">
        {showHeader && (
          <header className="gradient-hero relative px-5 pt-6 pb-8 text-primary-foreground lg:px-10 lg:pt-10 lg:pb-12">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-80">
                  {role === "customer" ? `Hi ${greeting} 👋` : "Service Partner"}
                </p>
                <h1 className="text-xl font-bold lg:text-3xl">{title ?? "QuickServe"}</h1>
                {subtitle && (
                  <p className="mt-0.5 text-sm opacity-90 lg:text-base">{subtitle}</p>
                )}
              </div>
              <div className="flex items-center gap-2 lg:hidden">
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

        <main className="flex-1 overflow-y-auto pb-24 lg:pb-12">
          <div className="lg:mx-auto lg:max-w-6xl lg:px-6">{children}</div>
        </main>

        <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 items-center justify-around border-t border-border bg-card/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:absolute sm:bottom-0 sm:left-0 sm:translate-x-0 lg:hidden">
          {tabs.map((tab) => {
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
      </div>
      <AiAssistant />
    </div>
  );
};
