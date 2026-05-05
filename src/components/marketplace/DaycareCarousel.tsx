import { useEffect, useRef, useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Star, ShieldCheck, Trophy, Gem, Sparkles, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { daycareCenters, type DaycareCenter } from "@/data/daycares";

const TAG_CONFIG = {
  "Top Rated":   { icon: Trophy,      cls: "bg-amber-400/90 text-amber-950" },
  "Verified":    { icon: ShieldCheck, cls: "bg-emerald-400/90 text-emerald-950" },
  "Premium":     { icon: Gem,         cls: "bg-violet-400/90 text-violet-950" },
  "New Partner": { icon: Sparkles,    cls: "bg-sky-400/90 text-sky-950" },
} as const;

function DaycareCard({ center }: { center: DaycareCenter }) {
  const tag = TAG_CONFIG[center.tag];
  const TagIcon = tag.icon;

  return (
    <div className="relative h-52 w-full overflow-hidden rounded-3xl shadow-card select-none">
      {/* Gradient "image" background */}
      <div
        className="absolute inset-0"
        style={{
          background: center.gradientVia
            ? `linear-gradient(135deg, ${center.gradientFrom}, ${center.gradientVia}, ${center.gradientTo})`
            : `linear-gradient(135deg, ${center.gradientFrom}, ${center.gradientTo})`,
        }}
      />

      {/* Decorative SVG pattern overlay */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.07]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id={`grid-${center.id}`} width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${center.id})`} />
      </svg>

      {/* Decorative circles */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-4 left-1/3 h-20 w-20 rounded-full bg-white/10" />

      {/* Bottom gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

      {/* Tag badge — top left */}
      <div className={cn(
        "absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-soft",
        tag.cls,
      )}>
        <TagIcon className="h-3 w-3" />
        {center.tag}
      </div>

      {/* Content — bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="truncate text-base font-bold text-white leading-tight">
          {center.name}
        </h3>
        <div className="mt-1 flex items-center justify-between">
          <p className="flex items-center gap-1 text-[11px] text-white/80">
            <MapPin className="h-3 w-3 shrink-0" />
            {center.address}
          </p>
          <div className="flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 backdrop-blur-sm">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-white">{center.rating}</span>
            <span className="text-[10px] text-white/70">({center.reviewCount})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const DaycareCarousel = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
    containScroll: "trimSnaps",
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const hovered = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  // Manual autoplay
  const startAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!hovered.current && emblaApi) emblaApi.scrollNext();
    }, 3500);
  }, [emblaApi]);

  useEffect(() => {
    startAutoplay();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startAutoplay]);

  return (
    <section className="animate-fade-in-up">
      <div className="mb-3 px-5">
        <h2 className="text-base font-bold text-foreground">Affiliated Daycare Centers</h2>
        <p className="text-xs text-muted-foreground">Trusted, verified centres near you</p>
      </div>

      <div
        className="overflow-hidden px-5"
        ref={emblaRef}
        onMouseEnter={() => { hovered.current = true; }}
        onMouseLeave={() => { hovered.current = false; }}
        onTouchStart={() => { hovered.current = true; }}
        onTouchEnd={() => { hovered.current = false; }}
      >
        <div className="flex gap-3">
          {daycareCenters.map((center) => (
            <div
              key={center.id}
              className="min-w-[82%] cursor-pointer transition-transform duration-200 active:scale-[0.97] sm:min-w-[60%]"
              onClick={() => {
                /* placeholder: navigate to daycare detail */
              }}
            >
              <DaycareCard center={center} />
            </div>
          ))}
        </div>
      </div>

      {/* Dots indicator */}
      <div className="mt-3 flex items-center justify-center gap-1.5 px-5">
        {scrollSnaps.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={cn(
              "rounded-full transition-all duration-300",
              i === selectedIndex
                ? "h-2 w-5 bg-primary"
                : "h-2 w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50",
            )}
          />
        ))}
      </div>
    </section>
  );
};
