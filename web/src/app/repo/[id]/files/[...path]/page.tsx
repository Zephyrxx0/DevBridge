"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ExternalLink, ThumbsUp } from "lucide-react";

interface Annotation {
  id: string;
  line: number;
  comment: string;
  author: string;
  tags: string[];
  upvotes: number;
  created_at: string;
}

interface FileContent {
  content: string;
  language: string;
  line_count: number;
  annotations: Annotation[];
}

const TagColors: { [key: string]: string } = {
  warning: "bg-[var(--accent-warm-muted)] text-[var(--accent-warm)]",
  architecture: "bg-[var(--brand-muted)] text-[var(--brand)]",
  gotcha: "bg-[var(--accent-ember-muted)] text-[var(--accent-ember)]",
  todo: "bg-[var(--surface-3)] text-[var(--foreground-muted)]",
  context: "bg-[var(--brand-muted)] text-[var(--brand)]",
  deprecated: "bg-[var(--accent-rose-muted)] text-[var(--accent-rose)]",
};

const TagIcons: { [key: string]: string } = {
  warning: "⚠️",
  architecture: "🏗️",
  gotcha: "💡",
  todo: "📋",
  context: "📝",
  deprecated: "⚰️",
};

export default function CodeViewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const repoId = params.id as string;
  const pathArray = (params.path as string[]) || [];
  const filePath = pathArray.join("/");
  const lineParam = searchParams.get("line");
  const annParam = searchParams.get("ann");

  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightedLine] = useState<number | null>(lineParam ? parseInt(lineParam) : null);
  const [, setExpandedAnnotation] = useState<string | null>(annParam || null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchFileContent = useCallback(async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/repo/${repoId}/files/${filePath}`);
      if (response.ok) {
        const data = await response.json();
        setFileContent(data);
      }
    } catch (err) {
      console.error("Error fetching file content:", err);
    } finally {
      setLoading(false);
    }
  }, [repoId, filePath]);

  useEffect(() => {
    if (!mounted) return;
    fetchFileContent();
  }, [mounted, fetchFileContent]);

  if (!mounted) return null;

  const lines = fileContent?.content.split("\n") || [];
  const sortedAnnotations = fileContent?.annotations.sort((a, b) => a.line - b.line) || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Link href={`/repo/${repoId}/files`}>
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <p className="text-xs text-muted-foreground">Code Browser</p>
                <h1 className="text-lg font-semibold font-mono text-sm">{filePath}</h1>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Open in Editor
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{fileContent?.line_count || 0} lines</span>
            <span>•</span>
            <span>{fileContent?.language}</span>
            <span>•</span>
            <span>{sortedAnnotations.length} annotations</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Code Viewer */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="h-96 bg-muted/50 rounded-lg animate-pulse" />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <div className="font-mono text-sm bg-muted/30">
                  {lines.map((line, idx) => {
                    const lineNum = idx + 1;
                    const isHighlighted = highlightedLine === lineNum;
                    const lineAnnotations = sortedAnnotations.filter((a) => a.line === lineNum);

                    return (
                      <div
                        key={idx}
                        className={`flex hover:bg-muted/50 transition-colors ${
                          isHighlighted ? "bg-primary/10 border-l-2 border-primary" : ""
                        }`}
                      >
                        <div className="flex items-start">
                          {/* Line Number */}
                          <a
                            href={`?line=${lineNum}`}
                            className="select-none inline-flex items-center justify-center w-12 px-2 py-1 text-muted-foreground hover:bg-muted/50 border-r border-border/20 text-xs font-mono sticky left-0 bg-muted/20"
                          >
                            {lineNum}
                          </a>

                          {/* Code */}
                          <pre className="flex-1 px-4 py-1 overflow-x-auto">
                            <code>{line || " "}</code>
                          </pre>

                          {/* Annotation Badges */}
                          {lineAnnotations.length > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 border-l border-border/20">
                              {lineAnnotations.map((ann) => (
                                <button
                                  key={ann.id}
                                  onClick={() => setExpandedAnnotation(ann.id)}
                                  className="w-2 h-2 rounded-full bg-primary hover:ring-2 ring-primary/30 transition-all"
                                  title={ann.comment}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Side Panel */}
        <aside className="w-80 space-y-6">
          {/* Annotations Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Annotations</CardTitle>
              <p className="text-xs text-muted-foreground mt-2">{sortedAnnotations.length} total</p>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {sortedAnnotations.length === 0 ? (
                <p className="text-xs text-muted-foreground">No annotations yet. Add team knowledge to this file.</p>
              ) : (
                sortedAnnotations.map((ann) => (
                  <div key={ann.id} className="p-3 border border-border/40 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setExpandedAnnotation(ann.id)}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <a href={`?line=${ann.line}`} className="text-xs font-mono text-primary hover:underline">
                        Line {ann.line}
                      </a>
                      <span className="text-xs text-muted-foreground">{ann.author}</span>
                    </div>
                    <p className="text-sm mb-2 line-clamp-2">{ann.comment}</p>
                    {ann.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {ann.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              TagColors[tag] || "bg-slate-500/10 text-slate-700"
                            }`}
                          >
                            {TagIcons[tag]} {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <button className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                        <ThumbsUp className="w-3 h-3" />
                        {ann.upvotes}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Add Annotation Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Add Annotation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Start Line</label>
                  <Input type="number" placeholder="Line" className="h-8 mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium">End Line</label>
                  <Input type="number" placeholder="Line" className="h-8 mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium">Comment</label>
                  <textarea
                    placeholder="Add team knowledge..."
                    className="w-full h-16 px-3 py-2 text-xs bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring/50 mt-1"
                  />
                </div>
                <Button size="sm" className="w-full">
                  Add Annotation
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Citations Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Citations</CardTitle>
              <p className="text-xs text-muted-foreground mt-2">Linked from chat/PR review</p>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">No citations yet</p>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
