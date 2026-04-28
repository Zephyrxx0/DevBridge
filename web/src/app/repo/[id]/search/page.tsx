"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Search, Code2, GitBranch, GitMerge, Clock } from "lucide-react";

interface CodeSnippet {
  id: string;
  filePath: string;
  functionName?: string;
  startLine: number;
  endLine: number;
  code: string;
  similarity: number;
}

interface Symbol {
  name: string;
  type: "function" | "class" | "interface" | "type";
  filePath: string;
  line: number;
  usageCount: number;
}

interface PRResult {
  number: number;
  title: string;
  author: string;
  status: "open" | "merged" | "closed";
  createdAt: string;
  summary: string;
}

export default function SearchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const repoId = params.id as string;
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<"semantic" | "symbol" | "history">("semantic");
  const [semanticResults, setSemanticResults] = useState<CodeSnippet[]>([]);
  const [symbolResults, setSymbolResults] = useState<Symbol[]>([]);
  const [prResults, setPRResults] = useState<PRResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const performSearch = useCallback(async (searchQuery: string, tab: typeof activeTab = activeTab) => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api/backend";

      // Simulate search by tab
      if (tab === "semantic") {
        const response = await fetch(
          `${apiUrl}/repo/${repoId}/search?query=${encodeURIComponent(searchQuery)}&type=semantic`
        );
        if (response.ok) {
          setSemanticResults(await response.json());
        }
      } else if (tab === "symbol") {
        const response = await fetch(
          `${apiUrl}/repo/${repoId}/search?query=${encodeURIComponent(searchQuery)}&type=symbol`
        );
        if (response.ok) {
          setSymbolResults(await response.json());
        }
      } else if (tab === "history") {
        const response = await fetch(
          `${apiUrl}/repo/${repoId}/search?query=${encodeURIComponent(searchQuery)}&type=history`
        );
        if (response.ok) {
          setPRResults(await response.json());
        }
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, repoId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!initialQuery) return;
    performSearch(initialQuery);
  }, [initialQuery, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/50 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/repo/${repoId}`}>
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Search Repository</h1>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search code, symbols, or PR history..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-10"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={!query.trim() || loading}>
              Search
            </Button>
          </form>

          {/* Tab Bar */}
          <div className="flex gap-4 mt-4 border-t border-border/40 pt-4">
            {[
              { id: "semantic", label: "Semantic", icon: Code2 },
              { id: "symbol", label: "Symbol", icon: GitBranch },
              { id: "history", label: "History", icon: Clock },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  const nextTab = id as typeof activeTab;
                  setActiveTab(nextTab);
                  if (query) performSearch(query, nextTab);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded transition-colors ${
                  activeTab === id
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
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
        ) : !query ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-2">Start searching to explore the codebase</p>
            <p className="text-xs text-muted-foreground">
              Use semantic search for concepts, symbol search for definitions, or history for PRs
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Semantic Search Results */}
            {activeTab === "semantic" && (
              <>
                {semanticResults.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground text-sm">No semantic results found for &quot;{query}&quot;</p>
                    </CardContent>
                  </Card>
                ) : (
                  semanticResults.map((result) => (
                    <Link
                      key={result.id}
                      href={`/repo/${repoId}/files?path=${encodeURIComponent(result.filePath)}&line=${result.startLine}`}
                    >
                      <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-mono text-muted-foreground">
                                  {result.filePath.split("/").pop()}
                                </span>
                                {result.functionName && (
                                  <>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs font-medium text-primary">{result.functionName}</span>
                                  </>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Line {result.startLine}-{result.endLine}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-primary">{Math.round(result.similarity * 100)}%</p>
                              <p className="text-xs text-muted-foreground">match</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs bg-muted/30 p-3 rounded overflow-x-auto mb-3">
                            <code className="line-clamp-4">{result.code}</code>
                          </pre>
                          <p className="text-xs text-muted-foreground">{result.filePath}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </>
            )}

            {/* Symbol Search Results */}
            {activeTab === "symbol" && (
              <>
                {symbolResults.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground text-sm">No symbols found for &quot;{query}&quot;</p>
                    </CardContent>
                  </Card>
                ) : (
                  symbolResults.map((symbol) => (
                    <Link
                      key={`${symbol.filePath}-${symbol.line}`}
                      href={`/repo/${repoId}/files?path=${encodeURIComponent(symbol.filePath)}&line=${symbol.line}`}
                    >
                      <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 text-xs font-medium bg-muted rounded capitalize">
                                  {symbol.type}
                                </span>
                                <h3 className="text-sm font-semibold">{symbol.name}</h3>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                {symbol.filePath}:{symbol.line}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">{symbol.usageCount}</p>
                              <p className="text-xs text-muted-foreground">usages</p>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))
                )}
              </>
            )}

            {/* PR History Results */}
            {activeTab === "history" && (
              <>
                {prResults.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground text-sm">No PRs found for &quot;{query}&quot;</p>
                    </CardContent>
                  </Card>
                ) : (
                  prResults.map((pr) => (
                    <Link
                      key={pr.number}
                      href={`/repo/${repoId}/pr?pr=${pr.number}`}
                    >
                      <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted">
                                  #{pr.number}
                                </span>
                                <span
                                  className={`px-2 py-0.5 text-xs font-medium rounded ${
                                    pr.status === "open"
                                      ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                      : pr.status === "merged"
                                        ? "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                                        : "bg-slate-500/10 text-slate-700 dark:text-slate-400"
                                  }`}
                                >
                                  {pr.status}
                                </span>
                              </div>
                              <h3 className="text-sm font-semibold mb-2">{pr.title}</h3>
                              <p className="text-xs text-muted-foreground mb-2">{pr.summary}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{pr.author}</span>
                                <span>•</span>
                                <span>{pr.createdAt}</span>
                              </div>
                            </div>
                            <GitMerge className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          </div>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
