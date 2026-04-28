"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Editor, { OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Code2, Folder, GitBranch, Plus, Sun, Moon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

type SourceReference = {
  file_path: string;
  function_name?: string;
  start_line: number;
  end_line: number;
  similarity?: number;
};

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: SourceReference[];
  artifacts?: SnippetChip[];
}

type ChatSession = {
  id: string;
  title: string;
  updated_at: string;
  last_message?: string;
};

type SnippetChip = {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  code: string;
  kind?: "snippet" | "file" | "folder";
};

type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

type FileContent = {
  content: string;
  language: string;
  line_count: number;
};

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
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [selectedSource, setSelectedSource] = useState<SourceReference | null>(null);

  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loadingFileContent, setLoadingFileContent] = useState(false);
  const [branches, setBranches] = useState<{ name: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [branchIndexing, setBranchIndexing] = useState(false);
  const [branchIndexMsg, setBranchIndexMsg] = useState("");
  const editorRef = useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null);
  const selectionRef = useRef<import("monaco-editor").Selection | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const apiUrl = "/api/backend";

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

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Fetch branches list once
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch(`${apiUrl}/repo/${repoId}/branches`);
        if (!res.ok) return;
        const data = (await res.json()) as { name: string }[];
        setBranches(data);
      } catch {
        // silent — branches are non-critical
      }
    }
    loadBranches();
  }, [apiUrl, repoId]);

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

        const branchParam = selectedBranch ? `?branch=${encodeURIComponent(selectedBranch)}` : "";
        const response = await fetch(`${apiUrl}/repo/${repoId}/files${branchParam}`);
        if (!response.ok || cancelled) return;
        const data = await response.json();
        if (!cancelled) setFileTree(data as FileNode);
      } finally {
        if (!cancelled) {
          setLoadingFiles(false);
          setBranchIndexing(false);
        }
      }
    }

    loadFileTree();
    return () => { cancelled = true; };
  }, [apiUrl, repoId, selectedBranch]);

  useEffect(() => {
    setFileTree(null);
    setSelectedFilePath(null);
    setFileContent(null);
    setSelectedBranch("");
    setBranches([]);
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

  const toggleSourceSection = (messageIndex: number) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(messageIndex)) {
        next.delete(messageIndex);
      } else {
        next.add(messageIndex);
      }
      return next;
    });
  };

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
    <section className="flex h-[calc(100vh-1rem)] min-h-0 flex-1 gap-0 overflow-hidden px-2 py-2">
      <div className="flex min-h-0 h-full flex-[3.5] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-1)_88%,transparent)] p-2.5">
        <div className="mb-2 shrink-0 flex items-center gap-2 overflow-x-auto border-b border-[var(--border)] pb-2 relative">
          <Button type="button" variant="outline" size="sm" onClick={() => void createSession()}>
            <Plus className="size-4" />
            New Chat
          </Button>
          {sessions.map((session) => (
            <ContextMenu key={session.id}>
              <ContextMenuTrigger className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs cursor-context-menu", activeSessionId === session.id ? "border-[var(--brand)] bg-[var(--brand-muted)] text-[var(--brand)]" : "border-[var(--border)] text-[var(--foreground-muted)]")}>
                <button type="button" onClick={() => setActiveSessionId(session.id)} className="max-w-[220px] truncate cursor-default">{session.title || "New chat"}</button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => renameChat(session.id)}>Rename</ContextMenuItem>
                <ContextMenuItem onClick={() => deleteChat(session.id)} className="text-red-500">Delete</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
          <div className="ml-auto pr-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="h-9 w-9 border border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
            >
              <Sun className="hidden size-4 dark:block" />
              <Moon className="block size-4 dark:hidden" />
            </Button>
          </div>
        </div>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-[var(--space-md)]">
            {messages.length === 0 && !isLoading ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
                <Avatar className="h-16 w-16 mb-4">
                  <AvatarFallback className="bg-[var(--brand-muted)] text-[var(--brand)] text-xl">DB</AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  Welcome to {repo?.name || "your repository"}
                </h2>
                <p className="mt-2 max-w-md text-sm text-[var(--foreground-muted)]">
                  I&apos;m your DevBridge AI assistant. {repo?.description ? repo.description : "I'm ready to help you understand, navigate, and build upon this codebase."}
                </p>
                <div className="mt-8 flex flex-col gap-2 w-full max-w-sm">
                  {repo?.lastIndexed ? (
                    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
                      <span className="text-[var(--foreground-subtle)]">Last Indexed</span>
                      <span className="font-medium text-[var(--foreground)]">{new Date(repo.lastIndexed).toLocaleDateString()}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm">
                      <span className="text-yellow-600/70 dark:text-yellow-400/70">Index Status</span>
                      <span className="font-medium text-yellow-600 dark:text-yellow-400">Not Indexed</span>
                    </div>
                  )}
                  {repo?.url ? (
                    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
                      <span className="text-[var(--foreground-subtle)]">Repository URL</span>
                      <a href={repo.url} target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--brand)] hover:underline truncate max-w-[180px]">{repo.url}</a>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              if (!isUser && message.content.trim() === "") return null;
              const hasSources = !isUser && Boolean(message.sources?.length);
              const isSourceOpen = expandedSources.has(index);

              return (
                <div key={`${message.role}-${index}`} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                  <div className={cn("flex max-w-[74%] gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
                    <Avatar className="mt-1 shrink-0">
                      <AvatarFallback className={cn(isUser ? "bg-[var(--surface-3)]" : "bg-[var(--brand-muted)] text-[var(--brand)]")}>
                        {isUser ? "U" : "DB"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div
                        className={cn(
                           "rounded-xl border px-4 py-3 text-[var(--text-body)] leading-[1.62]",
                          isUser
                            ? "border-[var(--border)] bg-[var(--surface-3)] text-[var(--foreground)]"
                            : "border-[var(--brand-muted)] bg-[var(--surface-1)] text-[var(--foreground)]"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>

                      {isUser && message.artifacts?.length ? (
                        <div className="pt-2">
                          <div className="flex flex-wrap gap-2">
                            {message.artifacts.map((artifact) => (
                              <button
                                type="button"
                                key={artifact.id}
                                onClick={() => openArtifact(artifact)}
                                className="rounded-md border border-[var(--brand-muted)] bg-[var(--brand-muted)] px-2 py-1 font-mono text-[var(--text-xs)] text-[var(--brand)] hover:opacity-90"
                              >
                                {artifact.kind === "folder" ? "Folder" : artifact.kind === "file" ? "File" : "Snippet"}: {artifact.filePath}
                                {artifact.kind === "snippet" ? `:${artifact.startLine}-${artifact.endLine}` : ""}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {hasSources ? (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => toggleSourceSection(index)}
                            className="inline-flex items-center gap-1 text-(length:--text-xs) font-medium tracking-[0.08em] uppercase text-(--foreground-subtle) hover:text-(--foreground-muted)"
                          >
                            {isSourceOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                            Sources ({message.sources?.length})
                          </button>

                          {isSourceOpen ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.sources?.map((source, sourceIndex) => (
                                <button
                                  type="button"
                                  key={`${source.file_path}-${sourceIndex}`}
                                  onClick={() => setSelectedSource(source)}
                                  className="rounded-md border border-border bg-(--surface-2) px-2 py-1 font-mono text-(length:--text-xs) text-(--foreground-muted) transition-colors hover:border-(--brand-muted) hover:text-(--brand)"
                                >
                                  {source.file_path}:{source.start_line}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-[var(--brand-muted)] text-[var(--brand)]">DB</AvatarFallback>
                  </Avatar>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-[var(--space-lg)] py-[var(--space-md)]">
                    <div className="flex gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--brand)] [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--brand)] [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--brand)] [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-2.5 shrink-0 border-t border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-1)_92%,transparent)] pt-2.5">
          <div
            className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-1)_94%,transparent)] p-2"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropSnippet}
          >
            {snippetChips.length > 0 ? (
              <div className="flex flex-wrap gap-2 px-1">
                {snippetChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => removeSnippetChip(chip.id)}
                    className="rounded-full border border-[var(--brand-muted)] bg-[var(--brand-muted)] px-3 py-1 text-[var(--text-xs)] text-[var(--brand)]"
                    title="Click to remove snippet"
                  >
                    {chip.filePath}:{chip.startLine}-{chip.endLine}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex items-center gap-[var(--space-sm)]">
              <Input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={isLoading}
                placeholder="Ask about your code or drop snippet here..."
                className="h-11 border-transparent bg-transparent focus-visible:border-transparent focus-visible:ring-0"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <ArrowUp className="size-4" />
              </Button>
            </div>
          </div>
        </form>
      </div>

      <aside className="hidden min-h-0 h-full flex-[1.7] overflow-hidden pl-2.5 md:flex md:flex-col">
        {selectedSource || selectedFilePath ? (
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
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-1)_90%,transparent)] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-[var(--foreground-subtle)]" />
                <p className="text-[var(--text-h3)] font-semibold text-[var(--foreground)]">Files</p>
              </div>
              {branches.length > 0 ? (
                <div className="relative">
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      setSelectedBranch(e.target.value);
                      setFileTree(null);
                    }}
                    className="appearance-none rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 pr-6 text-[10px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] cursor-pointer"
                  >
                    <option value="">default</option>
                    {branches.map((b) => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--foreground-subtle)]" />
                </div>
              ) : (
                <p className="text-[10px] text-[var(--foreground-subtle)]">Drag files into chat</p>
              )}
            </div>

            {branchIndexMsg ? (
              <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[var(--foreground-subtle)]">
                <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-[var(--brand)]" />
                {branchIndexMsg}
              </p>
            ) : null}

            <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2">
              {loadingFiles ? <p className="px-2 py-1 text-xs text-[var(--foreground-subtle)]">Loading files…</p> : null}
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
        )}
      </aside>
    </section>
  );
}
