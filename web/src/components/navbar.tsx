"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavbarProps = {
  className?: string;
  showConnectButton?: boolean;
};

export function Navbar({ className, showConnectButton = true }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme !== "light";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-16 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_85%,transparent)] backdrop-blur-[12px] saturate-[180%]",
        className
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-between px-[1.25rem] md:px-[2.5rem]">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-[0.5rem] text-sm font-bold text-white"
            style={{ background: "var(--gradient-brand)", fontFamily: "var(--font-heading)" }}
          >
            DB
          </div>
          <span
            className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            DevBridge
          </span>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="#features" className="text-[var(--text-sm)] text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]">
            Features
          </Link>
          <Link href="#how-it-works" className="text-[var(--text-sm)] text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]">
            How it works
          </Link>
          <Link href="#" className="text-[var(--text-sm)] text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]">
            Docs
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="h-9 w-9 border border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          {showConnectButton ? (
            <Button className="hidden h-9 rounded-lg px-4 text-[var(--text-sm)] font-semibold md:inline-flex">
              Connect Repo
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}