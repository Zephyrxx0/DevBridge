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
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";

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
    <SidebarProvider defaultCollapsed={false}>
      <div className="flex min-h-screen w-full bg-[var(--background)] text-[var(--foreground)]">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="fixed bottom-4 right-4 z-40 h-10 w-10 rounded-full border-[var(--border)] bg-[var(--surface-1)] md:hidden"
          >
            {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </Button>
          <main className="flex min-h-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
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
