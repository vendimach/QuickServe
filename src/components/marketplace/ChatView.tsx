import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Phone } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useMarketplaceData } from "@/contexts/MarketplaceDataContext";
import { cn } from "@/lib/utils";

interface Props {
  bookingId: string;
}

export const ChatView = ({ bookingId }: Props) => {
  const { bookings, navigate, role } = useApp();
  const { chats, sendMessage } = useMarketplaceData();
  const booking = bookings.find((b) => b.id === bookingId);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = chats[bookingId] ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (!booking) return null;

  const send = () => {
    if (!text.trim()) return;
    sendMessage(bookingId, role === "partner" ? "partner" : "customer", text.trim());
    setText("");
  };

  const peerName =
    role === "partner" ? "Customer" : booking.professional?.name ?? "Partner";
  const peerAvatar = booking.professional?.avatar ?? "C";

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col px-5 pb-6">
      <div className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-card">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ name: "live-status", bookingId })}
            className="rounded-full bg-secondary p-1.5"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
            {peerAvatar}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{peerName}</p>
            <p className="text-[11px] text-muted-foreground">{booking.service.name}</p>
          </div>
        </div>
        <button
          aria-label="Call"
          className="rounded-full bg-success/15 p-2 text-success"
        >
          <Phone className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="mt-3 flex-1 overflow-y-auto rounded-2xl bg-secondary/40 p-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
            Send a message to start chatting
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => {
              const isMine =
                (role === "partner" && m.from === "partner") ||
                (role === "customer" && m.from === "customer");
              return (
                <div
                  key={m.id}
                  className={cn("flex", isMine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-soft",
                      isMine
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-card text-foreground",
                    )}
                  >
                    {m.text}
                    <div
                      className={cn(
                        "mt-0.5 text-[9px]",
                        isMine ? "text-primary-foreground/70" : "text-muted-foreground",
                      )}
                    >
                      {m.createdAt.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-card p-2 shadow-card">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message…"
          className="flex-1 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          onClick={send}
          disabled={!text.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-soft disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};