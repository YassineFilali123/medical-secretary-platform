import { Loader2, Wifi, WifiOff } from "lucide-react";
import type { RealtimeStatus } from "@/lib/realtime";

/**
 * Live-chat connection indicator.
 *
 * "Connected" is deliberately quiet — a working connection is the expected
 * state and does not need to shout. Trouble is what the user needs to see, so
 * disconnected and reconnecting are the loud ones.
 */
export function ConnectionStatus({
  status,
  className = "",
}: {
  status: RealtimeStatus;
  className?: string;
}) {
  const config = {
    connecting: {
      icon: Loader2,
      label: "Connecting…",
      spin: true,
      classes: "text-muted-foreground",
    },
    connected: {
      icon: Wifi,
      label: "Live",
      spin: false,
      classes: "text-emerald-600 dark:text-emerald-400",
    },
    reconnecting: {
      icon: Loader2,
      label: "Reconnecting…",
      spin: true,
      classes: "text-amber-600 dark:text-amber-400",
    },
    disconnected: {
      icon: WifiOff,
      label: "Offline",
      spin: false,
      classes: "text-rose-600 dark:text-rose-400",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${config.classes} ${className}`}
      title={
        status === "connected"
          ? "Messages arrive instantly"
          : "Messages will still be delivered; this view updates when the connection returns."
      }
    >
      <Icon className={`h-3 w-3 ${config.spin ? "animate-spin" : ""}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
