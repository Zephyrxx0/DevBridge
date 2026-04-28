import { cn } from "@/lib/utils";

type LoadingDotsProps = {
  className?: string;
  size?: "sm" | "default";
};

export function LoadingDots({ className, size = "default" }: LoadingDotsProps) {
  const dotSize = size === "sm" ? "h-1 w-1" : "h-1.5 w-1.5";

  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label="Loading">
      <span
        className={cn(dotSize, "rounded-full bg-[var(--brand)] animate-bounce-dot")}
        style={{ animationDelay: "0ms" }}
      />
      <span
        className={cn(dotSize, "rounded-full bg-[var(--brand)] animate-bounce-dot")}
        style={{ animationDelay: "150ms" }}
      />
      <span
        className={cn(dotSize, "rounded-full bg-[var(--brand)] animate-bounce-dot")}
        style={{ animationDelay: "300ms" }}
      />
    </span>
  );
}
