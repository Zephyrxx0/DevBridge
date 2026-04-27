"use client"

import * as React from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";

import { cn } from "@/lib/utils";

function Avatar({
  className,
  size = "default",
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: "default" | "sm" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-9 shrink-0 rounded-full border border-border bg-(--surface-2) text-foreground select-none data-[size=lg]:size-11 data-[size=sm]:size-7",
        className
      )}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-(--surface-2) text-(length:--text-sm) font-medium text-(--foreground-muted) group-data-[size=sm]/avatar:text-(length:--text-xs)",
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback };
