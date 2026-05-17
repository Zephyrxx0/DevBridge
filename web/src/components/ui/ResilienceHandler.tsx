"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, WifiOff } from "lucide-react";

type ConnectionState = "online" | "offline" | "degraded";

export function ResilienceHandler() {
  const [state, setState] = useState<ConnectionState>("online");

  useEffect(() => {
    const onOffline = () => setState("offline");
    const onOnline = () => setState("online");
    const onDisconnect = () => setState("degraded");

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener("devbridge:disconnect", onDisconnect as EventListener);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("devbridge:disconnect", onDisconnect as EventListener);
    };
  }, []);

  if (state === "online") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-3 z-[100] mx-auto w-[min(92vw,680px)] rounded-xl border border-[var(--border-strong)] bg-[var(--surface-1)] px-[var(--space-md)] py-[var(--space-sm)] shadow-lg"
    >
      <div className="flex items-center gap-2 text-[var(--text-label)] text-[var(--foreground)]">
        {state === "offline" ? <WifiOff className="size-4 text-[var(--accent-rose)]" /> : <AlertTriangle className="size-4 text-[var(--accent-ember)]" />}
        <span>
          {state === "offline"
            ? "You are offline. Reconnect to continue streaming responses."
            : "Connection interrupted. Trying to reconnect to live updates."}
        </span>
      </div>
    </div>
  );
}
