import { cn } from "@/lib/utils";

interface EscalationIndicatorProps {
  modelUsed?: string;
  cascaded?: boolean;
}

export function EscalationIndicator({ modelUsed, cascaded }: EscalationIndicatorProps) {
  if (!cascaded) {
    return null;
  }

  const label = "Big Model";

  return (
    <div className="mb-1 flex items-center gap-2 text-xs text-[var(--foreground-subtle)]" data-testid="escalation-indicator">
      <span
        aria-hidden="true"
        data-testid="escalation-indicator-dot"
        className={cn(
          "inline-block h-2 w-2 rounded-full animate-pulse",
          "bg-amber-500"
        )}
      />
      <span className={cn("inline-flex rounded-md border px-2 py-0.5 font-medium", "border-amber-500/20 bg-amber-500/10 text-amber-600")}>{label}</span>
    </div>
  );
}
