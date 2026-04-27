import Link from "next/link";
import { Grid2x2PlusIcon } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-[var(--sidebar)]">
      <div className="mx-auto w-full max-w-[1200px] px-[1.25rem] md:px-[2.5rem]">
        {/* Row 1 */}
        <div className="flex flex-col justify-between gap-6 py-10 md:flex-row md:items-start">
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div
                className="grid size-8 place-items-center rounded-lg text-white"
                style={{ background: "var(--brand)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
                </svg>
              </div>
              <span className="font-heading text-base font-semibold tracking-[-0.01em] text-foreground">
                DevBridge
              </span>
            </Link>
            <p className="max-w-[320px] text-sm leading-[1.6] text-muted-foreground">
              Turn repositories into living knowledge hubs. Grounded answers, repo maps, and annotations for onboarding teams.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">
                Workspace
              </p>
              <nav className="flex flex-col gap-2">
                <Link href="/repo/demo" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Workspace
                </Link>
                <Link href="/repo/demo/map" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Repo map
                </Link>
                <Link href="/repo/demo/search" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Search
                </Link>
                <Link href="/repo/demo/annotations" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Annotations
                </Link>
                <Link href="/repo/demo/pr" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  PR review
                </Link>
              </nav>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">
                Resources
              </p>
              <nav className="flex flex-col gap-2">
                <Link href="/docs" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Quickstart
                </Link>
                <Link href="/repo/demo/files" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  File viewer
                </Link>
                <Link href="/repo/demo/settings" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Repo settings
                </Link>
              </nav>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">
                Connect
              </p>
              <nav className="flex flex-col gap-2">
                <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  GitHub
                </a>
                <a href="https://cloud.google.com" target="_blank" rel="noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Google Cloud
                </a>
                <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Supabase
                </a>
              </nav>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex flex-col justify-between gap-3 border-t border-border py-6 text-xs text-[var(--foreground-subtle)] sm:flex-row">
          <p>&copy; {new Date().getFullYear()} DevBridge. Built for onboarding.</p>
          <p>Built for Google Solutions Hackathon</p>
        </div>
      </div>
    </footer>
  );
}
