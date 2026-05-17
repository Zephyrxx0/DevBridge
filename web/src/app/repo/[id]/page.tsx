"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Editor, { OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Code2, Folder, GitBranch, Plus, Sun, Moon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { HistorySidebar, type ChatSession } from "@/components/chat/HistorySidebar";
import { FileExplorer, type FileNode, type BranchInfo } from "@/components/chat/FileExplorer";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChatStream } from "@/components/chat/ChatStream";
import { ChatInput } from "@/components/chat/ChatInput";
import type { Message, SourceReference, SnippetChip } from "@/components/chat/types";

type FileContent = {
  content: string;
  language: string;
  line_count: number;
};

function countTreeFiles(node: FileNode | null): number {
  if (!node) return 0;
  if (node.type === "file") return 1;
  return (node.children || []).reduce((sum, child) => sum + countTreeFiles(child), 0);
}

const languageMap: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  css: "css",
  html: "html",
  json: "json",
  md: "markdown",
  sql: "sql",
  sh: "shell",
};

function detectLanguage(filePath: string, fallback: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  return languageMap[ext] || fallback || "plaintext";
}

import { useRepo } from "@/contexts/repo-context";
import { OnboardingGuide } from "@/components/onboarding/OnboardingGuide";

export default function RepoWorkspacePage() {
  const params = useParams<{ id: string }>();
  const repoId = String(params.id ?? "");

  const { repo } = useRepo();
  const { resolvedTheme, theme, setTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [snippetChips, setSnippetChips] = useState<SnippetChip[]>([]);
  const [selectedSource, setSelectedSource] = useState<SourceReference | null>(null);

  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loadingFileContent, setLoadingFileContent] = useState(false);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(`repo:${repoId}:selectedBranch`) || "";
  });
  const [branchIndexing, setBranchIndexing] = useState(false);
  const [branchIndexMsg, setBranchIndexMsg] = useState("");
  const [branchLoadError, setBranchLoadError] = useState("");
  const defaultBranchName = useMemo(
    () => branches.find((b) => b.is_default)?.name || branches.find((b) => b.name === "main")?.name || branches.find((b) => b.name === "master")?.name || "",
    [branches]
  );
  const editorRef = useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null);
  const selectionRef = useRef<import("monaco-editor").Selection | null>(null);

  const apiUrl = "/api/backend";
  const branchStorageKey = `repo:${repoId}:selectedBranch`;

  const createSession = useCallback(async () => {
    const response = await fetch(`${apiUrl}/repo/${repoId}/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_id: repoId, title: "New chat" }),
    });
    if (!response.ok) return null;
    const created = (await response.json()) as ChatSession;
    setSessions((prev) => [created, ...prev]);
    setActiveSessionId(created.id);
    setMessages([]);
    localStorage.setItem(`repo:${repoId}:activeSessionId`, created.id);
    return created;
  }, [apiUrl, repoId]);

  const renameChat = async (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    const newTitle = window.prompt("Enter new chat name:", session.title);
    if (!newTitle || newTitle === session.title) return;

    try {
      const response = await fetch(`${apiUrl}/repo/${repoId}/chats/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (response.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
        );
      }
    } catch (e) {
      console.error("Failed to rename chat:", e);
    }
  };

  const deleteChat = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to delete this chat?")) return;

    try {
      const response = await fetch(`${apiUrl}/repo/${repoId}/chats/${sessionId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          const remaining = sessions.filter((s) => s.id !== sessionId);
          if (remaining.length > 0) {
            setActiveSessionId(remaining[0].id);
          } else {
            createSession();
          }
        }
      }
    } catch (e) {
      console.error("Failed to delete chat:", e);
    }
  };

  useEffect(() => {
    async function loadSessions() {
      const response = await fetch(`${apiUrl}/repo/${repoId}/chats`);
      if (!response.ok) return;
      const data = (await response.json()) as ChatSession[];
      setSessions(data);
      if (data.length > 0) {
        const savedSessionId = localStorage.getItem(`repo:${repoId}:activeSessionId`);
        const targetSession = savedSessionId && data.some((item) => item.id === savedSessionId) ? savedSessionId : data[0].id;
        setActiveSessionId(targetSession);
      } else {
        await createSession();
      }
    }
    loadSessions();
  }, [apiUrl, createSession, repoId]);

  useEffect(() => {
    async function loadMessages() {
      if (!activeSessionId) return;
      const response = await fetch(`${apiUrl}/chats/${activeSessionId}/messages`);
      if (!response.ok) return;
      const data = (await response.json()) as Array<{ role: "user" | "assistant"; content: string; sources?: SourceReference[] }>;
      setMessages(data.map((item) => ({ role: item.role, content: item.content, sources: item.sources })));
    }
    loadMessages();
  }, [activeSessionId, apiUrl]);

  useEffect(() => {
    if (!activeSessionId) return;
    localStorage.setItem(`repo:${repoId}:activeSessionId`, activeSessionId);
  }, [activeSessionId, repoId]);

  // Fetch branches list once
  useEffect(() => {
    async function loadBranches() {
      try {
        setBranchLoadError("");
        const res = await fetch(`${apiUrl}/repo/${repoId}/branches`);
        if (!res.ok) {
          let detail = "Branch list unavailable";
          try {
            const payload = (await res.json()) as { detail?: string };
            if (payload?.detail) detail = payload.detail;
          } catch {
            // ignore json parsing errors
          }
          setBranchLoadError(detail);
          setBranches([]);
          return;
        }
        const data = (await res.json()) as BranchInfo[];
        setBranches(data);
        if (selectedBranch && !data.some((b) => b.name === selectedBranch)) {
          setSelectedBranch("");
          localStorage.removeItem(branchStorageKey);
        }
      } catch {
        // silent — branches are non-critical
      }
    }
    loadBranches();
  }, [apiUrl, repoId, selectedBranch, branchStorageKey]);

  // Load file tree whenever branch changes; auto-trigger indexing for unindexed branches
  useEffect(() => {
    let cancelled = false;

    async function loadFileTree() {
      setLoadingFiles(true);
      setBranchIndexMsg("");
      try {
        // For a non-default branch, check if that branch's files exist in code_chunks.
        // code_chunks are not branch-aware, so "indexed" just means default branch is indexed.
        // We always fetch from GitHub for specific branches; for default we use code_chunks.
        if (selectedBranch) {
          // Check whether default branch is indexed at all
          try {
            const statusRes = await fetch(`${apiUrl}/repo/${repoId}/index-status`);
            if (statusRes.ok) {
              const status = (await statusRes.json()) as { indexed: boolean; chunk_count: number };
              if (!status.indexed) {
                // Not indexed at all — trigger indexing in background
                setBranchIndexing(true);
                setBranchIndexMsg("Indexing branch in background…");
                await fetch(`${apiUrl}/repo/${repoId}/trigger-index`, { method: "POST" }).catch(() => null);
              }
            }
          } catch {
            // non-critical
          }
        }

        const effectiveBranch = selectedBranch || defaultBranchName;
        const branchParam = effectiveBranch ? `?branch=${encodeURIComponent(effectiveBranch)}` : "";
        const response = await fetch(`${apiUrl}/repo/${repoId}/files${branchParam}`);
        if (!response.ok || cancelled) {
          setBranchIndexMsg(`Unable to load ${effectiveBranch ? `branch \"${effectiveBranch}\"` : "files"}.`);
          return;
        }
        let data = (await response.json()) as FileNode;
        if (!effectiveBranch && countTreeFiles(data) < 5) {
          const retry = await fetch(`${apiUrl}/repo/${repoId}/files?fresh=true`);
          if (retry.ok) {
            data = (await retry.json()) as FileNode;
          }
        }
        if (!cancelled) {
          setFileTree(data);
          setBranchIndexMsg("");
        }
      } finally {
        if (!cancelled) {
          setLoadingFiles(false);
          setBranchIndexing(false);
        }
      }
    }

    loadFileTree();
    return () => { cancelled = true; };
  }, [apiUrl, repoId, selectedBranch, defaultBranchName]);

  useEffect(() => {
    setFileTree(null);
    setSelectedFilePath(null);
    setFileContent(null);
    setSelectedBranch("");
    setBranchIndexMsg("");
  }, [repoId]);

  const activeViewerPath = selectedSource?.file_path || selectedFilePath;

  // Load file content when selection changes
  useEffect(() => {
    if (!activeViewerPath) return;
    async function loadSelectedFile() {
      setLoadingFileContent(true);
      try {
        const branchParam = selectedBranch ? `?branch=${encodeURIComponent(selectedBranch)}` : "";
        const response = await fetch(`${apiUrl}/repo/${repoId}/files/${encodeURIComponent(activeViewerPath!)}${branchParam}`);
        if (!response.ok) return;
        const data = (await response.json()) as FileContent;
        setFileContent(data);
      } finally {
        setLoadingFileContent(false);
      }
    }
    loadSelectedFile();
  }, [activeViewerPath, apiUrl, repoId, selectedBranch]);

  // Poll for indexing status while branchIndexing is true
  const { refreshRepo } = useRepo();
  useEffect(() => {
    if (!branchIndexing) return;
    const interval = setInterval(async () => {
      try {
        const statusRes = await fetch(`${apiUrl}/repo/${repoId}/index-status`);
        if (statusRes.ok) {
          const status = (await statusRes.json()) as { indexed: boolean; last_job?: { status: string } };
          if (status.indexed && status.last_job?.status === "success") {
            setBranchIndexing(false);
            setBranchIndexMsg("Indexing complete!");
            await refreshRepo();
            setTimeout(() => setBranchIndexMsg(""), 3000);
          } else if (status.last_job?.status === "error") {
            setBranchIndexing(false);
            setBranchIndexMsg("Indexing failed.");
            setTimeout(() => setBranchIndexMsg(""), 3000);
          }
        }
      } catch {
        // silent
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [branchIndexing, apiUrl, repoId, refreshRepo]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!input.trim() || isLoading) return;

    if (input.trim() === "/clear") {
      if (!activeSessionId) return;
      try {
        const response = await fetch(`${apiUrl}/chats/${activeSessionId}/messages`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        setMessages([]);
        setSnippetChips([]);
        setInput("");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to clear chat";
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${errorMessage}` }]);
      }
      return;
    }

    const userMessage = input.trim();
    const snippetPayloads = await Promise.all(
      snippetChips.map(async (chip) => {
        if (chip.code.trim()) {
          return {
            label: `${chip.filePath}:${chip.startLine}-${chip.endLine}`,
            content: chip.code,
          };
        }

        if (chip.kind === "file") {
          try {
            const response = await fetch(`${apiUrl}/repo/${repoId}/files/${encodeURIComponent(chip.filePath)}`);
            if (!response.ok) {
              return { label: chip.filePath, content: `Unable to load file content (${response.status}).` };
            }
            const data = (await response.json()) as FileContent;
            return { label: chip.filePath, content: data.content || "(empty file)" };
          } catch {
            return { label: chip.filePath, content: "Unable to load file content." };
          }
        }

        if (chip.kind === "folder") {
          const filesUnderFolder: string[] = [];
          const walk = (node: FileNode | null) => {
            if (!node) return;
            if (node.type === "file" && node.path.startsWith(`${chip.filePath}/`)) {
              filesUnderFolder.push(node.path);
            }
            node.children?.forEach(walk);
          };
          walk(fileTree);

          const selectedFiles = filesUnderFolder.slice(0, 8);
          if (selectedFiles.length === 0) {
            return { label: chip.filePath, content: "Folder reference provided, but no files found." };
          }

          const folderChunks = await Promise.all(
            selectedFiles.map(async (path) => {
              try {
                const response = await fetch(`${apiUrl}/repo/${repoId}/files/${encodeURIComponent(path)}`);
                if (!response.ok) return `## ${path}\nUnable to load (${response.status}).`;
                const data = (await response.json()) as FileContent;
                const trimmed = data.content?.slice(0, 8000) || "";
                return `## ${path}\n${trimmed || "(empty file)"}`;
              } catch {
                return `## ${path}\nUnable to load file content.`;
              }
            })
          );

          return {
            label: chip.filePath,
            content: folderChunks.join("\n\n"),
          };
        }

        return {
          label: `${chip.filePath}:${chip.startLine}-${chip.endLine}`,
          content: "Reference provided without content.",
        };
      })
    );

    const snippetContext = snippetPayloads.length
      ? `\n\nReferenced snippets:\n${snippetPayloads
          .map((payload) => `- ${payload.label}\n\`\`\`\n${payload.content}\n\`\`\``)
          .join("\n")}`
      : "";
    const fullPrompt = `${userMessage}${snippetContext}`;
    const artifactsForMessage = snippetChips.map((chip) => ({ ...chip }));
    setInput("");
    setSnippetChips([]);
    setMessages((prev) => [...prev, { role: "user", content: userMessage, artifacts: artifactsForMessage }]);
    setIsLoading(true);

    let accumulatedContent = "";
    let accumulatedSources: SourceReference[] = [];
    let firstChunkReceived = false;

    try {
      if (!activeSessionId) return;
      const response = await fetch(`${apiUrl}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: fullPrompt,
          repo_id: repoId,
          thread_id: activeSessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split("\n\n");

        for (const eventChunk of events) {
          if (!eventChunk.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(eventChunk.slice(6)) as {
              type: string;
              content?: string;
              fallback?: boolean;
              sources?: SourceReference[];
              message?: string;
            };

            if (data.type === "chunk" && data.content) {
              if (!firstChunkReceived) {
                firstChunkReceived = true;
                setIsLoading(false);
              }

              accumulatedContent += data.content;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  role: "assistant",
                  content: accumulatedContent,
                  sources: accumulatedSources.length > 0 ? accumulatedSources : undefined,
                };
                return next;
              });
            } else if (data.type === "metadata" && data.fallback === true) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  next[next.length - 1] = {
                    ...last,
                    fallback: true,
                  };
                }
                return next;
              });
            } else if (data.type === "sources" && data.sources) {
              accumulatedSources = data.sources;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  role: "assistant",
                  content: accumulatedContent,
                  sources: accumulatedSources,
                };
                return next;
              });
            } else if (data.type === "done") {
              setIsLoading(false);
            } else if (data.type === "error") {
              throw new Error(data.message || "Streaming error occurred");
            }
          } catch {
            // Ignore malformed stream events and continue.
          }
        }
      }

      if (!firstChunkReceived) {
        setIsLoading(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setMessages((prev) => {
        const next = [...prev];
        const tail = next[next.length - 1];
        if (tail?.role === "assistant" && tail.content === "") {
          next.pop();
        }
        next.push({ role: "assistant", content: `Error: ${errorMessage}` });
        return next;
      });
      setIsLoading(false);
    }
  };

  const removeSnippetChip = (chipId: string) => {
    setSnippetChips((prev) => prev.filter((chip) => chip.id !== chipId));
  };

  const handleDropSnippet = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/x-devbridge-snippet") || event.dataTransfer.getData("application/x-devbridge-ref");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        kind?: "snippet" | "file" | "folder";
        filePath: string;
        startLine: number;
        endLine: number;
        code: string;
      };

      if (!parsed.filePath) return;
      const chip: SnippetChip = {
        id: `${parsed.filePath}:${parsed.startLine || 1}-${parsed.endLine || 1}:${Date.now()}`,
        filePath: parsed.filePath,
        startLine: parsed.startLine || 1,
        endLine: parsed.endLine || 1,
        code: parsed.code || "",
        kind: parsed.kind,
      };
      setSnippetChips((prev) => [...prev, chip]);
    } catch {
      // Ignore malformed drop payload.
    }
  };

  const addCurrentSelectionToChat = () => {
    if (!selectedFilePath || !editorRef.current || !selectionRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;
    const sel = selectionRef.current;
    if (sel.startLineNumber === sel.endLineNumber && sel.startColumn === sel.endColumn) return;
    const code = model.getValueInRange(sel);
    setSnippetChips((prev) => [
      ...prev,
      {
        id: `${selectedFilePath}:${sel.startLineNumber}-${sel.endLineNumber}:${Date.now()}`,
        filePath: selectedFilePath,
        startLine: sel.startLineNumber,
        endLine: sel.endLineNumber,
        code,
        kind: "snippet",
      },
    ]);
  };

  const openArtifact = (artifact: SnippetChip) => {
    setSelectedSource(null);

    if (artifact.kind === "folder") {
      setExpandedFolders((prev) => new Set(prev).add(artifact.filePath));
      const findFirstFile = (node: FileNode | null): string | null => {
        if (!node) return null;
        if (node.type === "file" && node.path.startsWith(`${artifact.filePath}/`)) return node.path;
        for (const child of node.children || []) {
          const found = findFirstFile(child);
          if (found) return found;
        }
        return null;
      };
      const firstFile = findFirstFile(fileTree);
      if (firstFile) setSelectedFilePath(firstFile);
      return;
    }

    setSelectedFilePath(artifact.filePath);
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
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
            JSON.stringify({ kind: "folder", filePath: node.path, startLine: 1, endLine: 1, code: "" }),
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

      return (
      <button
        key={node.path}
        type="button"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(
            "application/x-devbridge-ref",
            JSON.stringify({ kind: "file", filePath: node.path, startLine: 1, endLine: 1, code: "" }),
          );
        }}
        onClick={() => {
          setSelectedSource(null);
          setSelectedFilePath(node.path);
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--foreground-muted)] hover:bg-[var(--surface-2)]",
          selectedFilePath === node.path ? "bg-[var(--surface-3)] text-[var(--foreground)]" : "",
        )}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <Code2 className="size-3.5" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  };

  const selectedLanguage = useMemo(() => detectLanguage(activeViewerPath || "", fileContent?.language || "plaintext"), [activeViewerPath, fileContent?.language]);
  const editorTheme = resolvedTheme === "light" ? "vs" : "vs-dark";

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorSelection((event) => {
      selectionRef.current = event.selection;
    });
  };

  return (
    <div className="p-2 h-screen overflow-hidden">
      <ChatLayout 
        sidebar={
          <HistorySidebar 
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={setActiveSessionId}
            onCreateSession={createSession}
            onRenameSession={renameChat}
            onDeleteSession={deleteChat}
          />
        }
        chatArea={
          <div className="flex min-h-0 h-full flex-col overflow-hidden">
            <ChatStream 
              messages={messages} 
              isLoading={isLoading} 
              repoId={repoId} 
              onOpenArtifact={openArtifact}
              onSelectSource={setSelectedSource}
            />
            <ChatInput 
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              snippetChips={snippetChips}
              onRemoveSnippet={removeSnippetChip}
              onDropSnippet={handleDropSnippet}
              onSubmit={handleSubmit}
            />
          </div>
        }
        rightPanel={
          selectedSource || selectedFilePath ? (
            <div className="flex h-full min-h-0 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
              <div className="border-b border-[var(--border)] px-[var(--space-lg)] py-[var(--space-md)]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSource(null);
                    setSelectedFilePath(null);
                  }}
                  className="mb-2 inline-flex items-center gap-1 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                >
                  <ChevronLeft className="size-3.5" /> Back
                </button>
                <p className="text-[var(--text-xs)] font-medium uppercase tracking-[0.08em] text-[var(--foreground-subtle)]">{selectedSource ? "Cited Source" : "File Viewer"}</p>
                <p className="font-mono text-[var(--text-sm)] text-[var(--foreground)]">{activeViewerPath}</p>
                {selectedSource ? (
                  <p className="text-[var(--text-xs)] text-[var(--foreground-muted)]">
                    L{selectedSource.start_line}-L{selectedSource.end_line}
                    {selectedSource.function_name ? ` • ${selectedSource.function_name}` : ""}
                    {typeof selectedSource.similarity === "number" ? ` • ${Math.round(selectedSource.similarity * 100)}% match` : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-4 p-[var(--space-lg)]">
                <div className="h-full min-h-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                  {loadingFileContent ? (
                    <div className="h-full animate-pulse bg-[var(--surface-3)]" />
                  ) : (
                    <Editor
                      language={selectedLanguage}
                      value={fileContent?.content || ""}
                      onMount={handleEditorMount}
                      theme={editorTheme}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbersMinChars: 4,
                        wordWrap: "off",
                        automaticLayout: true,
                      }}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[var(--text-xs)] text-[var(--foreground-subtle)]">Select lines, then add snippet to chat.</p>
                  <Button type="button" variant="outline" size="sm" onClick={addCurrentSelectionToChat}>Add selection</Button>
                </div>
              </div>
            </div>
          ) : (
            <FileExplorer 
              fileTree={fileTree}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              loadingFiles={loadingFiles}
              selectedFilePath={selectedFilePath}
              onSelectFile={(path) => {
                setSelectedSource(null);
                setSelectedFilePath(path);
              }}
              branches={branches}
              selectedBranch={selectedBranch}
              setSelectedBranch={(b) => {
                setSelectedBranch(b);
                if (b) localStorage.setItem(branchStorageKey, b);
                else localStorage.removeItem(branchStorageKey);
              }}
              branchIndexMsg={branchIndexMsg}
              branchLoadError={branchLoadError}
              defaultBranchName={defaultBranchName}
            />
          )
        }
      />
    </div>
  );
}
