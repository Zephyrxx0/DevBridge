"use client";

import Link from "next/link";
import Image from "next/image";
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

type ViewMode = "grid" | "list";

function getRepoMeta(repo: Repo) {
  const fallbackOwner = "unknown";
  const fallbackRepo = repo.name;
  const cleanUrl = repo.github_url?.trim() ?? "";
  const path = cleanUrl.replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "");
  const [ownerFromUrl, repoFromUrl] = path.split("/");

  if (ownerFromUrl && repoFromUrl) {
    return {
      owner: ownerFromUrl,
      repoName: repoFromUrl,
      ownerUrl: `https://github.com/${ownerFromUrl}`,
    };
  }

  const [ownerFromName, repoFromName] = repo.name.split("/");
  if (ownerFromName && repoFromName) {
    return {
      owner: ownerFromName,
      repoName: repoFromName,
      ownerUrl: `https://github.com/${ownerFromName}`,
    };
  }

  return {
    owner: fallbackOwner,
    repoName: fallbackRepo,
    ownerUrl: "https://github.com",
  };
}

export default function DashboardPage() {
  const supabase = createClient();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

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
  const title = useMemo(() => (viewMode === "list" ? "List view" : "Grid view"), [viewMode]);

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
                onClick={() => setViewMode("grid")}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${viewMode === "grid" ? "bg-white/10 text-white" : "text-[var(--foreground-muted)]"}`}
              >
                <LayoutGrid className="size-4" /> Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${viewMode === "list" ? "bg-white/10 text-white" : "text-[var(--foreground-muted)]"}`}
              >
                <List className="size-4" /> List
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

        {!loading && repos.length > 0 && viewMode === "grid" ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {repos.map((repo) => {
              const meta = getRepoMeta(repo);
              return (
                <Card key={repo.id} className="group overflow-hidden p-0 bg-[color-mix(in_oklab,var(--surface-1)_55%,transparent)] backdrop-blur-xl">
                  <CardHeader className="p-0">
                    <div className="relative h-80 w-full overflow-hidden bg-black/35">
                      <Image
                        src={`https://github.com/${meta.owner}.png?size=180`}
                        alt={`${meta.owner} avatar`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="block h-full w-full object-cover object-center"
                        loading="lazy"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5 px-5 pb-5 pt-1.5">
                    <CardTitle className="text-2xl leading-tight break-words">
                      <span className="block text-base font-medium text-[var(--foreground-subtle)]">{meta.owner}/</span>
                      <span className="block font-semibold">{meta.repoName}</span>
                    </CardTitle>
                    <div className="space-y-1.5 text-sm text-[var(--foreground-muted)]">
                      <p className="line-clamp-1">{repo.github_url}</p>
                      <p className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" /> Last opened {new Date(repo.created_at).toLocaleDateString()}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-white/10 p-0">
                    <Link href={`/repo/${repo.id}`} className="w-full">
                      <Button className="h-14 w-full justify-between rounded-none" variant="ghost">
                        Open Chat
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : null}

        {!loading && repos.length > 0 && viewMode === "list" ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--surface-1)_55%,transparent)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-black/25 text-[var(--foreground-subtle)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Sr. No</th>
                    <th className="px-4 py-3 font-medium">Repo_Name</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Last Opened</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {repos.map((repo, idx) => {
                    const meta = getRepoMeta(repo);
                    return (
                      <tr key={repo.id} className="border-t border-white/10 text-[var(--foreground-muted)]">
                        <td className="px-4 py-3">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <Link href={`/repo/${repo.id}`} className="font-medium text-[var(--foreground)] hover:text-[var(--brand)]">
                            {meta.repoName}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <a href={meta.ownerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-[var(--foreground)]">
                            <Image
                              src={`https://github.com/${meta.owner}.png?size=40`}
                              alt={`${meta.owner} avatar`}
                              width={20}
                              height={20}
                              className="size-5 rounded-full border border-white/20"
                              loading="lazy"
                            />
                            <span>{meta.owner}</span>
                          </a>
                        </td>
                        <td className="px-4 py-3">{new Date(repo.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">-</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
