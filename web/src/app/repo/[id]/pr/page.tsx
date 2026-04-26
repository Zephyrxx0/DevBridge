"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronLeft, GitMerge, Clock, Zap, Search, ChevronDown, RotateCw } from "lucide-react";

interface PR {
  number: number;
  title: string;
  author: string;
  status: "open" | "merged" | "closed";
  createdAt: string;
  updatedAt: string;
  summary?: string;
  findings?: Array<{ severity: "critical" | "warning" | "info"; message: string }>;
  lastAnalyzedAt?: string;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
}

export default function PRPage() {
  const params = useParams();
  const repoId = params.id as string;

  const [prs, setPRs] = useState<PR[]>([]);
  const [expandedPR, setExpandedPR] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "merged" | "analyzed" | "pending">("open");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "most-analyzed">("recent");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchPRs();
  }, [mounted, repoId]);

  const fetchPRs = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/repo/${repoId}/pr`);
      if (response.ok) {
        setPRs(await response.json());
      }
    } catch (err) {
      console.error("Error fetching PRs:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "open") return "bg-green-500/10 text-green-700 dark:text-green-400";
    if (status === "merged") return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
    return "bg-slate-500/10 text-slate-700 dark:text-slate-400";
  };

  const getSeverityColor = (severity: string) => {
    if (severity === "critical") return "bg-red-500/10 text-red-700 dark:text-red-400";
    if (severity === "warning") return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
  };

  const filteredPRs = prs
    .filter((pr) => {
      if (filterStatus !== "all" && pr.status !== filterStatus) return false;
      if (searchText && !pr.title.toLowerCase().includes(searchText.toLowerCase()) &&
          !pr.author.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "recent") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return (b.lastAnalyzedAt ? 1 : 0) - (a.lastAnalyzedAt ? 1 : 0);
    });

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/50 sticky top-0 z-40 px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <Link href={`/repo/${repoId}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Pull Requests</h1>
        </div>

        {/* Filters and Search */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or author..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: "all", label: "All" },
              { id: "open", label: "Open" },
              { id: "merged", label: "Merged" },
              { id: "analyzed", label: "Analyzed" },
              { id: "pending", label: "Pending Analysis" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFilterStatus(id as typeof filterStatus)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                  filterStatus === id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-8 px-2 text-xs bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring/50"
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
              <option value="most-analyzed">Most Analyzed</option>
            </select>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredPRs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <GitMerge className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No PRs match your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPRs.map((pr) => (
              <Card key={pr.number} className="overflow-hidden">
                <CardHeader
                  className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() =>
                    setExpandedPR(expandedPR === pr.number ? null : pr.number)
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 text-xs font-medium bg-muted rounded">
                          #{pr.number}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(
                            pr.status
                          )}`}
                        >
                          {pr.status}
                        </span>
                        {pr.lastAnalyzedAt && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                            Analyzed
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold mb-2">{pr.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        by {pr.author} • {new Date(pr.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        expandedPR === pr.number ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </CardHeader>

                {/* Expanded Content */}
                {expandedPR === pr.number && (
                  <CardContent className="pt-4 border-t border-border/40 space-y-4">
                    {/* Summary */}
                    {pr.summary && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">SUMMARY</p>
                        <p className="text-sm text-muted-foreground">{pr.summary}</p>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">FILES CHANGED</p>
                        <p className="text-lg font-bold">{pr.filesChanged || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">ADDITIONS</p>
                        <p className="text-lg font-bold text-green-600">
                          +{pr.additions || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">DELETIONS</p>
                        <p className="text-lg font-bold text-red-600">
                          -{pr.deletions || 0}
                        </p>
                      </div>
                    </div>

                    {/* Findings */}
                    {pr.findings && pr.findings.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          AI FINDINGS ({pr.findings.length})
                        </p>
                        <div className="space-y-2">
                          {pr.findings.map((finding, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border ${getSeverityColor(
                                finding.severity
                              )}`}
                            >
                              <p className="text-xs font-medium mb-1 capitalize">{finding.severity}</p>
                              <p className="text-xs">{finding.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="gap-2 flex-1">
                        <RotateCw className="w-4 h-4" />
                        Re-analyze
                      </Button>
                      <Button size="sm" className="gap-2 flex-1">
                        <ExternalLink className="w-4 h-4" />
                        View on GitHub
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ExternalLink(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
