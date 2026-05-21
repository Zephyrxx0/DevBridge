import { cn } from "@/lib/utils";

interface StatusMessage {
  id: string;
  message: string;
  timestamp: string;
}

interface StatusStreamProps {
  statusMessages: StatusMessage[];
  className?: string;
}

export function StatusStream({ statusMessages, className }: StatusStreamProps) {
  return (
    <div 
      className={cn("flex w-full flex-col gap-3", className)}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full" style={{ backgroundColor: "var(--brand)", animationDelay: "0ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full" style={{ backgroundColor: "var(--brand)", animationDelay: "150ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full" style={{ backgroundColor: "var(--brand)", animationDelay: "300ms" }} />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">Analyzing Repository...</h3>
      </div>
      
      <div className="relative border-l-2 border-[var(--border)] ml-3 pl-6 space-y-4">
        {statusMessages.map((msg, index) => (
          <div 
            key={msg.id} 
            className="animate-fade-up relative"
            style={{ animationDelay: `${Math.min(index * 100, 500)}ms` }}
          >
            <div className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--brand)" }} />
            <p className="text-sm text-[var(--foreground-muted)]">{msg.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
