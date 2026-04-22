import { ReactNode } from "react";
import { Home, Calendar, User, Briefcase, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { RoleToggle } from "./RoleToggle";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
}

export const AppShell = ({ children, title, subtitle, showHeader = true }: AppShellProps) => {
  const { role, view, navigate } = useApp();

  const customerTabs = [
    { name: "Home", icon: Home, view: { name: "home" as const } },
    { name: "Bookings", icon: Calendar, view: { name: "bookings" as const } },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background shadow-elevated md:my-4 md:min-h-[calc(100vh-2rem)] md:rounded-3xl md:overflow-hidden">
        {showHeader && (
          <header className="gradient-hero relative px-5 pt-6 pb-8 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-80">
                  {role === "customer" ? "Hello there 👋" : "Service Partner"}
                </p>
                <h1 className="text-xl font-bold">{title ?? "QuickServe"}</h1>
                {subtitle && (
                  <p className="mt-0.5 text-sm opacity-90">{subtitle}</p>
                )}
              </div>
              <button
                aria-label="Notifications"
                className="rounded-full bg-white/15 p-2.5 backdrop-blur-sm transition-smooth hover:bg-white/25"
              >
                <Bell className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 flex justify-center">
              <RoleToggle />
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto pb-24">{children}</main>

        <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 items-center justify-around border-t border-border bg-card/95 px-4 py-2 backdrop-blur-md md:absolute md:bottom-0 md:left-0 md:translate-x-0">
          {role === "customer" ? (
            customerTabs.map((tab) => {
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
            })
          ) : (
            <>
              <button
                onClick={() => navigate({ name: "partner-dashboard" })}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-primary transition-smooth"
              >
                <Briefcase className="h-5 w-5" />
                <span className="text-[11px] font-medium">Jobs</span>
              </button>
              <button className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-muted-foreground transition-smooth">
                <User className="h-5 w-5" />
                <span className="text-[11px] font-medium">Profile</span>
              </button>
            </>
          )}
        </nav>
      </div>
    </div>
  );
};