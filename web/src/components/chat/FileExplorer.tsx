"use client";

import {
  ChevronDown,
  Code2,
  FileArchive,
  FileCode2,
  FileImage,
  FileJson,
  FileText,
  Folder,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

export type BranchInfo = {
  name: string;
  is_default?: boolean;
};

interface FileExplorerProps {
  fileTree: FileNode | null;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  loadingFiles: boolean;
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
  branches: BranchInfo[];
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  branchIndexMsg: string;
  branchLoadError: string;
  defaultBranchName: string;
}

export function FileExplorer({
  fileTree,
  expandedFolders,
  toggleFolder,
  loadingFiles,
  selectedFilePath,
  onSelectFile,
  branches,
  selectedBranch,
  setSelectedBranch,
  branchIndexMsg,
  branchLoadError,
  defaultBranchName,
}: FileExplorerProps) {
  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (["ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "c", "cpp", "cs"].includes(ext)) {
      return FileCode2;
    }
    if (["json", "jsonc", "yaml", "yml", "toml"].includes(ext)) {
      return FileJson;
    }
    if (["md", "mdx", "txt", "rst"].includes(ext)) {
      return FileText;
    }
    if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext)) {
      return FileImage;
    }
    if (["zip", "tar", "gz", "7z"].includes(ext)) {
      return FileArchive;
    }
    return Code2;
  };

  const renderTreeNode = (node: FileNode, depth = 0): React.ReactNode => {
    const isDirectory = node.type === "directory";
    const isExpanded = expandedFolders.has(node.path);

    if (depth === 0 && node.children?.length) {
      return node.children.map((child) => renderTreeNode(child, depth + 1));
    }

    if (isDirectory) {
      return (
        <div key={node.path}>
          <button
            type="button"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(
                "application/x-devbridge-ref",
                JSON.stringify({ kind: "folder", filePath: node.path, startLine: 1, endLine: 1, code: "" })
              );
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--foreground-muted)] hover:bg-[var(--surface-2)]"
            style={{ paddingLeft: `${depth * 12}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            <ChevronDown className={cn("size-3.5 transition-transform", isExpanded ? "" : "-rotate-90")} />
            <Folder className="size-3.5" />
            <span className="truncate">{node.name}</span>
          </button>
          {isExpanded && node.children?.length ? node.children.map((child) => renderTreeNode(child, depth + 1)) : null}
        </div>
      );
    }

    const Icon = getFileIcon(node.name);

    return (
      <button
        key={node.path}
        type="button"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(
            "application/x-devbridge-ref",
            JSON.stringify({ kind: "file", filePath: node.path, startLine: 1, endLine: 1, code: "" })
          );
        }}
        onClick={() => onSelectFile(node.path)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--foreground-muted)] hover:bg-[var(--surface-2)]",
          selectedFilePath === node.path ? "bg-[var(--surface-3)] text-[var(--foreground)]" : ""
        )}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <Icon className="size-3.5" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-0">
      <div className="mb-2 mt-1 flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">Files</p>
      </div>

      <div className="relative">
        <GitBranch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)]" />
        <div className="relative">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="h-9 w-full cursor-pointer appearance-none rounded-md border border-[var(--border)] bg-[var(--surface-2)] py-1 pl-8 pr-8 text-xs font-medium text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
          >
            <option value="">{defaultBranchName ? `default (${defaultBranchName})` : "default"}</option>
            {branches.map((b) => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)]" />
        </div>
      </div>

      {branchLoadError ? (
        <p className="mt-1 text-[10px] text-amber-500">Branch fetch warning: {branchLoadError}</p>
      ) : null}

      {branchIndexMsg ? (
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[var(--foreground-subtle)]">
          <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-[var(--brand)]" />
          {branchIndexMsg}
        </p>
      ) : null}

      <div className="mt-2 min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-1.5">
        {loadingFiles ? (
          <div className="space-y-2 px-1 py-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-[92%] rounded-md" />
            <Skeleton className="h-8 w-[86%] rounded-md" />
            <Skeleton className="h-8 w-[94%] rounded-md" />
            <Skeleton className="h-8 w-[80%] rounded-md" />
          </div>
        ) : null}
        {!loadingFiles && fileTree ? renderTreeNode(fileTree) : null}
        {!loadingFiles && !fileTree ? (
          <p className="px-2 py-1 text-xs text-[var(--foreground-subtle)]">
            {selectedBranch
              ? `No files found for branch "${selectedBranch}".`
              : "No files indexed yet. Use the sidebar to index."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
