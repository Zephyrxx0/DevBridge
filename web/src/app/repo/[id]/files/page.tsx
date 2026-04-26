"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronDown, File, Folder, Code2, GitBranch, Search } from "lucide-react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  chunkCount?: number;
  annotationDensity?: "high" | "medium" | "low";
}

interface FileContent {
  content: string;
  language: string;
  line_count: number;
  annotations: Array<{ id: string; line: number; comment: string; author: string }>;
}

export default function FilesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const repoId = params.id as string;
  const selectedPath = searchParams.get("path");

  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchFileTree();
  }, [mounted, repoId]);

  useEffect(() => {
    if (selectedPath && mounted) {
      fetchFileContent(selectedPath);
    }
  }, [selectedPath, mounted]);

  const fetchFileTree = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/repo/${repoId}/files`);
      if (response.ok) {
        const data = await response.json();
        setFileTree(data);
      }
    } catch (err) {
      console.error("Error fetching file tree:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFileContent = async (path: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/repo/${repoId}/files/${path}`);
      if (response.ok) {
        const data = await response.json();
        setFileContent(data);
      }
    } catch (err) {
      console.error("Error fetching file content:", err);
    }
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const getDensityIndicator = (density?: string) => {
    if (density === "high") return <div className="w-2 h-2 rounded-full bg-green-500" />;
    if (density === "medium") return <div className="w-2 h-2 rounded-full bg-yellow-500" />;
    return <div className="w-2 h-2 rounded-full bg-slate-300" />;
  };

  const renderFileTree = (node: FileNode, depth: number = 0): React.ReactNode => {
    if (!node) return null;

    const isExpanded = expandedFolders.has(node.path);
    const filteredChildren = node.children?.filter(
      (child) => filterText === "" || child.name.toLowerCase().includes(filterText.toLowerCase())
    ) || [];

    const isFile = node.type === "file";
    const href = isFile ? `?path=${encodeURIComponent(node.path)}` : undefined;

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
            <Folder className="w-4 h-4" />
            <span className="flex-1 truncate">{node.name}</span>
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
                  <Link href={href || `?path=${encodeURIComponent(child.path)}`}>
                    <button
                      className={`w-full flex items-center gap-2 px-2 py-1 text-sm rounded transition-colors text-left hover:bg-muted/50 ${
                        selectedPath === child.path ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"
                      }`}
                      style={{ paddingLeft: `${(depth + 1) * 16}px` }}
                    >
                      <Code2 className="w-4 h-4" />
                      <span className="flex-1 truncate">{child.name}</span>
                      {child.chunkCount !== undefined && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">{child.chunkCount}</span>
                      )}
                      {getDensityIndicator(child.annotationDensity)}
                    </button>
                  </Link>
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
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-60 border-r border-border/40 bg-background/50 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-border/40">
          <Link href={`/repo/${repoId}`}>
            <Button variant="ghost" size="sm" className="gap-2 w-full justify-start">
              <ChevronLeft className="w-4 h-4" />
              Back to Chat
            </Button>
          </Link>
        </div>

        {/* Filter */}
        <div className="px-3 py-3 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter files..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : fileTree ? (
            renderFileTree(fileTree)
          ) : (
            <p className="text-xs text-muted-foreground p-2">No files indexed yet</p>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border/40 bg-background/50 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href={`/repo/${repoId}`}>
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <p className="text-sm text-muted-foreground">Files</p>
              <h1 className="text-lg font-semibold">{selectedPath || "Select a file"}</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {!selectedPath ? (
            <div className="flex items-center justify-center h-full">
              <Card className="text-center">
                <CardContent className="py-12">
                  <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-2">Select a file to preview</p>
                  <p className="text-xs text-muted-foreground">Choose a file from the tree on the left</p>
                </CardContent>
              </Card>
            </div>
          ) : fileContent ? (
            <div className="h-full overflow-y-auto p-6">
              <Card>
                <CardHeader className="border-b border-border/40 sticky top-0 bg-background/50">
                  <CardTitle className="text-sm">{selectedPath}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-2">
                    {fileContent.line_count} lines • {fileContent.language} • {fileContent.annotations.length} annotations
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <pre className="p-4 overflow-x-auto text-xs font-mono text-muted-foreground bg-muted/30">
                    <code>{fileContent.content}</code>
                  </pre>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading file...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
