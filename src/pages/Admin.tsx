import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminServices } from "@/components/admin/AdminServices";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { AdminBadges } from "@/components/admin/AdminBadges";
import { AdminPartners } from "@/components/admin/AdminPartners";

type Section = "dashboard" | "services" | "categories" | "analytics" | "partners" | "badges";

// Analytics is an alias for Dashboard with the same component
const Admin = () => {
  const [section, setSection] = useState<Section>("dashboard");

  return (
    <AdminLayout section={section} onNavigate={setSection}>
      {(section === "dashboard" || section === "analytics") && <AdminDashboard />}
      {section === "partners"   && <AdminPartners />}
      {section === "badges"     && <AdminBadges />}
      {section === "services"   && <AdminServices />}
      {section === "categories" && <AdminCategories />}
    </AdminLayout>
  );
};

export default Admin;
