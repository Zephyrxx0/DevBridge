"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeroDitheringCardProps = {
  className?: string;
};

export function HeroDitheringCard({ className }: HeroDitheringCardProps) {
  return (
    <section
      className={cn(
        "relative flex min-h-dvh w-full items-center justify-center px-6 md:px-12",
        className
      )}
    >
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[color-mix(in_oklab,var(--surface-1)_40%,transparent)] px-4 py-1.5 text-sm font-medium backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand)]" />
          </span>
          <span className="text-foreground">Built for onboarding teams</span>
        </div>

        <h1 className="mb-8 font-heading text-5xl font-medium tracking-tight text-foreground md:text-7xl lg:text-8xl">
          Learn any codebase
          <br />
          <span className="text-foreground/80">with grounded answers.</span>
        </h1>

        <p className="mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          DevBridge helps new engineers understand a codebase quickly using
          grounded answers, repo maps, and captured team context.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/repo/demo">
            <Button
              size="lg"
              className="group relative h-14 rounded-full px-10 text-base font-medium transition-all duration-300 hover:scale-105 active:scale-95 hover:ring-4 hover:ring-[var(--brand-glow)]"
            >
              Open workspace
              <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link href="/repo/demo/map">
            <Button
              variant="outline"
              size="lg"
              className="h-14 rounded-full border-white/15 bg-[color-mix(in_oklab,var(--surface-1)_30%,transparent)] px-10 text-base font-medium backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95"
            >
              View repo map
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// Back-compat export name
export function CTASection() {
  return <HeroDitheringCard />;
}
