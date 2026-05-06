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
  Wallet,
  Heart,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { usePartnerData } from "@/contexts/PartnerDataContext";
import { useUserData } from "@/contexts/UserDataContext";
import { useWallet } from "@/contexts/WalletContext";
import { useFavorites, FAVORITES_LIMIT } from "@/contexts/FavoritesContext";
import { useBadges } from "@/contexts/BadgeContext";
import { cn } from "@/lib/utils";
import { AvatarBadge } from "./AvatarBadge";
import { TierProgressCard, BadgeChips } from "./TrustBadges";

export const ProfileView = () => {
  const { role, navigate } = useApp();
  const { profile, user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { push } = useNotifications();
  const { defaultAddress } = useUserData();
  const { averageRating, jobsCompletedTotal, trustStats } = usePartnerData();
  const { badgesForPartner } = useBadges();
  const { balance: walletBalance } = useWallet();
  const { count: favoritesCount } = useFavorites();

  const name = profile?.full_name ?? "Guest";

  type Row = {
    icon: typeof User;
    label: string;
    value: string;
    status?: "verified" | "pending";
    iconColor: string;
    action?: () => void;
  };

  const allRows: Row[] = [
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
    // Partner-only: real rating computed from completed bookings.
    // Hidden for customers since customer ratings are not surfaced today.
    ...(role === "partner"
      ? [{
          icon: Star,
          label: "Your Rating",
          value: averageRating != null
            ? `${averageRating.toFixed(1)} ★ • ${jobsCompletedTotal} job${jobsCompletedTotal === 1 ? "" : "s"}`
            : "No reviews yet",
          iconColor: "bg-warning/15 text-warning",
        } as Row]
      : []),
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
      icon: Wallet,
      label: "Wallet",
      value: `Balance ₹${walletBalance.toLocaleString("en-IN")} • Refunds, referrals & history`,
      iconColor: "bg-success/15 text-success",
      action: () => navigate({ name: "wallet" }),
    },
    // Favorites is customer-only — partners don't favorite anyone.
    ...(role === "customer"
      ? [{
          icon: Heart,
          label: "Favorite Partners",
          value: `${favoritesCount} of ${FAVORITES_LIMIT} • Priority matching & direct booking`,
          iconColor: "bg-destructive/15 text-destructive",
          action: () => navigate({ name: "favorites" }),
        } as Row]
      : []),
    {
      icon: Info,
      label: "About Us",
      value: "Version 1.0.0",
      iconColor: "bg-muted text-muted-foreground",
    },
  ];
  // Partners don't need customer-only rows: payments & saved addresses.
  const rows: Row[] = role === "partner"
    ? allRows.filter((r) => r.label !== "Payment Methods")
    : allRows;

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
      value: "Browse our help center",
      action: () => navigate({ name: "faqs" }),
      iconColor: "bg-warning/15 text-warning",
    },
  ] as const;

  return (
    <div className="space-y-4 px-5 pb-6">
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-4">
          <AvatarBadge
            src={profile?.avatar_url}
            name={name}
            className="h-16 w-16 text-xl shadow-soft"
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-foreground">{name}</h2>
            <button
              onClick={() => navigate({ name: "addresses" })}
              className="mt-1 flex items-start gap-1 text-left text-xs text-muted-foreground hover:text-foreground"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="line-clamp-2">
                {defaultAddress
                  ? `${defaultAddress.label} • ${defaultAddress.line1}${defaultAddress.city ? `, ${defaultAddress.city}` : ""}`
                  : "Add a saved address"}
              </span>
            </button>
            <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              {role}
            </span>
          </div>
        </div>
      </div>

      {/* Partner trust block — tier progress + earned badges */}
      {role === "partner" && user && (() => {
        const stats = trustStats ?? {
          completedBookings: jobsCompletedTotal,
          totalBookings: jobsCompletedTotal,
          partnerCancellations: 0,
          averageRating,
          ratedBookings: averageRating != null ? jobsCompletedTotal : 0,
          responseRatePct: null,
          punctualityMinutesLate: null,
          repeatCustomerRatio: null,
        };
        const earned = badgesForPartner(user.id, stats, { aadhaarVerified: profile?.aadhaar_verified });
        return (
          <div className="space-y-2">
            <TierProgressCard stats={stats} badgeCount={earned.length} />
            {earned.length > 0 && (
              <BadgeChips
                partnerId={user.id}
                stats={stats}
                aadhaarVerified={profile?.aadhaar_verified}
                size="md"
                className="px-1"
              />
            )}
          </div>
        );
      })()}

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
