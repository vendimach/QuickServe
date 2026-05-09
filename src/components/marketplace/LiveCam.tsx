import { ArrowLeft, Video, VideoOff, Mic, MicOff, Maximize2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";

interface Props {
  bookingId: string;
}

export const LiveCam = ({ bookingId }: Props) => {
  const { bookings, goBack } = useApp();
  const booking = bookings.find((b) => b.id === bookingId);
  const [muted, setMuted] = useState(true);
  const [camOn, setCamOn] = useState(true);

  if (!booking) return null;

  return (
    <div className="px-5 pb-6">
      <button
        onClick={goBack}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="overflow-hidden rounded-3xl bg-foreground shadow-card">
        <div className="relative aspect-video w-full bg-gradient-to-br from-foreground via-muted to-foreground">
          {camOn ? (
            <>
              {/* simulated noise */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,hsl(var(--primary)/0.25),transparent_60%),radial-gradient(circle_at_70%_70%,hsl(var(--accent)/0.18),transparent_60%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,255,255,0.04)_50%)] bg-[length:100%_3px] mix-blend-overlay" />
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-destructive/90 px-2 py-1 text-[10px] font-bold uppercase text-destructive-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
              </div>
              <div className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                Living Room • Cam 1
              </div>
              <div className="absolute right-3 bottom-3 rounded-full bg-black/50 px-2 py-1 text-[10px] font-mono text-white backdrop-blur-sm">
                {new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Camera off
            </div>
          )}
        </div>
        <div className="flex items-center justify-around bg-card p-3">
          <button
            onClick={() => setCamOn((v) => !v)}
            aria-label="Toggle camera"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5 text-destructive" />}
          </button>
          <button
            onClick={() => setMuted((v) => !v)}
            aria-label="Toggle audio"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            {muted ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
          </button>
          <button
            aria-label="Fullscreen"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-card p-4 shadow-soft">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-success" />
          <div className="text-xs text-muted-foreground">
            QuickServe partners carry a body cam during in-home services. Footage is end-to-end encrypted, only viewable
            by you for the duration of the service, and auto-deleted after 24 hours.
          </div>
        </div>
      </div>
    </div>
  );
};