import { AppProvider, useApp } from "@/contexts/AppContext";
import { AppShell } from "@/components/marketplace/AppShell";
import { HomeView } from "@/components/marketplace/HomeView";
import { CategoryView } from "@/components/marketplace/CategoryView";
import { ServiceDetail } from "@/components/marketplace/ServiceDetail";
import { BookingFlow } from "@/components/marketplace/BookingFlow";
import { LiveStatus } from "@/components/marketplace/LiveStatus";
import { BookingsList } from "@/components/marketplace/BookingsList";
import { PartnerDashboard } from "@/components/marketplace/PartnerDashboard";
import { ProfileView } from "@/components/marketplace/ProfileView";
import { MatchingList } from "@/components/marketplace/MatchingList";
import { NotificationsView } from "@/components/marketplace/NotificationsView";
import { RatingForm } from "@/components/marketplace/RatingForm";
import { PartnerProfile } from "@/components/marketplace/PartnerProfile";
import { ChatView } from "@/components/marketplace/ChatView";
import { LiveCam } from "@/components/marketplace/LiveCam";
import { ReferEarn } from "@/components/marketplace/ReferEarn";
import { categories, services } from "@/data/services";

const Router = () => {
  const { view, role } = useApp();

  if (view.name === "notifications") {
    return (
      <AppShell title="Notifications" subtitle="Updates on your bookings">
        <NotificationsView />
      </AppShell>
    );
  }

  if (view.name === "rate-booking") {
    return (
      <AppShell title="Rate & Review" subtitle="Tell us how it went">
        <RatingForm bookingId={view.bookingId} />
      </AppShell>
    );
  }

  if (view.name === "partner-profile") {
    return (
      <AppShell title="Partner Profile" subtitle="Reviews & schedule">
        <PartnerProfile partnerId={view.partnerId} />
      </AppShell>
    );
  }

  if (view.name === "chat") {
    return (
      <AppShell title="Chat" subtitle="In-booking messages">
        <ChatView bookingId={view.bookingId} />
      </AppShell>
    );
  }

  if (view.name === "live-cam") {
    return (
      <AppShell title="Live Cam" subtitle="Encrypted in-home view">
        <LiveCam bookingId={view.bookingId} />
      </AppShell>
    );
  }

  if (view.name === "refer-earn") {
    return (
      <AppShell title="Refer & Earn" subtitle="Invite friends, earn credits">
        <ReferEarn />
      </AppShell>
    );
  }

  if (role === "partner") {
    switch (view.name) {
      case "bookings":
        return (
          <AppShell title="My Jobs" subtitle="Scheduled, completed & more">
            <BookingsList />
          </AppShell>
        );
      case "profile":
        return (
          <AppShell title="My Profile" subtitle="Account & verification">
            <ProfileView />
          </AppShell>
        );
      default:
        return (
          <AppShell title="Partner Hub" subtitle="Manage your availability">
            <PartnerDashboard />
          </AppShell>
        );
    }
  }

  switch (view.name) {
    case "home":
      return (
        <AppShell title="QuickServe" subtitle="Home services on demand">
          <HomeView />
        </AppShell>
      );
    case "category": {
      const cat = categories.find((c) => c.id === view.categoryId);
      return (
        <AppShell title={cat?.name ?? "Category"} subtitle={cat?.description}>
          <CategoryView categoryId={view.categoryId} />
        </AppShell>
      );
    }
    case "service-detail": {
      const s = services.find((sv) => sv.id === view.serviceId);
      return (
        <AppShell title={s?.name ?? "Service"} subtitle="Service details">
          <ServiceDetail serviceId={view.serviceId} />
        </AppShell>
      );
    }
    case "booking-flow":
      return (
        <AppShell title="Book Service" subtitle="Choose how & when">
          <BookingFlow serviceId={view.serviceId} />
        </AppShell>
      );
    case "matching":
      return (
        <AppShell title="Matching Partners" subtitle="Pick the partner you want">
          <MatchingList bookingId={view.bookingId} />
        </AppShell>
      );
    case "live-status":
      return (
        <AppShell title="Live Status" subtitle="Track your booking">
          <LiveStatus bookingId={view.bookingId} />
        </AppShell>
      );
    case "bookings":
      return (
        <AppShell title="My Bookings" subtitle="All your service requests">
          <BookingsList />
        </AppShell>
      );
    case "profile":
      return (
        <AppShell title="My Profile" subtitle="Account & preferences">
          <ProfileView />
        </AppShell>
      );
    default:
      return null;
  }
};

const Index = () => (
  <AppProvider>
    <Router />
  </AppProvider>
);

export default Index;
