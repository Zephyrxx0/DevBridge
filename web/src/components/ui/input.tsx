import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[0.5rem] border border-[var(--border)] bg-[var(--surface-3)] px-[var(--space-md)] py-[var(--space-sm)] text-[var(--text-body)] leading-[1.65] text-[var(--foreground)] transition-[border-color,box-shadow] outline-none placeholder:text-[var(--foreground-subtle)] focus-visible:border-[var(--brand)] focus-visible:ring-[3px] focus-visible:ring-[var(--brand-glow)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[var(--text-sm)] file:font-medium file:text-[var(--foreground)]",
        className
      )}
      {...props}
    />
  );
}

export { Input };
