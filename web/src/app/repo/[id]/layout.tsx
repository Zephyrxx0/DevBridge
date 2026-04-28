"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BookOpen,
  FolderCode,
  GitPullRequest,
  Landmark,
  MessageCircle,
  Moon,
  Network,
  Search,
  Settings2,
  StickyNote,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RepoProvider, useRepo } from "@/contexts/repo-context";

const NAV_ITEMS = [
  { label: "Chat", hrefSuffix: "", icon: MessageCircle },
  { label: "Files", hrefSuffix: "/files", icon: FolderCode },
  { label: "Map", hrefSuffix: "/map", icon: Network },
  { label: "Search", hrefSuffix: "/search", icon: Search },
  { label: "PRs", hrefSuffix: "/pr", icon: GitPullRequest },
  { label: "Annotations", hrefSuffix: "/annotations", icon: StickyNote },
  { label: "Notes", hrefSuffix: "/notes", icon: BookOpen },
  { label: "Settings", hrefSuffix: "/settings", icon: Settings2 },
];

function RepoLayoutContent({ children, isRootWorkspace, basePath }: { children: React.ReactNode, isRootWorkspace: boolean, basePath: string }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { repo, loading } = useRepo();

  useEffect(() => {
    const repoId = basePath.split("/").at(-1);
    if (!repoId) return;
    const key = "devbridge.recentRepos";
    const existing = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
    const next = [repoId, ...existing.filter((id) => id !== repoId)].slice(0, 12);
    localStorage.setItem(key, JSON.stringify(next));
    localStorage.setItem("devbridge.lastRepoId", repoId);

    const metaKey = "devbridge.recentRepoMeta";
    const meta = JSON.parse(localStorage.getItem(metaKey) ?? "{}") as Record<string, { name: string; url: string }>;
    meta[repoId] = {
      name: repo?.name ?? repoId,
      url: repo?.url ?? "",
    };
    localStorage.setItem(metaKey, JSON.stringify(meta));
  }, [basePath, repo]);

  if (!isRootWorkspace) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="hidden w-[224px] shrink-0 border-r border-[var(--border)] bg-[var(--sidebar)] md:flex md:flex-col">
        <div className="relative border-b border-[var(--border)] px-4 py-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[0.5rem] bg-[var(--brand-muted)] text-[var(--brand)]">
              <Landmark className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[var(--text-sm)] font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                {loading ? "Loading..." : repo?.name || "Repository"}
              </p>
            </div>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="absolute right-4 top-6 h-9 w-9 border border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
          >
            <Sun className="hidden size-4 dark:block" />
            <Moon className="block size-4 dark:hidden" />
          </Button>
        </div>

        <nav className="flex-1 px-2 py-4">
          {NAV_ITEMS.map((item) => {
            const href = `${basePath}${item.hrefSuffix}`;
            const isActive = pathname === href;
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={href}
                className={cn(
                  "mb-1 flex h-12 items-center gap-3 rounded-r-md px-[14px] text-[var(--text-sm)] font-medium text-[var(--foreground-muted)] transition-colors",
                  isActive
                    ? "border-l-[3px] border-[var(--brand)] bg-[var(--brand-muted)] text-[var(--brand)]"
                    : "border-l-[3px] border-transparent hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-[var(--border)] px-4 py-4">
          <p className="text-[var(--text-xs)] text-[var(--foreground-subtle)]">
            Last indexed: {repo?.lastIndexed ? new Date(repo.lastIndexed).toLocaleDateString() : "never"}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export default function RepoLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const repoId = String(params.id ?? "");
  const basePath = `/repo/${repoId}`;
  const isRootWorkspace = pathname === basePath;

  return (
    <RepoProvider repoId={repoId}>
      <RepoLayoutContent isRootWorkspace={isRootWorkspace} basePath={basePath}>
        {children}
      </RepoLayoutContent>
    </RepoProvider>
  );
}
