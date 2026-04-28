"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowUp, ChevronDown, ChevronRight, Clock3, Code2, Folder, GitBranch, PanelRightClose, StickyNote } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
}

type SnippetChip = {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  code: string;
};

type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

import { useRepo } from "@/contexts/repo-context";

export default function RepoWorkspacePage() {
  const params = useParams<{ id: string }>();
  const repoId = String(params.id ?? "");

  const { repo } = useRepo();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [snippetChips, setSnippetChips] = useState<SnippetChip[]>([]);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [selectedSource, setSelectedSource] = useState<SourceReference | null>(null);
  const [sidePanelTab, setSidePanelTab] = useState<"summary" | "files">("summary");
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [focusWhileTyping, setFocusWhileTyping] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isTyping = input.trim().length > 0;
  const hideSidePanel = focusWhileTyping && isTyping;

  useEffect(() => {
    if (repo && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Welcome to the workspace for **${repo.name}**. I am the DevBridge Agent. You can ask me to explain the architecture, trace data flows, or answer specific questions about this codebase.`,
      }]);
    }
  }, [repo, messages.length]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    async function loadFileTree() {
      if (sidePanelTab !== "files" || fileTree) return;
      setLoadingFiles(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const response = await fetch(`${apiUrl}/repo/${repoId}/files`);
        if (!response.ok) return;
        const data = await response.json();
        setFileTree(data as FileNode);
      } finally {
        setLoadingFiles(false);
      }
    }

    loadFileTree();
  }, [fileTree, repoId, sidePanelTab]);

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

    const userMessage = input.trim();
    const snippetContext = snippetChips.length
      ? `\n\nReferenced snippets:\n${snippetChips
          .map(
            (chip) => `- ${chip.filePath}:${chip.startLine}-${chip.endLine}\n\`\`\`\n${chip.code}\n\`\`\``
          )
          .join("\n")}`
      : "";
    const fullPrompt = `${userMessage}${snippetContext}`;
    setInput("");
    setSnippetChips([]);
    setMessages((prev) => [...prev, { role: "user", content: fullPrompt }]);
    setIsLoading(true);

    let accumulatedContent = "";
    let accumulatedSources: SourceReference[] = [];
    let firstChunkReceived = false;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: fullPrompt,
          repo_id: repoId,
          history: messages,
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
    const raw = event.dataTransfer.getData("application/x-devbridge-snippet");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        filePath: string;
        startLine: number;
        endLine: number;
        code: string;
      };

      if (!parsed.filePath || !parsed.code) return;
      const chip: SnippetChip = {
        id: `${parsed.filePath}:${parsed.startLine}-${parsed.endLine}:${Date.now()}`,
        filePath: parsed.filePath,
        startLine: parsed.startLine,
        endLine: parsed.endLine,
        code: parsed.code,
      };
      setSnippetChips((prev) => [...prev, chip]);
    } catch {
      // Ignore malformed drop payload.
    }
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
      <Link
        key={node.path}
        href={`/repo/${repoId}/files?path=${encodeURIComponent(node.path)}`}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--foreground-muted)] hover:bg-[var(--surface-2)]"
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <Code2 className="size-3.5" />
        <span className="truncate">{node.name}</span>
      </Link>
    );
  };

  return (
    <section className="flex min-h-0 flex-1 gap-0 px-2 py-2">
      <div className="flex min-h-0 flex-[3.5] flex-col rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-1)_88%,transparent)] p-2.5">
        <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1">
          <div className="space-y-[var(--space-md)]">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
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

        <form onSubmit={handleSubmit} className="mt-2.5 border-t border-[var(--border)] pt-2.5">
          <div className="mb-2 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setFocusWhileTyping((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                focusWhileTyping
                  ? "border-[var(--brand-muted)] bg-[var(--brand-muted)] text-[var(--brand)]"
                  : "border-[var(--border)] text-[var(--foreground-subtle)] hover:text-[var(--foreground)]"
              )}
              title="Temporarily hide side panel while typing"
            >
              <PanelRightClose className="size-3.5" />
              Focus while typing
            </button>
          </div>
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

      <aside className={cn("hidden min-h-0 flex-[1.7] pl-2.5 md:block", hideSidePanel ? "md:hidden" : "")}>
        {selectedSource ? (
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
            <div className="border-b border-[var(--border)] px-[var(--space-lg)] py-[var(--space-md)]">
              <p className="text-[var(--text-xs)] font-medium uppercase tracking-[0.08em] text-[var(--foreground-subtle)]">
                Cited Source
              </p>
              <p className="font-mono text-[var(--text-sm)] text-[var(--foreground)]">{selectedSource.file_path}</p>
              <p className="text-[var(--text-xs)] text-[var(--foreground-muted)]">
                L{selectedSource.start_line}-L{selectedSource.end_line}
                {selectedSource.function_name ? ` • ${selectedSource.function_name}` : ""}
                {typeof selectedSource.similarity === "number"
                  ? ` • ${Math.round(selectedSource.similarity * 100)}% match`
                  : ""}
              </p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-[var(--space-lg)]">
              <pre className="min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-3)] p-[var(--space-md)] font-mono text-[var(--text-code)] text-[var(--foreground-muted)]">
                <code>{"File preview panel placeholder. Monaco integration lives in files view."}</code>
              </pre>
              <div>
                <p className="text-[var(--text-xs)] font-medium uppercase tracking-[0.08em] text-[var(--foreground-subtle)]">
                  Annotation Context
                </p>
                <p className="pt-1 text-[var(--text-sm)] text-[var(--foreground-muted)]">
                  Annotation chips and discussion thread appear here for the selected source.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-1)_90%,transparent)] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[var(--text-h3)] font-semibold text-[var(--foreground)]">Repository Panel</p>
              <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1">
                <button
                  type="button"
                  onClick={() => setSidePanelTab("summary")}
                  className={cn("rounded-md px-2.5 py-1 text-xs", sidePanelTab === "summary" ? "bg-[var(--surface-3)] text-[var(--foreground)]" : "text-[var(--foreground-muted)]")}
                >
                  Summary
                </button>
                <button
                  type="button"
                  onClick={() => setSidePanelTab("files")}
                  className={cn("rounded-md px-2.5 py-1 text-xs", sidePanelTab === "files" ? "bg-[var(--surface-3)] text-[var(--foreground)]" : "text-[var(--foreground-muted)]")}
                >
                  Files
                </button>
              </div>
            </div>

            {sidePanelTab === "summary" ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <Code2 className="h-4 w-4 text-[var(--foreground-muted)]" />
                  <div>
                    <p className="text-[var(--text-xs)] text-[var(--foreground-subtle)]">Files</p>
                    <p className="text-[var(--text-h3)] font-semibold">{repo?.fileCount ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <StickyNote className="h-4 w-4 text-[var(--foreground-muted)]" />
                  <div>
                    <p className="text-[var(--text-xs)] text-[var(--foreground-subtle)]">Annotations</p>
                    <p className="text-[var(--text-h3)] font-semibold">{repo?.annotationCount ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <GitBranch className="h-4 w-4 text-[var(--foreground-muted)]" />
                  <div>
                    <p className="text-[var(--text-xs)] text-[var(--foreground-subtle)]">PRs</p>
                    <p className="text-[var(--text-h3)] font-semibold">{repo?.prCount ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <Clock3 className="h-4 w-4 text-[var(--foreground-muted)]" />
                  <div>
                    <p className="text-[var(--text-xs)] text-[var(--foreground-subtle)]">Last Indexed</p>
                    <p className="text-[var(--text-sm)] text-[var(--foreground-muted)]">
                      {repo?.lastIndexed ? new Date(repo.lastIndexed).toLocaleDateString() : "Never"}
                    </p>
                  </div>
                </div>
                <p className="pt-2 text-[var(--text-xs)] text-[var(--foreground-subtle)]">
                  Click source citation from chat to inspect it in this panel.
                </p>
              </div>
            ) : (
              <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2">
                {loadingFiles ? <p className="px-2 py-1 text-xs text-[var(--foreground-subtle)]">Loading files...</p> : null}
                {!loadingFiles && fileTree ? renderTreeNode(fileTree) : null}
                {!loadingFiles && !fileTree ? <p className="px-2 py-1 text-xs text-[var(--foreground-subtle)]">Files unavailable.</p> : null}
              </div>
            )}
          </div>
        )}
      </aside>
    </section>
  );
}
