"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowRight, Code2, GitBranch, Sparkles, CheckCircle } from "lucide-react";

interface Repository {
  id: string;
  name: string;
  lastIndexed?: string;
  fileCount?: number;
  annotationCount?: number;
  status?: "indexed" | "indexing" | "pending";
}

export default function Home() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchRepos();
  }, [mounted]);

  const fetchRepos = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/repo/`);
      
      if (response.ok) {
        const data = await response.json();
        setRepos(Array.isArray(data) ? data : []);
      } else if (response.status === 404) {
        setRepos([]);
      } else {
        setRepos([]);
      }
    } catch (err) {
      console.error("Error fetching repos:", err);
      setRepos([]);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  const getStatusBadge = (status?: string) => {
    const baseClass = "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium";
    if (status === "indexed") {
      return <span className={`${baseClass} bg-emerald-500/10 text-emerald-700 dark:text-emerald-400`}><CheckCircle className="w-3 h-3" /> Indexed</span>;
    }
    if (status === "indexing") {
      return <span className={`${baseClass} bg-amber-500/10 text-amber-700 dark:text-amber-400`}><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Indexing</span>;
    }
    return <span className={`${baseClass} bg-slate-500/10 text-slate-700 dark:text-slate-400`}>Pending</span>;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-md">
              <span className="text-lg font-bold text-primary-foreground">DB</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                DevBridge
              </h1>
              <p className="text-xs text-muted-foreground font-medium">Orchestrator</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Online</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16">
        {/* Hero Section with Dithering Pattern */}
        <div className="mb-20 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/5 border border-border/40 shadow-lg p-12">
            {/* Subtle dithering effect background */}
            <div className="absolute inset-0 opacity-30 dark:opacity-20" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='0.5' fill='%23343434'/%3E%3Ccircle cx='3' cy='3' r='0.5' fill='%23343434'/%3E%3C/svg%3E")`,
              backgroundSize: "8px 8px"
            }}></div>
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">AI-Powered Code Intelligence</span>
              </div>

              <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                Grounded AI Answers
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                  From Your Codebase
                </span>
              </h2>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                DevBridge connects your code to intelligent agents that understand context, history, and architecture. Search semantically, get cited sources, and collaborate with your team.
              </p>

              {repos.length > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-8">
                  <CheckCircle className="w-4 h-4" />
                  {repos.length} {repos.length === 1 ? "repository" : "repositories"} ready
                </div>
              )}

              <Link href={repos.length > 0 ? `/repo/${repos[0].id}` : "#repos"}>
                <Button size="lg" className="gap-2 text-base h-12 px-8">
                  {repos.length > 0 ? "Open Dashboard" : "Get Started"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Repositories Section */}
        <div id="repos" className="mb-20 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-100">
          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              Select a Repository
            </h3>
            <p className="text-muted-foreground">
              {loading 
                ? "Loading repositories..." 
                : repos.length === 0 
                  ? "Connect your first repository to get started"
                  : `${repos.length} ${repos.length === 1 ? "repository" : "repositories"} available`
              }
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : repos.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Code2 className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h4 className="text-lg font-semibold mb-2">No repositories connected</h4>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Connect a GitHub repository to enable code search, analysis, and collaboration.
                </p>
                <Button className="mt-6" variant="outline">
                  Connect Repository
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {repos.map((repo) => (
                <Link key={repo.id} href={`/repo/${repo.id}`}>
                  <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl group-hover:text-primary transition-colors">{repo.name}</CardTitle>
                          {repo.lastIndexed && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Last indexed: {new Date(repo.lastIndexed).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(repo.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Files</p>
                            <p className="text-lg font-semibold">{repo.fileCount || 0}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Annotations</p>
                            <p className="text-lg font-semibold">{repo.annotationCount || 0}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Section */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 delay-200">
          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              Recent Activity
            </h3>
            <p className="text-muted-foreground">
              Latest Q&A, indexing jobs, and PR analyses
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  No recent activity yet. Start exploring your codebase to see activity here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/50 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>DevBridge Orchestrator v0.1</p>
          <p>© 2026 Code Intelligence Platform</p>
        </div>
      </footer>
    </div>
  );
}
