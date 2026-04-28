"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BookOpen,
  GitPullRequest,
  Landmark,
  Loader2,
  MessageCircle,
  Moon,
  Network,
  Search,
  Settings2,
  StickyNote,
  Sun,
  Database,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RepoProvider, useRepo } from "@/contexts/repo-context";

const NAV_ITEMS = [
  { label: "Chat", hrefSuffix: "", icon: MessageCircle },
  { label: "Map", hrefSuffix: "/map", icon: Network },
  { label: "Search", hrefSuffix: "/search", icon: Search },
  { label: "PRs", hrefSuffix: "/pr", icon: GitPullRequest },
  { label: "Annotations", hrefSuffix: "/annotations", icon: StickyNote },
  { label: "Notes", hrefSuffix: "/notes", icon: BookOpen },
  { label: "Settings", hrefSuffix: "/settings", icon: Settings2 },
];

type IngestionJob = {
  id: string;
  status: string;
  file_path: string | null;
  chunk_count: number;
  error_message: string | null;
  updated_at: string;
};

function RepoLayoutContent({ children, isRootWorkspace, basePath }: { children: React.ReactNode, isRootWorkspace: boolean, basePath: string }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { repo, loading, refreshRepo } = useRepo();

  const [indexingState, setIndexingState] = useState<"idle" | "running" | "success" | "error">("idle");
  const [indexingProgress, setIndexingProgress] = useState("");
  const [indexingError, setIndexingError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apiUrl = "/api/backend";

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

  // Check for active indexing jobs on mount
  useEffect(() => {
    const repoId = basePath.split("/").at(-1) ?? "";
    if (!repoId) return;

    async function checkActiveJobs() {
      try {
        const res = await fetch(`${apiUrl}/repo/${repoId}/ingestion/jobs?limit=1`);
        if (!res.ok) return;
        const jobs = (await res.json()) as IngestionJob[];
        if (jobs.length > 0 && (jobs[0].status === "pending" || jobs[0].status === "processing")) {
          setIndexingState("running");
          setIndexingProgress(jobs[0].file_path || "Starting...");
          startPolling(repoId as string);
        }
      } catch {
        // silent
      }
    }
    checkActiveJobs();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (dismissRef.current) clearTimeout(dismissRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath]);

  const startPolling = useCallback((repoId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/repo/${repoId}/ingestion/jobs?limit=1`);
        if (!res.ok) return;
        const jobs = (await res.json()) as IngestionJob[];
        if (jobs.length === 0) return;

        const job = jobs[0];
        if (job.status === "processing" || job.status === "pending") {
          setIndexingProgress(job.file_path || "Processing...");
        } else if (job.status === "success") {
          setIndexingState("success");
          setIndexingProgress(`Done — ${job.chunk_count} files indexed`);
          if (pollRef.current) clearInterval(pollRef.current);
          dismissRef.current = setTimeout(() => setIndexingState("idle"), 5000);
          
          refreshRepo();
        } else if (job.status === "error") {
          setIndexingState("error");
          setIndexingError(job.error_message || "Indexing failed");
          setIndexingProgress("");
          if (pollRef.current) clearInterval(pollRef.current);
          dismissRef.current = setTimeout(() => setIndexingState("idle"), 8000);
        }
      } catch {
        // silent
      }
    }, 2500);
  }, [apiUrl]);

  const triggerIndex = useCallback(async () => {
    const repoId = basePath.split("/").at(-1);
    if (!repoId) return;

    setIndexingState("running");
    setIndexingProgress("Starting...");
    setIndexingError("");

    try {
      const res = await fetch(`${apiUrl}/repo/${repoId}/trigger-index`, { method: "POST" });
      if (!res.ok) {
        const detail = await res.text();
        setIndexingState("error");
        setIndexingError(detail || "Failed to start indexing");
        dismissRef.current = setTimeout(() => setIndexingState("idle"), 8000);
        return;
      }
      startPolling(repoId);
    } catch {
      setIndexingState("error");
      setIndexingError("Network error triggering indexing");
      dismissRef.current = setTimeout(() => setIndexingState("idle"), 8000);
    }
  }, [apiUrl, basePath, startPolling]);

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

          {indexingState === "running" ? (
            <div className="rounded-lg border border-[var(--brand-muted)] bg-[var(--brand-muted)] p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-[var(--brand)]" />
                <p className="text-xs font-medium text-[var(--brand)]">Indexing...</p>
              </div>
              <p className="mt-1 text-[10px] text-[var(--brand)] opacity-80">{indexingProgress}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div className="h-full animate-pulse rounded-full bg-[var(--brand)]" style={{ width: "60%" }} />
              </div>
            </div>
          ) : indexingState === "success" ? (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-500" />
                <p className="text-xs font-medium text-green-500">Indexed!</p>
              </div>
              <p className="mt-1 text-[10px] text-green-500/80">{indexingProgress}</p>
            </div>
          ) : indexingState === "error" ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-red-400" />
                <p className="text-xs font-medium text-red-400">Failed</p>
              </div>
              <p className="mt-1 text-[10px] text-red-400/80">{indexingError}</p>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={triggerIndex}
            >
              <Database className="size-4 mr-2" />
              Index Repository
            </Button>
          )}
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
