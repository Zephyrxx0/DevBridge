import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingTriggerProps {
  onClick: () => void;
  className?: string;
}

export function OnboardingTrigger({ onClick, className }: OnboardingTriggerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <Button 
        onClick={onClick}
        size="lg"
        className="group relative overflow-hidden rounded-full px-8 py-6 text-base font-medium shadow-lg transition-all hover:scale-105"
        style={{ backgroundColor: "var(--brand)" }}
      >
        <span className="absolute inset-0 animate-glow-pulse bg-white/20 opacity-0 group-hover:opacity-100" />
        <Sparkles className="mr-2 h-5 w-5" />
        Start Onboarding
      </Button>
      <p className="mt-4 text-sm text-[var(--foreground-muted)]">
        Generate a personalized guide to this repository
      </p>
    </div>
  );
}
