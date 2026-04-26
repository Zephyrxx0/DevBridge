"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronLeft, MessageSquare, ThumbsUp, Trash2, Edit2, Plus, FileText } from "lucide-react";

interface Annotation {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  comment: string;
  author: string;
  tags: string[];
  upvotes: number;
  createdAt: string;
}

const TagColors: { [key: string]: string } = {
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  architecture: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  gotcha: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  todo: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
  context: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  deprecated: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const TagIcons: { [key: string]: string } = {
  warning: "⚠️",
  architecture: "🏗️",
  gotcha: "💡",
  todo: "📋",
  context: "📝",
  deprecated: "⚰️",
};

export default function AnnotationsPage() {
  const params = useParams();
  const repoId = params.id as string;

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [fileFilter, setFileFilter] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [createFormOpen, setCreateFormOpen] = useState(false);

  // Form state
  const [formFilePath, setFormFilePath] = useState("");
  const [formStartLine, setFormStartLine] = useState("");
  const [formEndLine, setFormEndLine] = useState("");
  const [formComment, setFormComment] = useState("");
  const [formTags, setFormTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchAnnotations();
  }, [mounted, repoId]);

  const fetchAnnotations = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/repo/${repoId}/annotations`);
      if (response.ok) {
        setAnnotations(await response.json());
      }
    } catch (err) {
      console.error("Error fetching annotations:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTagFilter = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    setSelectedTags(newTags);
  };

  const toggleFormTag = (tag: string) => {
    const newTags = new Set(formTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    setFormTags(newTags);
  };

  const filteredAnnotations = annotations.filter((ann) => {
    if (searchText && !ann.comment.toLowerCase().includes(searchText.toLowerCase())) return false;
    if (fileFilter && !ann.filePath.toLowerCase().includes(fileFilter.toLowerCase())) return false;
    if (selectedTags.size > 0 && !ann.tags.some((tag) => selectedTags.has(tag))) return false;
    return true;
  });

  const stats = {
    total: annotations.length,
    thisWeek: annotations.filter((a) => {
      const date = new Date(a.createdAt);
      const now = new Date();
      return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24) <= 7;
    }).length,
    topContributor: annotations.length > 0
      ? Object.entries(
          annotations.reduce(
            (acc: { [key: string]: number }, a) => {
              acc[a.author] = (acc[a.author] || 0) + 1;
              return acc;
            },
            {}
          )
        ).sort((a, b) => b[1] - a[1])[0]?.[0]
      : "N/A",
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/50 sticky top-0 z-40 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href={`/repo/${repoId}`}>
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Annotations</h1>
          </div>
          <Button onClick={() => setCreateFormOpen(!createFormOpen)} className="gap-2" size="sm">
            <Plus className="w-4 h-4" />
            Add Annotation
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-2 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold">{stats.total}</p>
          </div>
          <div className="p-2 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">This Week</p>
            <p className="text-lg font-bold">{stats.thisWeek}</p>
          </div>
          <div className="p-2 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Top Contributor</p>
            <p className="text-lg font-bold line-clamp-1">{stats.topContributor}</p>
          </div>
        </div>
      </header>

      {/* Create Form */}
      {createFormOpen && (
        <div className="bg-muted/30 border-b border-border/40 px-6 py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      FILE PATH
                    </label>
                    <Input
                      placeholder="src/components/Button.tsx"
                      value={formFilePath}
                      onChange={(e) => setFormFilePath(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-2 block">
                        START LINE
                      </label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={formStartLine}
                        onChange={(e) => setFormStartLine(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-2 block">
                        END LINE
                      </label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={formEndLine}
                        onChange={(e) => setFormEndLine(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    COMMENT
                  </label>
                  <textarea
                    placeholder="Add team knowledge..."
                    value={formComment}
                    onChange={(e) => setFormComment(e.target.value)}
                    className="w-full h-20 px-3 py-2 text-xs bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    TAGS
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.keys(TagIcons).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleFormTag(tag)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          formTags.has(tag)
                            ? TagColors[tag]
                            : "bg-muted text-muted-foreground hover:bg-muted/60"
                        }`}
                      >
                        {TagIcons[tag]} {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1">
                    Create Annotation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCreateFormOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-6">
          {/* Filters (Left) */}
          <div className="space-y-4">
            {/* Search */}
            <Card>
              <CardContent className="pt-4">
                <Input
                  placeholder="Search annotations..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="h-9 text-sm"
                />
              </CardContent>
            </Card>

            {/* File Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">File Filter</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Filter by file..."
                  value={fileFilter}
                  onChange={(e) => setFileFilter(e.target.value)}
                  className="h-9 text-sm"
                />
              </CardContent>
            </Card>

            {/* Tag Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(TagIcons).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTagFilter(tag)}
                    className={`w-full px-3 py-2 text-xs rounded font-medium transition-colors text-left ${
                      selectedTags.has(tag)
                        ? TagColors[tag]
                        : "bg-muted text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    {TagIcons[tag]} {tag}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Annotations List (Right) */}
          <div className="col-span-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredAnnotations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No annotations match your filters</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAnnotations.map((ann) => (
                  <Link
                    key={ann.id}
                    href={`/repo/${repoId}/files?path=${encodeURIComponent(ann.filePath)}&line=${ann.startLine}`}
                  >
                    <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-mono text-muted-foreground">
                                {ann.filePath.split("/").pop()}
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-primary font-semibold">
                                L{ann.startLine}-{ann.endLine}
                              </span>
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
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{ann.author}</span>
                              <span>•</span>
                              <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-muted/50 rounded transition-colors">
                              <ThumbsUp className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs ml-1">{ann.upvotes}</span>
                            </button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
