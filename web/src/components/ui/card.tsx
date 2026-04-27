import * as React from "react";

import { cn } from "@/lib/utils";

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex min-w-0 flex-col gap-(--space-md) overflow-hidden rounded-xl border border-border bg-[color-mix(in_oklab,var(--surface-1)_85%,transparent)] backdrop-blur-md text-foreground transition-[border-color,box-shadow,transform] duration-150 hover:border-(--border-strong) hover:shadow-[0_0_0_1px_var(--border-strong)] hover:-translate-y-px data-[size=sm]:gap-(--space-sm)",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-(--space-lg) pt-(--space-lg) group-data-[size=sm]/card:px-(--space-md) group-data-[size=sm]/card:pt-(--space-md) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--space-md)",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-(--text-h3) leading-[1.1] font-semibold tracking-[-0.02em] group-data-[size=sm]/card:text-(--text-sm)",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-(length:--text-body) leading-[1.65] text-(--foreground-muted)", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "px-(--space-lg) pb-(--space-lg) group-data-[size=sm]/card:px-(--space-md) group-data-[size=sm]/card:pb-(--space-md)",
        className
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t border-border bg-(--surface-2) px-(--space-lg) py-(--space-md) group-data-[size=sm]/card:px-(--space-md) group-data-[size=sm]/card:py-(--space-sm)",
        className
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
