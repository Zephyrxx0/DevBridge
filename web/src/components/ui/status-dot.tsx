import { cn } from "@/lib/utils";

type StatusDotProps = {
  status: "online" | "indexing" | "error" | "pending";
  className?: string;
  showLabel?: boolean;
};

const statusConfig = {
  online: {
    color: "bg-[var(--accent-emerald)]",
    ring: "shadow-[0_0_0_3px_var(--accent-emerald-muted)]",
    animation: "animate-pulse-dot",
    label: "Online",
  },
  indexing: {
    color: "bg-[var(--accent-amber)]",
    ring: "shadow-[0_0_0_3px_var(--accent-amber-muted)]",
    animation: "animate-pulse-dot",
    label: "Indexing",
  },
  error: {
    color: "bg-[var(--accent-rose)]",
    ring: "shadow-[0_0_0_3px_var(--accent-rose-muted)]",
    animation: "",
    label: "Error",
  },
  pending: {
    color: "bg-[var(--foreground-subtle)]",
    ring: "",
    animation: "",
    label: "Pending",
  },
};

export function StatusDot({ status, className, showLabel = false }: StatusDotProps) {
  const config = statusConfig[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full",
          config.color,
          config.ring,
          config.animation
        )}
      />
      {showLabel && (
        <span className="text-[var(--text-xs)] font-medium">{config.label}</span>
      )}
    </span>
  );
}
