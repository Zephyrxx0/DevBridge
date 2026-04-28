"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronDown, ChevronLeft, GitBranch, RefreshCw, ZoomIn, ZoomOut, Network } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRepo } from "@/contexts/repo-context";

// Dynamic import — react-force-graph-2d uses Canvas/window APIs
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse bg-muted/40" />,
});

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

type GraphData = {
  nodes: { id: string; group: string; degree: number; val: number }[];
  links: { source: string; target: string }[];
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SKIP_FILES = new Set([
  ".gitignore", ".npmrc", ".eslintrc", ".eslintrc.js", ".eslintrc.json",
  ".prettierrc", ".prettierrc.js", ".prettierrc.json", ".prettierignore",
  ".editorconfig", ".env", ".env.local", ".env.example",
  "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "tsconfig.json", "tsconfig.node.json", "next-env.d.ts",
  "postcss.config.js", "postcss.config.mjs",
  "tailwind.config.js", "tailwind.config.ts",
  "vite.config.ts", "jest.config.ts", "jest.config.js", "vitest.config.ts",
  "LICENSE", "README.md", "CHANGELOG.md",
]);

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", ".vscode", ".idea", "dist", "build",
  "__pycache__", ".pytest_cache", ".ruff_cache", ".venv",
  ".planning", ".agent", ".agents", ".entire", ".fallow",
  ".claude", ".codex", ".opencode", ".gsd", ".bg-shell",
  ".benchmarks", ".code-review-graph", "graphify-out", "memories", ".github",
]);

const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".rs", ".go", ".java", ".kt", ".swift",
  ".c", ".cpp", ".h", ".hpp", ".cs",
  ".rb", ".php", ".vue", ".svelte", ".astro",
  ".css", ".scss", ".sass", ".less",
  ".html", ".xml", ".yaml", ".yml", ".toml",
  ".sql", ".graphql", ".gql",
  ".sh", ".bash", ".zsh",
  ".md", ".mdx",
]);

function flattenFiles(node: FileNode | null): string[] {
  if (!node) return [];
  if (node.type === "file") return [node.path];
  const dirName = node.path.split("/").pop() || node.name;
  if (SKIP_DIRS.has(dirName)) return [];
  return (node.children || []).flatMap((child) => flattenFiles(child));
}

function shouldInclude(path: string): boolean {
  const fileName = path.split("/").pop() || "";
  if (SKIP_FILES.has(fileName)) return false;
  if (fileName.startsWith(".")) return false;
  const ext = fileName.includes(".") ? "." + fileName.split(".").pop() : "";
  return CODE_EXTENSIONS.has(ext);
}

function getFileGroup(path: string): string {
  const parts = path.split("/");
  if (parts.length <= 1) return "root";
  return parts[0];
}

function getExtColor(path: string): string {
  const ext = path.split(".").pop() || "";
  const colors: Record<string, string> = {
    ts: "#3178c6", tsx: "#3178c6",
    js: "#f7df1e", jsx: "#f7df1e", mjs: "#f7df1e",
    py: "#3776ab",
    rs: "#dea584",
    go: "#00add8",
    css: "#264de4", scss: "#cf649a",
    html: "#e34c26",
    md: "#888888", mdx: "#888888",
    json: "#5a9e6f",
    yaml: "#cb171e", yml: "#cb171e",
    sql: "#e38c00",
    vue: "#42b883", svelte: "#ff3e00",
  };
  return colors[ext] || "#7c8594";
}

function removeFileExtension(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(0, dot) : path;
}

function normalizePath(path: string): string {
  const parts = path.split("/");
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") { stack.pop(); continue; }
    stack.push(part);
  }
  return stack.join("/");
}

function dirname(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

function resolveImportPath(fromFile: string, importPath: string): string {
  // Support @/ aliases (Next.js default)
  if (importPath.startsWith("@/")) {
    const srcIdx = fromFile.indexOf("src/");
    if (srcIdx !== -1) {
      const base = fromFile.slice(0, srcIdx + 4); // e.g. "web/src/"
      return normalizePath(base + importPath.slice(2));
    }
    // Fallback to root-level src/
    return normalizePath("src/" + importPath.slice(2));
  }
  
  // Support ~ aliases (common in some setups)
  if (importPath.startsWith("~/")) {
    const srcIdx = fromFile.indexOf("src/");
    if (srcIdx !== -1) {
      const base = fromFile.slice(0, srcIdx + 4);
      return normalizePath(base + importPath.slice(2));
    }
    return normalizePath("src/" + importPath.slice(2));
  }

  if (!importPath.startsWith("./") && !importPath.startsWith("../")) return "";
  const base = dirname(fromFile);
  return normalizePath(base ? `${base}/${importPath}` : importPath);
}

function parseImports(source: string): string[] {
  const results: string[] = [];
  // Handles:
  // import ... from 'path'
  // import 'path'
  // require('path')
  // import('path')
  // export ... from 'path'
  const re = /(?:import\s+(?:(?:[\s\S]*?)\s+from\s+)?|require\s*\(|import\s*\(|export\s+(?:(?:[\s\S]*?)\s+from\s+))[\"']([^\"']+)[\"']/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    if (match[1]) results.push(match[1]);
  }
  return results;
}

/**
 * Attempts to find an actual file path in the fileSet that matches an import string.
 * Handles missing extensions and directory index files.
 */
function findMatchingFile(path: string, fileSet: Set<string>): string | null {
  if (!path) return null;
  if (fileSet.has(path)) return path;
  
  const extensions = [".ts", ".tsx", ".js", ".jsx", ".css", ".scss", ".json"];
  for (const ext of extensions) {
    if (fileSet.has(path + ext)) return path + ext;
  }
  
  // Check index files
  const indexFiles = ["/index.ts", "/index.tsx", "/index.js", "/index.jsx"];
  for (const idx of indexFiles) {
    if (fileSet.has(path + idx)) return path + idx;
  }
  
  return null;
}

const GROUP_COLORS: Record<string, string> = {};
const PALETTE = [
  "#ec4e02", "#3178c6", "#42b883", "#e34c26", "#cf649a",
  "#f7df1e", "#3776ab", "#dea584", "#00add8", "#8b5cf6",
];
let colorIdx = 0;
function getGroupColor(group: string): string {
  if (!GROUP_COLORS[group]) {
    GROUP_COLORS[group] = PALETTE[colorIdx % PALETTE.length];
    colorIdx++;
  }
  return GROUP_COLORS[group];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const MAX_FILES = 200;

export default function MapPage() {
  const params = useParams<{ id: string }>();
  const repoId = String(params.id ?? "");
  const { repo } = useRepo();

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // mounted guard — prevents SSR/client disabled-prop hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ files: 0, edges: 0 });
  const [branches, setBranches] = useState<{ name: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const graphRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => { setMounted(true); }, []);

  // Responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setDimensions({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const apiUrl = "/api/backend";

  // Load branches and check indexing status
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch(`${apiUrl}/repo/${repoId}/branches`);
        if (!res.ok) return;
        const data = (await res.json()) as { name: string }[];
        setBranches(data);
      } catch {
        // non-critical
      }
    }

    async function checkIndexing() {
      try {
        const res = await fetch(`${apiUrl}/repo/${repoId}/index-status`);
        if (res.ok) {
          const status = (await res.json()) as { indexed: boolean };
          if (!status.indexed) {
            // Auto-trigger indexing if never indexed
            fetch(`${apiUrl}/repo/${repoId}/trigger-index`, { method: "POST" }).catch(() => null);
          }
        }
      } catch {
        // non-critical
      }
    }

    loadBranches();
    checkIndexing();
  }, [apiUrl, repoId]);

  const fetchGraph = useCallback(async (branch?: string, fresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (branch) params.set("branch", branch);
      if (fresh) params.set("fresh", "true");
      const qs = params.toString() ? `?${params.toString()}` : "";
      const filesRes = await fetch(`${apiUrl}/repo/${repoId}/files${qs}`);
      if (!filesRes.ok) {
        setError(`Failed to fetch files (${filesRes.status})`);
        setLoading(false);
        return;
      }
      const tree = (await filesRes.json()) as FileNode;
      const allFiles = flattenFiles(tree).filter(shouldInclude).slice(0, MAX_FILES);

      if (allFiles.length === 0) {
        // Files endpoint may have returned stale/empty cache — retry with fresh=true once
        if (!fresh) {
          // Small delay then retry bypassing cache
          await new Promise((r) => setTimeout(r, 800));
          const retryParams = new URLSearchParams();
          if (branch) retryParams.set("branch", branch);
          retryParams.set("fresh", "true");
          const retryRes = await fetch(`${apiUrl}/repo/${repoId}/files?${retryParams.toString()}`);
          if (retryRes.ok) {
            const retryTree = (await retryRes.json()) as FileNode;
            const retryFiles = flattenFiles(retryTree).filter(shouldInclude).slice(0, MAX_FILES);
            if (retryFiles.length > 0) {
              // recurse with fresh=true so we skip the empty check
              return void fetchGraph(branch, true);
            }
          }
        }
        setError("No code files found. Repository may not be indexed yet.");
        setLoading(false);
        return;
      }

      // Phase 1: Render nodes immediately
      const initialNodes = allFiles.map((id) => ({
        id,
        group: getFileGroup(id),
        degree: 0,
        val: 6, // bigger baseline
      }));
      setGraphData({ nodes: initialNodes, links: [] });
      setStats({ files: initialNodes.length, edges: 0 });
      setLoading(false); // Show graph immediately

      // Phase 2: Resolve edges in background
      const fileSet = new Set(allFiles);
      const fileWithoutExtMap = new Map<string, string>();
      for (const file of allFiles) {
        fileWithoutExtMap.set(removeFileExtension(file), file);
      }

      const edgeSet = new Set<string>();
      const degreeMap = new Map<string, number>();
      allFiles.forEach((f) => degreeMap.set(f, 0));

      let consecutiveFailures = 0;
      const MAX_CONSECUTIVE_FAILURES = 8;
      const FETCH_TIMEOUT_MS = 3000;
      const BATCH = 25; // increased batch size

      for (let i = 0; i < allFiles.length; i += BATCH) {
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) break;

        const batch = allFiles.slice(i, i + BATCH);
        let batchSuccesses = 0;
        await Promise.allSettled(
          batch.map(async (filePath) => {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
              let fetchUrl = `${apiUrl}/repo/${repoId}/files/${encodeURIComponent(filePath)}`;
              if (branch) fetchUrl += `?branch=${encodeURIComponent(branch)}`;
              
              const res = await fetch(fetchUrl, { signal: controller.signal });
              clearTimeout(timeout);
              if (!res.ok) return null;
              batchSuccesses++;
              consecutiveFailures = 0;
              const payload = (await res.json()) as { content?: string };
              if (!payload?.content) return null;

              const imports = parseImports(payload.content);
              for (const imp of imports) {
                const resolved = resolveImportPath(filePath, imp);
                const matched = findMatchingFile(resolved, fileSet);

                if (matched && matched !== filePath) {
                  const key = `${filePath}=>${matched}`;
                  if (!edgeSet.has(key)) {
                    edgeSet.add(key);
                    degreeMap.set(filePath, (degreeMap.get(filePath) || 0) + 1);
                    degreeMap.set(matched, (degreeMap.get(matched) || 0) + 1);
                  }
                }
              }
            } catch {
              return null;
            }
          })
        );

        if (batchSuccesses === 0) consecutiveFailures++;

        // Progressive update: push new edges to graph after each batch
        if (edgeSet.size > 0) {
          const links = Array.from(edgeSet).map((entry) => {
            const [source, target] = entry.split("=>");
            return { source, target };
          });
          const nodes = allFiles.map((id) => ({
            id,
            group: getFileGroup(id),
            degree: degreeMap.get(id) || 0,
            // Even bigger nodes: base=16, scale up with connections
            val: Math.max(16, (degreeMap.get(id) || 0) * 4 + 8),
          }));
          setGraphData({ nodes, links });
          setStats({ files: nodes.length, edges: links.length });
        }
      }
    } catch (err) {
      console.error("Graph fetch error:", err);
      setError("Network error fetching repository data. Is the backend running?");
      setLoading(false);
    }
  }, [apiUrl, repoId]);

  // Trigger fetchGraph when branch or repoId changes, or when indexing completes
  useEffect(() => {
    fetchGraph(selectedBranch || undefined, false);
  }, [fetchGraph, selectedBranch, repo?.lastIndexed]);

  const selectedNode = useMemo(
    () => graphData.nodes.find((n) => n.id === selectedNodeId),
    [graphData.nodes, selectedNodeId]
  );

  const selectedEdges = useMemo(
    () =>
      selectedNodeId
        ? graphData.links.filter(
            (l) =>
              (typeof l.source === "string" ? l.source : (l.source as any)?.id) === selectedNodeId ||
              (typeof l.target === "string" ? l.target : (l.target as any)?.id) === selectedNodeId
          )
        : [],
    [graphData.links, selectedNodeId]
  );

  const handleZoomIn = () => graphRef.current?.zoom(graphRef.current.zoom() * 1.4, 300);
  const handleZoomOut = () => graphRef.current?.zoom(graphRef.current.zoom() / 1.4, 300);

  return (
    <div className="flex h-[calc(100vh-1rem)] min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 border-b border-border/40 bg-background/60 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/repo/${repoId}`}>
              <Button variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <p className="text-xs text-muted-foreground">Repository Map</p>
              <h1 className="text-lg font-semibold">Codebase Knowledge Map</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <span className="text-xs text-muted-foreground mr-2">
                {stats.files} files · {stats.edges} connections
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleZoomIn} title="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut} title="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            {/* disabled only set client-side to avoid SSR hydration mismatch */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fetchGraph(selectedBranch || undefined, true)}
              {...(mounted ? { disabled: loading } : {})}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 p-4 md:p-6">
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          <CardHeader className="shrink-0 border-b border-border/40 py-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Network className="h-4 w-4 text-brand" />
                <span>Dependency Graph</span>
                {branches.length > 0 && (
                  <div className="ml-2 relative">
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="appearance-none rounded-md border border-border bg-muted/50 px-2 py-0.5 pr-6 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer hover:bg-muted"
                    >
                      <option value="">default</option>
                      {branches.map((b) => (
                        <option key={b.name} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Analyzing codebase dependencies…
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center max-w-sm">
                  <p className="text-sm text-destructive mb-2">{error}</p>
                  <Button variant="outline" size="sm" onClick={() => void fetchGraph(selectedBranch || undefined, true)}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[1fr_320px]">
                {/* Graph canvas */}
                <div
                  ref={containerRef}
                  className="min-h-0 overflow-hidden border-b border-border/30 lg:border-b-0 lg:border-r lg:border-border/30 bg-[var(--surface-1,#0a0a0a)]"
                >
                  <ForceGraph2D
                    ref={graphRef}
                    graphData={graphData}
                    width={dimensions.width}
                    height={dimensions.height}
                    nodeLabel={(node: any) => node.id}
                    nodeColor={(node: any) =>
                      node.id === selectedNodeId
                        ? "#ec4e02"
                        : getExtColor(node.id)
                    }
                    nodeVal={(node: any) => node.val}
                    nodeRelSize={12}
                    // Edges: always visible, highlight selected
                    linkColor={(link: any) => {
                      const src = typeof link.source === "string" ? link.source : link.source?.id;
                      const tgt = typeof link.target === "string" ? link.target : link.target?.id;
                      if (src === selectedNodeId || tgt === selectedNodeId) return "rgba(236,78,2,1)";
                      return "rgba(180,180,200,0.5)";
                    }}
                    linkWidth={(link: any) => {
                      const src = typeof link.source === "string" ? link.source : link.source?.id;
                      const tgt = typeof link.target === "string" ? link.target : link.target?.id;
                      return src === selectedNodeId || tgt === selectedNodeId ? 5 : 2.5;
                    }}
                    linkDirectionalArrowLength={6}
                    linkDirectionalArrowRelPos={1}
                    linkDirectionalParticles={(link: any) => {
                      const src = typeof link.source === "string" ? link.source : link.source?.id;
                      const tgt = typeof link.target === "string" ? link.target : link.target?.id;
                      return src === selectedNodeId || tgt === selectedNodeId ? 4 : 0;
                    }}
                    linkDirectionalParticleSpeed={0.006}
                    onNodeClick={(node: any) => setSelectedNodeId(node.id)}
                    onBackgroundClick={() => setSelectedNodeId(null)}
                    backgroundColor="transparent"
                    cooldownTicks={150}
                    d3AlphaDecay={0.01}
                    onEngineTick={() => {
                      if (graphRef.current) {
                        graphRef.current.d3Force("link").distance(120);
                        graphRef.current.d3Force("charge").strength(-300);
                      }
                    }}
                    nodeCanvasObjectMode={() => "after"}
                    nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                      if (globalScale < 1.8 && node.id !== selectedNodeId) return;
                      const label = (node.id as string).split("/").pop() || "";
                      const fontSize = Math.max(10 / globalScale, 2);
                      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
                      ctx.textAlign = "center";
                      ctx.textBaseline = "top";
                      ctx.fillStyle =
                        node.id === selectedNodeId
                          ? "#ec4e02"
                          : "rgba(255,255,255,0.7)";
                      ctx.fillText(label, node.x, node.y + 8);
                    }}
                    d3AlphaDecay={0.02}
                    d3VelocityDecay={0.3}
                  />
                </div>

                {/* Sidebar */}
                <div className="min-h-0 overflow-auto p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Selection
                  </p>
                  {selectedNode ? (
                    <div className="mt-3 space-y-4">
                      <div className="rounded-lg border border-border/50 p-3">
                        <p className="text-xs text-muted-foreground">File</p>
                        <p className="pt-1 font-mono text-xs break-all">
                          {selectedNode.id}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground">
                            Connections: {selectedNode.degree}
                          </span>
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: getExtColor(selectedNode.id) }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {selectedNode.group}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Connections ({selectedEdges.length})
                        </p>
                        <div className="mt-2 space-y-2 max-h-[50vh] overflow-auto">
                          {selectedEdges.length > 0 ? (
                            selectedEdges.slice(0, 50).map((edge, idx) => {
                              const src = typeof edge.source === "string" ? edge.source : (edge.source as any)?.id;
                              const tgt = typeof edge.target === "string" ? edge.target : (edge.target as any)?.id;
                              return (
                                <div
                                  key={`${src}-${tgt}-${idx}`}
                                  className="rounded border border-border/40 p-2 text-xs"
                                >
                                  <p className="font-mono break-all">{src}</p>
                                  <p className="py-1 text-muted-foreground">→ imports</p>
                                  <p className="font-mono break-all">{tgt}</p>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No edges found for this file.
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Link
                          href={`/repo/${repoId}?path=${encodeURIComponent(selectedNode.id)}${selectedBranch ? `&branch=${encodeURIComponent(selectedBranch)}` : ""}`}
                        >
                          <Button variant="outline" size="sm" className="w-full">
                            View Source
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Click any node in the graph to inspect dependencies.
                    </p>
                  )}

                  {/* Legend */}
                  <div className="mt-6 border-t border-border/30 pt-4">
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground mb-2">
                      Legend
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { ext: "ts/tsx", color: "#3178c6" },
                        { ext: "js/jsx", color: "#f7df1e" },
                        { ext: "py", color: "#3776ab" },
                        { ext: "css/scss", color: "#264de4" },
                        { ext: "html", color: "#e34c26" },
                        { ext: "other", color: "#7c8594" },
                      ].map(({ ext, color }) => (
                        <div key={ext} className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs text-muted-foreground">{ext}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-px w-6 bg-[rgba(160,160,180,0.5)]" />
                        <span className="text-xs text-muted-foreground">import edge</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-px w-6 bg-[#ec4e02]" />
                        <span className="text-xs text-muted-foreground">selected edge</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
