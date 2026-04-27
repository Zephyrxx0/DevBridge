"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowUp, ChevronDown, ChevronRight, Clock3, Code2, GitBranch, StickyNote } from "lucide-react";

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

interface RepoMetadata {
  id: string;
  name: string;
  lastIndexed?: string;
  fileCount?: number;
  annotationCount?: number;
  prCount?: number;
}

const INITIAL_ASSISTANT_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hello. I am DevBridge Orchestrator. Ask about architecture, trace data flow, or inspect code intent with cited sources.",
};

export default function RepoWorkspacePage() {
  const params = useParams<{ id: string }>();
  const repoId = String(params.id ?? "");

  const [repo, setRepo] = useState<RepoMetadata | null>(null);
  const [messages, setMessages] = useState<Message[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [selectedSource, setSelectedSource] = useState<SourceReference | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!repoId) return;

    const fetchRepoMetadata = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const response = await fetch(`${apiUrl}/repo/${repoId}`);
        if (response.ok) {
          setRepo((await response.json()) as RepoMetadata);
        }
      } catch {
        setRepo(null);
      }
    };

    void fetchRepoMetadata();
  }, [repoId]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

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
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
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
          query: userMessage,
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

  return (
    <section className="flex min-h-0 flex-1 gap-[var(--space-lg)] p-[var(--space-lg)]">
      <div className="flex min-h-0 flex-[3] flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1">
          <div className="space-y-[var(--space-md)]">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              const hasSources = !isUser && Boolean(message.sources?.length);
              const isSourceOpen = expandedSources.has(index);

              return (
                <div key={`${message.role}-${index}`} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                  <div className={cn("flex max-w-[80%] gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
                    <Avatar className="mt-1 shrink-0">
                      <AvatarFallback className={cn(isUser ? "bg-[var(--surface-3)]" : "bg-[var(--brand-muted)] text-[var(--brand)]") }>
                        {isUser ? "U" : "DB"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div
                        className={cn(
                          "rounded-xl border px-[var(--space-lg)] py-[var(--space-md)] text-[var(--text-body)] leading-[1.65]",
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

        <form onSubmit={handleSubmit} className="mt-[var(--space-md)] border-t border-[var(--border)] pt-[var(--space-md)]">
          <div className="flex items-center gap-[var(--space-sm)] rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-[var(--space-sm)]">
            <Input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isLoading}
              placeholder="Ask about your code..."
              className="h-11 border-transparent bg-transparent focus-visible:border-transparent focus-visible:ring-0"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </form>
      </div>

      <aside className="hidden min-h-0 flex-[2] md:block">
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
                  <code>// File preview panel placeholder. Monaco integration lives in files view.</code>
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
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-[var(--space-lg)]">
            <p className="text-[var(--text-h3)] font-semibold text-[var(--foreground)]">Repository Summary</p>
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
                Click a source citation from chat to inspect it in this panel.
              </p>
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}
