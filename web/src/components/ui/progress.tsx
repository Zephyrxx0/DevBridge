"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ProgressProps = React.ComponentProps<"div"> & {
  value?: number;
};

function Progress({ className, value = 0, ...props }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      data-slot="progress"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--surface-3)_70%,transparent)]", className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-[var(--brand)] shadow-[0_0_18px_var(--brand-glow)] transition-[width] duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress };

