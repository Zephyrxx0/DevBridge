"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Plus, Sun, Moon, MessageSquare, Network, Search, StickyNote, BookOpen, FileCog, House, Trash2 } from "lucide-react";
import { useRepo } from "@/contexts/repo-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sidebar, SidebarHeader, SidebarContent, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export type ChatSession = {
  id: string;
  title: string;
  updated_at: string;
  last_message?: string;
};

interface HistorySidebarProps {
  repoId: string;
  sessions: ChatSession[];
  activeSessionId: string;
  branchIndexing: boolean;
  branchIndexMsg: string;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onDeleteSession: (id: string) => void;
  onClearSession: (id: string) => void;
  onTriggerIndex: () => void;
  onRemoveRepo: () => void;
}

export function HistorySidebar({
  repoId,
  sessions,
  activeSessionId,
  branchIndexing,
  branchIndexMsg,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
  onClearSession,
  onTriggerIndex,
  onRemoveRepo,
}: HistorySidebarProps) {
  const { theme, setTheme } = useTheme();
  const { repo, loading } = useRepo();
  const { collapsed } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteDialogSessionId, setDeleteDialogSessionId] = useState<string | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const parseRepoIdentity = (value: string | undefined) => {
    if (!value) return { owner: "", repoName: "" };
    const cleaned = value.replace(/\.git$/i, "").trim();
    const match = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)/i);
    if (match) {
      return { owner: match[1], repoName: match[2] };
    }
    const pieces = cleaned.split("/").filter(Boolean);
    if (pieces.length >= 2) {
      return { owner: pieces[pieces.length - 2], repoName: pieces[pieces.length - 1] };
    }
    return { owner: "", repoName: repo?.name ?? "Repository" };
  };

  const { owner, repoName } = parseRepoIdentity(repo?.url);
  const headerOwner = owner || "username";
  const headerRepo = repoName || repo?.name || "repository";
  const [sidebarTab, setSidebarTab] = useState<"chat" | "utilities">("chat");
  const heroImageCandidates = owner && repoName
    ? [
        `https://github.com/${owner}.png?size=512`,
        `https://avatars.githubusercontent.com/${owner}?s=512`,
        `https://api.dicebear.com/9.x/identicon/svg?seed=${owner}`,
      ]
    : [];
  const heroImageUrl = heroImageCandidates[heroImageIndex] ?? null;
  const deleteDialogSession = sessions.find((session) => session.id === deleteDialogSessionId) ?? null;

  const startRenameSession = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title || "");
  };

  const cancelRenameSession = () => {
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const saveRenameSession = (session: ChatSession) => {
    const trimmedTitle = editingTitle.trim();
    const currentTitle = (session.title || "").trim();
    if (!trimmedTitle || trimmedTitle === currentTitle) {
      cancelRenameSession();
      return;
    }
    onRenameSession(session.id, trimmedTitle);
    cancelRenameSession();
  };

  return (
    <Sidebar className="border-r border-[var(--border)] bg-[var(--surface-1)]">
      <SidebarHeader className="relative flex flex-col items-stretch gap-0 border-b border-[var(--border)] p-0">
        <div
          className={cn("relative aspect-square w-full overflow-hidden", collapsed && "hidden")}
        >
          {heroImageUrl ? (
            <img
              src={heroImageUrl}
              alt={`${headerRepo} repository preview`}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => {
                setHeroImageIndex((prev) => prev + 1);
              }}
            />
          ) : null}
          {!heroImageUrl ? (
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface-2)] via-[var(--surface-3)] to-[var(--surface-1)]" />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 flex h-[115px] items-end bg-gradient-to-t from-[color-mix(in_oklab,var(--background)_86%,transparent)] via-[color-mix(in_oklab,var(--background)_52%,transparent)] to-transparent px-3 pb-2">
            <p className="whitespace-pre-line text-xl font-semibold leading-6 text-[var(--foreground)]">
              {loading ? "Loading..." : `${headerOwner}\n${headerRepo}`}
            </p>
          </div>
        </div>
        <div className={cn("absolute right-2 top-2 flex items-center justify-end gap-2", collapsed && "relative right-auto top-auto justify-center p-2")}>
          <SidebarTrigger className="h-9 w-9" />
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 space-y-2 overflow-x-hidden overflow-y-hidden p-2">
        <div className="mt-2 space-y-2">
          <div className={cn("grid rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1", collapsed ? "grid-cols-1" : "grid-cols-2")}>
            <button
              type="button"
              onClick={() => setSidebarTab("chat")}
              className={cn(
                "flex min-h-9 items-center justify-center gap-1.5 rounded-md text-xs font-semibold uppercase tracking-[0.08em]",
                sidebarTab === "chat" ? "bg-[var(--surface-3)] text-[var(--foreground)]" : "text-[var(--foreground-muted)] hover:bg-[var(--surface-3)]",
              )}
            >
              <MessageSquare className="size-3.5" />
              {!collapsed ? "Chat" : null}
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("utilities")}
              className={cn(
                "flex min-h-9 items-center justify-center gap-1.5 rounded-md text-xs font-semibold uppercase tracking-[0.08em]",
                sidebarTab === "utilities" ? "bg-[var(--surface-3)] text-[var(--foreground)]" : "text-[var(--foreground-muted)] hover:bg-[var(--surface-3)]",
              )}
            >
              <FileCog className="size-3.5" />
              {!collapsed ? "Utilities" : null}
            </button>
          </div>

          {sidebarTab === "chat" ? (
            <div className="space-y-1">
              <Button
                type="button"
                variant="outline"
                className={cn("mb-2 min-h-11 w-full justify-start gap-2", collapsed && "w-10 justify-center px-0")}
                onClick={onCreateSession}
                aria-label="New chat"
              >
                <Plus className="size-4" />
                {!collapsed ? "New chat" : null}
              </Button>

              {sessions.map((session) => (
                <ContextMenu key={session.id}>
                  <ContextMenuTrigger
                    className={cn(
                      "flex min-h-11 w-full cursor-context-menu items-center gap-2 rounded-md px-3 py-2 text-left text-[var(--text-label)] transition-colors",
                      activeSessionId === session.id
                        ? "bg-[var(--brand-muted)] text-[var(--brand)] font-medium"
                        : "text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectSession(session.id)}
                      className={cn("flex min-w-0 flex-1 items-center gap-2 text-left", collapsed && "justify-center")}
                    >
                      {!collapsed ? (
                        editingSessionId === session.id ? (
                          <input
                            value={editingTitle}
                            autoFocus
                            onChange={(event) => setEditingTitle(event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                            onBlur={() => saveRenameSession(session)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                saveRenameSession(session);
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                cancelRenameSession();
                              }
                            }}
                            className="w-full rounded border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-sm text-[var(--foreground)] outline-none ring-offset-0 focus:ring-1 focus:ring-[var(--brand)]"
                            aria-label="Rename chat session"
                          />
                        ) : (
                          <span className="truncate">{session.title || "New chat"}</span>
                        )
                      ) : null}
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => startRenameSession(session)}>Rename</ContextMenuItem>
                    <ContextMenuItem onClick={() => setDeleteDialogSessionId(session.id)} className="text-red-500">Delete</ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}

              {!sessions.length && !collapsed ? (
                <p className="px-2 py-4 text-center text-xs text-[var(--foreground-subtle)]">No chats yet.</p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1">
              <Link href={`/repo/${repoId}/map`} className={cn("flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]", collapsed && "justify-center px-0")}>
                <Network className="size-4 shrink-0" />
                {!collapsed ? <span className="truncate text-[var(--text-label)]">Map</span> : null}
              </Link>
              <Link href={`/repo/${repoId}/search`} className={cn("flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]", collapsed && "justify-center px-0")}>
                <Search className="size-4 shrink-0" />
                {!collapsed ? <span className="truncate text-[var(--text-label)]">Search</span> : null}
              </Link>
              <Link href={`/repo/${repoId}/annotations`} className={cn("flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]", collapsed && "justify-center px-0")}>
                <StickyNote className="size-4 shrink-0" />
                {!collapsed ? <span className="truncate text-[var(--text-label)]">Annotations</span> : null}
              </Link>
              <Link href={`/repo/${repoId}/notes`} className={cn("flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]", collapsed && "justify-center px-0")}>
                <BookOpen className="size-4 shrink-0" />
                {!collapsed ? <span className="truncate text-[var(--text-label)]">Notes</span> : null}
              </Link>

              <div className="my-2 border-t border-[var(--border)]" />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn("min-h-11 w-full justify-start gap-2", collapsed && "w-10 justify-center px-0")}
                onClick={onTriggerIndex}
                disabled={branchIndexing}
              >
                <FileCog className="size-4" />
                {!collapsed ? (branchIndexing ? "Indexing files..." : "Index files") : null}
              </Button>
              {!collapsed && branchIndexMsg ? <p className="px-2 text-[10px] text-[var(--foreground-subtle)]">{branchIndexMsg}</p> : null}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn("min-h-11 w-full justify-start gap-2 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30 dark:hover:text-amber-200", collapsed && "w-10 justify-center px-0")}
                onClick={() => setClearDialogOpen(true)}
                disabled={!activeSessionId}
              >
                <Trash2 className="size-4" />
                {!collapsed ? "Clear active chat" : null}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn("min-h-11 w-full justify-start gap-2", collapsed && "w-10 justify-center px-0")}
                aria-label="Toggle theme"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              >
                {mounted && theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                {!collapsed ? (mounted && theme === "light" ? "Dark mode" : "Light mode") : null}
              </Button>

              <Link href="/" className={cn("flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]", collapsed && "justify-center px-0")}>
                <House className="size-4 shrink-0" />
                {!collapsed ? <span className="truncate text-[var(--text-label)]">Back to home</span> : null}
              </Link>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn("min-h-11 w-full justify-start gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300", collapsed && "w-10 justify-center px-0")}
                onClick={onRemoveRepo}
              >
                <Trash2 className="size-4" />
                {!collapsed ? "Remove from Workspace" : null}
              </Button>
            </div>
          )}
        </div>
      </SidebarContent>

      <Dialog open={Boolean(deleteDialogSession)} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialogSessionId(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chat session?</DialogTitle>
            <DialogDescription>
              This will permanently delete <span className="font-medium text-foreground">{deleteDialogSession?.title || "New chat"}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogSessionId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!deleteDialogSessionId) return;
                onDeleteSession(deleteDialogSessionId);
                setDeleteDialogSessionId(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear active chat?</DialogTitle>
            <DialogDescription>
              This will remove all messages in current session. Session shell remains.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setClearDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!activeSessionId) return;
                onClearSession(activeSessionId);
                setClearDialogOpen(false);
              }}
            >
              Clear chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
