"use client";

import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

export default function MemoryDashboardPage() {
  const [loading] = useState(true);

  return (
    <div className="pb-12">
      <section className="rounded-3xl border border-white/10 bg-[color-mix(in_oklab,var(--surface-1)_45%,transparent)] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.25)] backdrop-blur-2xl md:p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">Memory Dashboard</p>
          <h1 className="font-heading text-5xl font-semibold">Memory Curation</h1>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} data-testid="memory-skeleton" className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <Skeleton className="mb-4 h-5 w-24" />
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="mb-2 h-4 w-[90%]" />
                <Skeleton className="h-4 w-[70%]" />
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
