import { cn } from "@/lib/utils";

interface EscalationIndicatorProps {
  modelUsed?: string;
  cascaded?: boolean;
}

export function EscalationIndicator({ modelUsed, cascaded }: EscalationIndicatorProps) {
  if (!modelUsed && typeof cascaded === "undefined") {
    return null;
  }

  const label = cascaded ? "Big Model" : "Fast Mode";

  return (
    <div className="mb-1 flex items-center gap-2 text-xs text-[var(--foreground-subtle)]" data-testid="escalation-indicator">
      <span
        aria-hidden="true"
        data-testid="escalation-indicator-dot"
        className={cn(
          "inline-block h-2 w-2 rounded-full animate-pulse",
          cascaded ? "bg-amber-500" : "bg-[var(--brand)]"
        )}
      />
      <span className={cn("inline-flex rounded-md border px-2 py-0.5 font-medium", cascaded ? "border-amber-500/20 bg-amber-500/10 text-amber-600" : "border-[var(--brand-muted)] bg-[var(--brand-muted)] text-[var(--brand)]")}>{label}</span>
    </div>
  );
}
