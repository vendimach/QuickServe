import { User, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";

export const RoleToggle = () => {
  const { role, setRole, navigate } = useApp();

  const handleChange = (next: "customer" | "partner") => {
    setRole(next);
    navigate(next === "partner" ? { name: "partner-dashboard" } : { name: "home" });
  };

  return (
    <div className="inline-flex items-center rounded-full bg-secondary p-1 shadow-soft">
      <button
        onClick={() => handleChange("customer")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-smooth",
          role === "customer"
            ? "bg-card text-foreground shadow-soft"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={role === "customer"}
      >
        <User className="h-3.5 w-3.5" />
        Customer
      </button>
      <button
        onClick={() => handleChange("partner")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-smooth",
          role === "partner"
            ? "bg-card text-foreground shadow-soft"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={role === "partner"}
      >
        <Briefcase className="h-3.5 w-3.5" />
        Partner
      </button>
    </div>
  );
};