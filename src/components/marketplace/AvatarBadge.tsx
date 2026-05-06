import { useState } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Image URL or data URI. When null/undefined or load fails, falls back to initials/icon. */
  src?: string | null;
  /** Display name used to derive initials when no image is available. */
  name?: string | null;
  /** Tailwind size classes — caller controls the actual dimensions. */
  className?: string;
  /** Optional alt text. Defaults to `${name}'s avatar`. */
  alt?: string;
}

/**
 * Avatar that prefers an uploaded image, falls back to initials, then to a
 * generic icon. Suppresses broken-image flicker by switching to the fallback
 * the moment the <img> emits `onerror`.
 */
export const AvatarBadge = ({ src, name, className, alt }: Props) => {
  const [errored, setErrored] = useState(false);
  const initials = (name ?? "")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const showImage = !!src && !errored;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full gradient-primary text-primary-foreground font-bold",
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt ?? `${name ?? "User"}'s avatar`}
          // The image is positioned absolutely so the gradient/initials below
          // act as a fallback while the image is loading — eliminates the
          // "broken image" flash if the URL is slow or invalid.
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setErrored(true)}
          draggable={false}
        />
      ) : initials ? (
        <span className="select-none">{initials}</span>
      ) : (
        <User className="h-1/2 w-1/2" />
      )}
    </div>
  );
};
