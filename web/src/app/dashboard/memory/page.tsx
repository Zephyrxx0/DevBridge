"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/sheet";
import { Textarea } from "@/components/ui/textarea";

import { Skeleton } from "@/components/ui/skeleton";

type AccessState = "loading" | "ready" | "denied" | "error";

type Memory = {
  id: string;
  text: string;
  metadata: {
    type?: string;
    tags?: string[];
    reflect?: boolean;
  };
  created_at: string;
};

const TRUNCATE_AT = 200;

export default function MemoryDashboardPage() {
  const [state, setState] = useState<AccessState>("loading");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function loadMemories() {
      setState("loading");
      try {
        const response = await fetch("/api/backend/memory/list");
        if (cancelled) return;

        if (response.status === 401 || response.status === 403) {
          setState("denied");
          return;
        }
        if (!response.ok) {
          setState("error");
          return;
        }

        const payload = (await response.json()) as { memories?: Partial<Memory>[] };
        const nextMemories = (payload.memories ?? []).map((item) => ({
          id: String(item.id ?? ""),
          text: String(item.text ?? ""),
          metadata: {
            type: item.metadata?.type,
            tags: item.metadata?.tags ?? [],
            reflect: Boolean(item.metadata?.reflect),
          },
          created_at: String(item.created_at ?? ""),
        }));
        setMemories(nextMemories.filter((item) => item.id));
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    void loadMemories();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this memory?")) {
      return;
    }

    const prevMemories = memories;
    setMemories((curr) => curr.filter((memory) => memory.id !== id));
    setStatusMessage("Memory deleted");

    const response = await fetch(`/api/backend/memory/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setMemories(prevMemories);
      setStatusMessage("Delete failed");
    }
  };

  const openEditor = (memory: Memory) => {
    setEditingMemoryId(memory.id);
    setEditingText(memory.text);
  };

  const closeEditor = () => {
    setEditingMemoryId(null);
    setEditingText("");
  };

  const handleSaveEdit = async () => {
    if (!editingMemoryId) return;
    const nextText = editingText.trim();
    if (!nextText) {
      setStatusMessage("Edit failed");
      return;
    }

    const response = await fetch(`/api/backend/memory/${editingMemoryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: nextText }),
    });

    if (!response.ok) {
      setStatusMessage("Edit failed");
      return;
    }

    setMemories((curr) => curr.map((item) => (item.id === editingMemoryId ? { ...item, text: nextText } : item)));
    setStatusMessage("Memory updated");
    closeEditor();
  };

  const memoryCountLabel = useMemo(() => {
    if (state === "loading") return "Loading";
    if (state === "denied") return "Access Denied";
    return `${memories.length} Memories`;
  }, [memories.length, state]);

  return (
    <div className="pb-12">
      <section className="rounded-3xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-1)_72%,transparent)] p-6 shadow-xl backdrop-blur-2xl md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">Memory Dashboard</p>
            <h1 className="font-heading text-5xl font-semibold">Memory Curation</h1>
          </div>
          <Badge variant="secondary">{memoryCountLabel}</Badge>
        </div>

        {statusMessage ? <p className="mt-4 text-sm text-[var(--foreground-subtle)]">{statusMessage}</p> : null}

        {state === "loading" ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} data-testid="memory-skeleton" className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
                <Skeleton className="mb-4 h-5 w-24" />
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="mb-2 h-4 w-[90%]" />
                <Skeleton className="h-4 w-[70%]" />
              </div>
            ))}
          </div>
        ) : null}

        {state === "denied" ? (
          <Card className="mt-6">
            <CardHeader>Access denied</CardHeader>
            <CardContent>Missing permissions for memory dashboard.</CardContent>
          </Card>
        ) : null}

        {state === "error" ? (
          <Card className="mt-6">
            <CardHeader>Load failed</CardHeader>
            <CardContent>Could not load memory data.</CardContent>
          </Card>
        ) : null}

        {state === "ready" ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {memories.map((memory) => {
              const text = memory.text || "";
              const isLong = text.length > TRUNCATE_AT;
              const isExpanded = Boolean(expanded[memory.id]);
              const content = isLong && !isExpanded ? `${text.slice(0, TRUNCATE_AT)}...` : text;
              const memoryType = memory.metadata.type ?? "unknown";
              const reflect = memory.metadata.reflect || memory.metadata.tags?.includes("reflect");

              return (
                <Card key={memory.id} data-testid="memory-card">
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <Badge variant="outline">type: {memoryType}</Badge>
                    {reflect ? <Badge variant="secondary">Reflect</Badge> : null}
                  </CardHeader>
                  <CardContent>
                    <p data-testid="memory-text" className="text-sm leading-6 text-foreground">{content}</p>
                    {isLong ? (
                      <Button type="button" variant="ghost" className="mt-2 px-0" onClick={() => toggleExpanded(memory.id)}>
                        {isExpanded ? "Show Less" : "Show More"}
                      </Button>
                    ) : null}
                  </CardContent>
                  <CardFooter className="flex items-center justify-between gap-2 text-xs text-[var(--foreground-subtle)]">
                    <span>{memory.created_at ? new Date(memory.created_at).toLocaleString() : "Unknown time"}</span>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="secondary" size="sm" data-testid={`edit-${memory.id}`} onClick={() => openEditor(memory)}>
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        data-testid={`delete-${memory.id}`}
                        onClick={() => {
                          void handleDelete(memory.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : null}

        <Sheet open={Boolean(editingMemoryId)} onOpenChange={(open) => (open ? null : closeEditor())}>
          <SheetContent side="right" className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Edit Memory</SheetTitle>
              <SheetDescription>Update stored memory text.</SheetDescription>
            </SheetHeader>
            <div className="p-4">
              <Textarea
                data-testid="memory-edit-textarea"
                value={editingText}
                onChange={(event) => setEditingText(event.target.value)}
                rows={10}
              />
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={closeEditor}>Cancel</Button>
              <Button type="button" data-testid="memory-edit-save" onClick={() => void handleSaveEdit()}>Save</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </section>
    </div>
  );
}
