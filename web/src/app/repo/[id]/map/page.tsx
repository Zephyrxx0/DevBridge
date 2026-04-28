"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Zap, TrendingUp, ChevronDown } from "lucide-react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  density?: number;
}

interface Hotspot {
  path: string;
  citationCount: number;
  density: number;
  functionName?: string;
}

interface RecentChange {
  path: string;
  commits: number;
  authors: string[];
  lastChanged: string;
}

export default function MapPage() {
  const params = useParams();
  const repoId = params.id as string;

  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [filterText, setFilterText] = useState("");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchMapData = useCallback(async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      
      const [treeRes, hotspotsRes, changesRes] = await Promise.all([
        fetch(`${apiUrl}/repo/${repoId}/files`),
        fetch(`${apiUrl}/repo/${repoId}/hotspots`),
        fetch(`${apiUrl}/repo/${repoId}/recent-changes`),
      ]);

      if (treeRes.ok) {
        setFileTree(await treeRes.json());
      }
      if (hotspotsRes.ok) {
        setHotspots(await hotspotsRes.json());
      }
      if (changesRes.ok) {
        setRecentChanges(await changesRes.json());
      }
    } catch (err) {
      console.error("Error fetching map data:", err);
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    if (!mounted) return;
    fetchMapData();
  }, [mounted, fetchMapData]);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const getDensityBar = (density: number) => {
    const percentage = Math.min((density / 100) * 100, 100);
    const color =
      percentage > 75
        ? "bg-green-500"
        : percentage > 50
          ? "bg-yellow-500"
          : percentage > 25
            ? "bg-orange-500"
            : "bg-slate-300";
    return (
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    );
  };

  const renderFileTree = (node: FileNode, depth: number = 0): React.ReactNode => {
    if (!node) return null;

    const isExpanded = expandedFolders.has(node.path);
    const filteredChildren = node.children?.filter(
      (child) => filterText === "" || child.name.toLowerCase().includes(filterText.toLowerCase())
    ) || [];

    return (
      <div key={node.path}>
        {node.type === "directory" && depth > 0 && (
          <button
            onClick={() => toggleFolder(node.path)}
            className="w-full flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground hover:bg-muted/50 rounded transition-colors text-left"
            style={{ paddingLeft: `${depth * 16}px` }}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
            />
            <span className="flex-1 truncate font-medium">{node.name}</span>
            {node.density !== undefined && (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {Math.round(node.density)}%
              </span>
            )}
          </button>
        )}

        {depth === 0 && node.children && (
          <div className="space-y-1">
            {node.children.map((child) => renderFileTree(child, depth + 1))}
          </div>
        )}

        {isExpanded && node.children && node.children.length > 0 && (
          <div className="space-y-1">
            {filteredChildren.map((child) => (
              <div key={child.path}>
                {child.type === "file" ? (
                  <div
                    className="flex items-center gap-2 px-2 py-1 text-sm rounded transition-colors text-left hover:bg-muted/50 cursor-pointer text-muted-foreground"
                    style={{ paddingLeft: `${(depth + 1) * 16}px` }}
                  >
                    <div className="w-4 h-4 text-xs">📄</div>
                    <span className="flex-1 truncate text-xs font-mono">{child.name}</span>
                  </div>
                ) : (
                  renderFileTree(child, depth + 1)
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/50 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href={`/repo/${repoId}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">Repository Map</p>
            <h1 className="text-lg font-semibold">Knowledge Distribution</h1>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {/* File Tree Column */}
            <Card className="col-span-1">
              <CardHeader className="border-b border-border/40">
                <CardTitle className="text-sm">File Structure</CardTitle>
                <Input
                  placeholder="Filter..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="mt-3 h-8 text-xs"
                />
              </CardHeader>
              <CardContent className="p-0 max-h-96 overflow-y-auto">
                <div className="p-3 space-y-1">
                  {fileTree ? (
                    renderFileTree(fileTree)
                  ) : (
                    <p className="text-xs text-muted-foreground">No files</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Map/Hotspots Column */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Knowledge Density
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-2">Top knowledge hotspots by citations</p>
              </CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {hotspots.slice(0, 8).map((hotspot, idx) => (
                  <button
                    key={hotspot.path}
                    onClick={() => setSelectedHotspot(hotspot)}
                    className={`w-full p-3 rounded-lg border transition-colors text-left ${
                      selectedHotspot?.path === hotspot.path
                        ? "border-primary bg-primary/10"
                        : "border-border/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs font-mono font-semibold text-primary">#{idx + 1}</span>
                      <span className="text-xs text-muted-foreground">{hotspot.citationCount} cites</span>
                    </div>
                    <p className="text-xs font-medium line-clamp-1 mb-2">{hotspot.path.split("/").pop()}</p>
                    {getDensityBar(hotspot.density)}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Detail/Recent Column */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Recent Changes
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-2">Files with recent activity</p>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {recentChanges.slice(0, 8).map((change) => (
                  <Link key={change.path} href={`/repo/${repoId}/files?path=${encodeURIComponent(change.path)}`}>
                    <div className="p-3 border border-border/40 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <p className="text-xs font-mono font-medium mb-2 line-clamp-1">{change.path.split("/").pop()}</p>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {change.commits} commit{change.commits !== 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {change.authors.join(", ")}
                        </p>
                        <p className="text-xs text-muted-foreground">{change.lastChanged}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detail Panel */}
        {selectedHotspot && (
          <Card className="mt-6">
            <CardHeader className="border-b border-border/40">
              <CardTitle className="text-sm">{selectedHotspot.path}</CardTitle>
              <p className="text-xs text-muted-foreground mt-2">
                {selectedHotspot.citationCount} citations • {Math.round(selectedHotspot.density)}% density
              </p>
            </CardHeader>
            <CardContent className="py-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">DENSITY</p>
                  {getDensityBar(selectedHotspot.density)}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">CITATIONS</p>
                  <p className="text-2xl font-bold">{selectedHotspot.citationCount}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">ACTION</p>
                  <Link href={`/repo/${repoId}/files?path=${encodeURIComponent(selectedHotspot.path)}`}>
                    <Button size="sm" variant="outline" className="w-full">
                      View File
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
