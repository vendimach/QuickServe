import { ArrowLeft, Star, Clock, ChevronRight } from "lucide-react";
import { categories, services } from "@/data/services";
import { useApp } from "@/contexts/AppContext";

interface Props {
  categoryId: string;
}

export const CategoryView = ({ categoryId }: Props) => {
  const { navigate } = useApp();
  const category = categories.find((c) => c.id === categoryId);
  const list = services.filter((s) => s.categoryId === categoryId);

  if (!category) return null;

  return (
    <div>
      <div className="px-5">
        <button
          onClick={() => navigate({ name: "home" })}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft transition-smooth hover:shadow-card"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="mb-4 rounded-2xl bg-card p-4 shadow-card">
          <h2 className="text-lg font-bold text-foreground">{category.name}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{category.description}</p>
        </div>
        <div className="space-y-3">
          {list.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate({ name: "service-detail", serviceId: s.id })}
              className="flex w-full items-start gap-3 rounded-2xl bg-card p-4 text-left shadow-soft transition-smooth hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-foreground">{s.name}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    <span className="font-semibold text-foreground">{s.rating}</span>
                    <span>({s.reviews.toLocaleString()})</span>
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" /> {s.duration}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                <p className="mt-2 text-base font-bold text-foreground">₹{s.price}</p>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};