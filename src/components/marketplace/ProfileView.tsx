import {
  User,
  MapPin,
  ShieldCheck,
  Phone,
  Mail,
  Star,
  CreditCard,
  Home,
  Info,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
  LogOut,
  Headphones,
  MessageCircle,
  HelpCircle,
  Gift,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";

export const ProfileView = () => {
  const { role, navigate } = useApp();
  const { profile, user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { push } = useNotifications();

  const name = profile?.full_name ?? "Guest";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  type Row = {
    icon: typeof User;
    label: string;
    value: string;
    status?: "verified" | "pending";
    iconColor: string;
    action?: () => void;
  };

  const rows: Row[] = [
    {
      icon: ShieldCheck,
      label: "Aadhaar Verification",
      value: profile?.aadhaar_verified ? `Verified • ••${profile.aadhaar_last4}` : "Verify now",
      status: profile?.aadhaar_verified ? "verified" : "pending",
      iconColor: "bg-success/15 text-success",
    },
    {
      icon: Phone,
      label: "Mobile Number",
      value: profile?.mobile ?? "—",
      status: profile?.mobile_verified ? "verified" : "pending",
      iconColor: "bg-primary/10 text-primary",
    },
    {
      icon: Mail,
      label: "Email",
      value: user?.email ?? "—",
      status: user?.email_confirmed_at ? "verified" : "pending",
      iconColor: "bg-accent/10 text-accent",
    },
    {
      icon: Star,
      label: "Your Rating",
      value: role === "partner" ? "4.9 ★" : "4.8 ★",
      iconColor: "bg-warning/15 text-warning",
    },
    {
      icon: User,
      label: "Edit Profile",
      value: "Name, mobile, bio",
      iconColor: "bg-primary/10 text-primary",
      action: () => navigate({ name: "edit-profile" }),
    },
    {
      icon: CreditCard,
      label: "Payment Methods",
      value: "Manage cards, UPI & wallets",
      iconColor: "bg-primary/10 text-primary",
      action: () => navigate({ name: "payments" }),
    },
    {
      icon: Home,
      label: "Saved Addresses",
      value: "Add or edit your addresses",
      iconColor: "bg-accent/10 text-accent",
      action: () => navigate({ name: "addresses" }),
    },
    {
      icon: HelpCircle,
      label: "FAQs & Help Center",
      value: "Searchable answers, 24×7",
      iconColor: "bg-warning/15 text-warning",
      action: () => navigate({ name: "faqs" }),
    },
    {
      icon: Info,
      label: "About Us",
      value: "Version 1.0.0",
      iconColor: "bg-muted text-muted-foreground",
    },
  ];

  const supportRows = [
    {
      icon: Headphones,
      label: "Customer Care",
      value: "+91 1800-123-456 • 24×7",
      action: () => window.open("tel:+911800123456"),
      iconColor: "bg-success/15 text-success",
    },
    {
      icon: Mail,
      label: "Email Support",
      value: "support@quickserve.app",
      action: () => window.open("mailto:support@quickserve.app"),
      iconColor: "bg-primary/10 text-primary",
    },
    {
      icon: MessageCircle,
      label: "Contact Us",
      value: "Send a message",
      action: () => push({ kind: "info", title: "Message sent", body: "We'll reply within 24h." }),
      iconColor: "bg-accent/10 text-accent",
    },
    {
      icon: HelpCircle,
      label: "FAQs & Help",
      value: "Tap the AI bubble for instant help",
      action: () => push({ kind: "info", title: "Tip", body: "Use the floating AI bubble bottom-right." }),
      iconColor: "bg-warning/15 text-warning",
    },
  ] as const;

  return (
    <div className="-mt-5 space-y-4 px-5 pb-6">
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary text-xl font-bold text-primary-foreground shadow-soft">
            {initials || <User className="h-7 w-7" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-foreground">{name}</h2>
            <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="line-clamp-2">12, MG Road, Bengaluru 560001</span>
            </div>
            <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              {role}
            </span>
          </div>
        </div>
      </div>

      {/* Theme toggle row */}
      <button
        onClick={toggleTheme}
        className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 shadow-soft transition-smooth hover:bg-secondary/50"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">Appearance</p>
          <p className="mt-0.5 text-xs text-muted-foreground capitalize">{theme} mode</p>
        </div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-foreground">
          Switch
        </span>
      </button>

      {/* Refer & Earn promo card */}
      <button
        onClick={() => navigate({ name: "refer-earn" })}
        className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl gradient-primary p-4 text-left text-primary-foreground shadow-card transition-smooth hover:opacity-95"
      >
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary-foreground/10 blur-xl" />
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15">
          <Gift className="h-5 w-5" />
        </div>
        <div className="relative flex-1">
          <p className="text-sm font-bold">Refer & Earn ₹200</p>
          <p className="mt-0.5 text-xs text-primary-foreground/85">
            Invite friends — they save ₹100, you earn ₹200
          </p>
        </div>
        <ChevronRight className="relative h-4 w-4 shrink-0" />
      </button>

      <div className="overflow-hidden rounded-2xl bg-card shadow-soft">
        {rows.map((r, i) => {
          const Icon = r.icon;
          return (
            <button
              key={r.label}
              onClick={r.action}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-smooth hover:bg-secondary/50",
                i !== rows.length - 1 && "border-b border-border",
              )}
            >
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", r.iconColor)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{r.label}</p>
                {r.value && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.value}</p>
                )}
              </div>
              {r.status === "verified" && (
                <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
              )}
              {r.status === "pending" && (
                <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase text-warning">
                  <AlertCircle className="h-3 w-3" /> Pending
                </span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      <div>
        <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Help & Support
        </p>
        <div className="overflow-hidden rounded-2xl bg-card shadow-soft">
          {supportRows.map((r, i) => {
            const Icon = r.icon;
            return (
              <button
                key={r.label}
                onClick={r.action}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-smooth hover:bg-secondary/50",
                  i !== supportRows.length - 1 && "border-b border-border",
                )}
              >
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", r.iconColor)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{r.label}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.value}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-card py-3 text-sm font-bold text-destructive shadow-soft transition-smooth hover:bg-destructive/5"
      >
        <LogOut className="h-4 w-4" /> Sign Out
      </button>
    </div>
  );
};
