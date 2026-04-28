import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[0.5rem] border border-transparent text-[var(--text-sm)] font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 outline-none select-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-glow)] active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand)] text-[var(--primary-foreground)] shadow-[0_0_0_1px_var(--brand-muted)] hover:bg-[var(--brand-hover)] hover:shadow-[0_0_0_1px_var(--brand-muted),0_0_28px_var(--brand-glow)]",
        outline:
          "border-[var(--border)] bg-transparent text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]",
        secondary:
          "bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-3)]",
        ghost: "text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
        destructive:
          "bg-[var(--accent-rose-muted)] text-[var(--accent-rose)] hover:bg-[color-mix(in_oklab,var(--accent-rose-muted)_70%,var(--accent-rose)_30%)]",
        link: "border-transparent bg-transparent p-0 text-[var(--brand)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-8 gap-1.5 rounded-[0.4rem] px-2.5 text-[var(--text-xs)] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-[0.45rem] px-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-[52px] gap-2 px-6 text-[var(--text-body)]",
        icon: "size-11",
        "icon-xs": "size-8 rounded-[0.4rem] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9 rounded-[0.45rem]",
        "icon-lg": "size-[52px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
