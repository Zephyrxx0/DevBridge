"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium leading-none tracking-[-0.01em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-[var(--brand-muted)] bg-[color-mix(in_oklab,var(--brand)_10%,transparent)] text-foreground",
        neutral: "border-border bg-[color-mix(in_oklab,var(--surface-2)_70%,transparent)] text-muted-foreground",
        success: "border-[var(--accent-emerald)]/25 bg-[var(--accent-emerald-muted)] text-foreground",
        warn: "border-[var(--accent-amber)]/25 bg-[var(--accent-amber-muted)] text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

