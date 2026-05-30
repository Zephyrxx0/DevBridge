"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { ChatShell } from "@/components/chat/ChatShell";
import { useRepo } from "@/contexts/repo-context";

export default function RepoWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const repoId = String(params.id ?? "");

  const { repo, error: repoError, loading: repoLoading } = useRepo();

  useEffect(() => {
    if (repoLoading) return;
    if (!repoError) return;
    router.replace("/dashboard");
  }, [repoError, repoLoading, router]);

  return <ChatShell repoId={repoId} repo={repo} apiUrl="/api/backend" />;
}
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

  const loadPromptReferences = useCallback(async (chips: SnippetChip[]): Promise<PromptLoadedReference[]> => {
    return Promise.all(
      chips.map(async (chip) => {
        if (chip.kind === "snippet") {
          if (chip.code.trim()) {
            return {
              kind: "snippet",
              label: `${chip.filePath}:${chip.startLine}-${chip.endLine}`,
              content: chip.code,
            };
          }

          return {
            kind: "snippet",
            label: `${chip.filePath}:${chip.startLine}-${chip.endLine}`,
            content: "Reference provided without content.",
          };
        }

        if (chip.kind === "file") {
          try {
            const response = await fetch(`${apiUrl}/repo/${repoId}/files/${encodeURIComponent(chip.filePath)}`);
            if (!response.ok) {
              return {
                kind: "file",
                label: chip.filePath,
                content: `Unable to load file content (${response.status}).`,
              };
            }
            const data = (await response.json()) as FileContent;
            return {
              kind: "file",
              label: chip.filePath,
              content: data.content || "(empty file)",
            };
          } catch {
            return {
              kind: "file",
              label: chip.filePath,
              content: "Unable to load file content.",
            };
          }
        }

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
          return {
            kind: "folder",
            label: chip.filePath,
            content: "Folder reference provided, but no files found.",
          };
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
          kind: "folder",
          label: chip.filePath,
          content: folderChunks.join("\n\n"),
        };
      })
    );
  }, [apiUrl, fileTree, repoId]);

  const handleSubmit = async ({ text }: { text: string }) => {
    if (!text.trim() || isLoading) return;

    if (text.trim() === "/clear") {
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

    const loadedReferences = await loadPromptReferences(snippetChips);
    const promptContext = buildPromptContext({
      text,
      chips: snippetChips,
      loadedReferences,
    });

    setInput("");
    setSnippetChips([]);
    setMessages((prev) => [...prev, { role: "user", content: promptContext.displayMessage, artifacts: promptContext.artifacts }]);
    setIsLoading(true);

    let accumulatedContent = "";
    let accumulatedSources: SourceReference[] = [];
    let firstChunkReceived = false;

    try {
      if (!activeSessionId) return;
      const controller = new AbortController();
      streamAbortRef.current = controller;
      const response = await fetch(`${apiUrl}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(createChatStreamPayload({
          promptContext,
          repoId,
          threadId: activeSessionId,
        })),
      });

      if (!response.ok) {
        let detail = "";
        try {
          const errPayload = (await response.json()) as { detail?: string };
          detail = typeof errPayload?.detail === "string" ? errPayload.detail : "";
        } catch {
          // Ignore non-JSON error payloads.
        }

        if (response.status === 401) {
          if (detail) {
            throw new Error(`Unauthorized: ${detail}`);
          }
          throw new Error("Unauthorized: Authentication required.");
        }

        if (detail) {
          throw new Error(`Server error: ${response.status} (${detail})`);
        }

        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let streamBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const events = streamBuffer.split("\n\n");
        streamBuffer = events.pop() ?? "";

        for (const eventChunk of events) {
          if (!eventChunk.startsWith("data: ")) continue;

          let data: {
            type: string;
            content?: string;
            fallback?: boolean;
            model_used?: string;
            cascaded?: boolean;
            sources?: SourceReference[];
            message?: string;
          };

          try {
            data = JSON.parse(eventChunk.slice(6));
          } catch {
            // Ignore malformed stream events and continue.
            continue;
          }

          if (data.type === "chunk" && data.content) {
            if (!firstChunkReceived) {
              firstChunkReceived = true;
              setIsLoading(false);
            }

            accumulatedContent += data.content;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = {
                ...last,
                role: "assistant",
                content: accumulatedContent,
                sources: accumulatedSources.length > 0 ? accumulatedSources : undefined,
              };
              return next;
            });
          } else if (data.type === "metadata") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = {
                  ...last,
                  fallback: data.fallback ?? last.fallback,
                  model_used: data.model_used ?? last.model_used,
                  cascaded: data.cascaded ?? last.cascaded,
                };
              }
              return next;
            });
          } else if (data.type === "sources" && data.sources) {
            accumulatedSources = data.sources;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = {
                ...last,
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
        }
      }

      if (!firstChunkReceived) {
        setIsLoading(false);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setIsLoading(false);
        return;
      }
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
    } finally {
      streamAbortRef.current = null;
    }
  };

  const stopGenerating = () => {
    streamAbortRef.current?.abort();
    setIsLoading(false);
  };

  const removeSnippetChip = (chipId: string) => {
    setSnippetChips((prev) => prev.filter((chip) => chip.id !== chipId));
  };

  const handleDropSnippet = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/x-devbridge-snippet") || event.dataTransfer.getData("application/x-devbridge-ref");
    if (!raw) return;

    const chip = parseDroppedContextChip(raw);
    if (!chip) return;
    if (chip.kind === "snippet" || chip.kind === "file" || chip.kind === "folder") {
      setSnippetChips((prev) => [...prev, chip]);
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
          "flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[var(--text-label)] text-[var(--foreground-muted)] hover:bg-[var(--surface-2)]",
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

  const handleOnboardingComplete = useCallback((_plan: OnboardingPlan) => {
    setMessages((prev) => {
      if (prev.some((m) => m.role === "assistant" && m.content === "__DEVBRIDGE_ONBOARDING_READY__")) {
        return prev;
      }
      return [
        ...prev,
        {
          role: "assistant",
          content: "__DEVBRIDGE_ONBOARDING_READY__",
        },
      ];
    });
  }, []);

  const triggerIndexFiles = useCallback(async () => {
    try {
      setBranchIndexing(true);
      setBranchIndexMsg("Indexing branch in background...");
      const response = await fetch(`${apiUrl}/repo/${repoId}/trigger-index`, { method: "POST" });
      if (!response.ok) {
        setBranchIndexing(false);
        setBranchIndexMsg("Failed to trigger indexing.");
        setTimeout(() => setBranchIndexMsg(""), 3000);
      }
    } catch {
      setBranchIndexing(false);
      setBranchIndexMsg("Failed to trigger indexing.");
      setTimeout(() => setBranchIndexMsg(""), 3000);
    }
  }, [apiUrl, repoId]);

  const removeRepoFromWorkspace = useCallback(async () => {
    const confirmed = window.confirm("Remove this repository from workspace? This deletes stored index and chats.");
    if (!confirmed) return;

    try {
      const response = await fetch(`${apiUrl}/repo/${repoId}`, { method: "DELETE" });
      if (!response.ok) {
        window.alert("Failed to remove repository from workspace.");
        return;
      }
      localStorage.removeItem(`repo:${repoId}:activeSessionId`);
      localStorage.removeItem(`repo:${repoId}:selectedBranch`);
      window.location.assign(`/dashboard?removed=${encodeURIComponent(repoId)}`);
    } catch {
      window.alert("Failed to remove repository from workspace.");
    }
  }, [apiUrl, repoId, router]);

  return (
    <div className="h-dvh w-full overflow-hidden p-0">
      <ChatLayout 
        sidebar={
          <HistorySidebar 
            repoId={repoId}
            sessions={sessions}
            activeSessionId={activeSessionId}
            branchIndexing={branchIndexing}
            branchIndexMsg={branchIndexMsg}
            onSelectSession={setActiveSessionId}
            onCreateSession={createSession}
            onRenameSession={renameChat}
            onDeleteSession={deleteChat}
            onTriggerIndex={triggerIndexFiles}
            onRemoveRepo={removeRepoFromWorkspace}
          />
        }
        chatArea={
          <div className="flex min-h-0 h-full flex-col overflow-hidden">
            <ChatStream 
              messages={messages} 
              isLoading={isLoading} 
              isInitializing={loadingSessions || loadingMessages}
              repoId={repoId} 
              onOpenArtifact={openArtifact}
              onSelectSource={setSelectedSource}
              onOnboardingComplete={handleOnboardingComplete}
            />
            <ChatInput
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              snippetChips={snippetChips}
              onRemoveSnippet={removeSnippetChip}
              onDropSnippet={handleDropSnippet}
              onSubmit={handleSubmit}
              onStopGenerating={stopGenerating}
              fileTree={fileTree}
            />
          </div>
        }
        rightPanel={
          selectedSource || selectedFilePath ? (
            <>
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
            </>
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
=======
  return <ChatShell repoId={repoId} repo={repo} apiUrl="/api/backend" />;
>>>>>>> phase-34-chat-shell-session-boundaries
}
