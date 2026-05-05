import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminServices } from "@/components/admin/AdminServices";
import { AdminCategories } from "@/components/admin/AdminCategories";

type Section = "dashboard" | "services" | "categories" | "analytics";

// Analytics is an alias for Dashboard with the same component
const Admin = () => {
  const [section, setSection] = useState<Section>("dashboard");

  return (
    <AdminLayout section={section} onNavigate={setSection}>
      {(section === "dashboard" || section === "analytics") && <AdminDashboard />}
      {section === "services"   && <AdminServices />}
      {section === "categories" && <AdminCategories />}
    </AdminLayout>
  );
};

export default Admin;
