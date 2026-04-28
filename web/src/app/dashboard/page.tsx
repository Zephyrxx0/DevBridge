"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, GitBranch, LayoutGrid, List } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { AddRepoModal } from "@/components/add-repo-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type Repo = {
  id: string;
  name: string;
  github_url: string;
  created_at: string;
};

type ViewMode = "detailed" | "compact";

export default function DashboardPage() {
  const supabase = createClient();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("detailed");

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        window.location.assign("/signin");
        return;
      }

      const { data } = await supabase
        .from("repositories")
        .select("id,name,github_url,created_at")
        .order("created_at", { ascending: false });

      const raw = (data ?? []) as Repo[];
      const recent = JSON.parse(localStorage.getItem("devbridge.recentRepos") ?? "[]") as string[];
      const byRecent = new Map(recent.map((id, idx) => [id, idx]));
      raw.sort((a, b) => (byRecent.get(a.id) ?? 9999) - (byRecent.get(b.id) ?? 9999));
      setRepos(raw);
      setLoading(false);
    }

    load();
  }, [supabase]);

  const empty = !loading && repos.length === 0;
  const title = useMemo(() => (viewMode === "compact" ? "Compact view" : "Detailed view"), [viewMode]);

  return (
    <div className="pb-12">
      <section className="rounded-3xl border border-white/10 bg-[color-mix(in_oklab,var(--surface-1)_45%,transparent)] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.25)] backdrop-blur-2xl md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">Workspace hub</p>
            <h1 className="font-heading text-5xl font-semibold">Choose a project</h1>
            <p className="mt-2 text-[var(--foreground-muted)]">Flow: workspace to project to chat. Recent projects appear first.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-white/10 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => setViewMode("detailed")}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${viewMode === "detailed" ? "bg-white/10 text-white" : "text-[var(--foreground-muted)]"}`}
              >
                <LayoutGrid className="size-4" /> Detailed
              </button>
              <button
                type="button"
                onClick={() => setViewMode("compact")}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${viewMode === "compact" ? "bg-white/10 text-white" : "text-[var(--foreground-muted)]"}`}
              >
                <List className="size-4" /> Compact
              </button>
            </div>
            <AddRepoModal />
          </div>
        </div>

        <p className="mt-4 text-sm text-[var(--foreground-subtle)]">{title}</p>

        {loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/5" />)}
          </div>
        ) : null}

        {empty ? (
          <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-black/20 p-10 text-center">
            <GitBranch className="mx-auto mb-4 size-8 text-[var(--foreground-subtle)]" />
            <h2 className="font-heading text-2xl">No workspaces connected</h2>
            <p className="mt-2 text-[var(--foreground-muted)]">Connect a GitHub repository to start chat, notes, and graph workflows.</p>
          </div>
        ) : null}

        {!loading && repos.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {repos.map((repo) => (
              <Card key={repo.id} className="group border-white/10 bg-[color-mix(in_oklab,var(--surface-1)_55%,transparent)] backdrop-blur-xl hover:border-[var(--brand)]/40">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className={`${viewMode === "compact" ? "text-xl" : "text-2xl"} truncate`}>{repo.name}</CardTitle>
                    <GitBranch className="size-4 text-[var(--foreground-subtle)]" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-[var(--foreground-muted)]">
                  <p className="line-clamp-1">{repo.github_url}</p>
                  {viewMode === "detailed" ? (
                    <p className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" /> Added {new Date(repo.created_at).toLocaleDateString()}</p>
                  ) : null}
                </CardContent>
                <CardFooter>
                  <Link href={`/repo/${repo.id}`} className="w-full">
                    <Button className="w-full justify-between" variant="ghost">
                      Open Chat
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
