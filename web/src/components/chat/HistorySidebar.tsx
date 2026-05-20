"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Plus, Sun, Moon, MessageSquare, Network, Search, StickyNote, BookOpen } from "lucide-react";
import { useRepo } from "@/contexts/repo-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

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
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onRenameSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export function HistorySidebar({
  repoId,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
}: HistorySidebarProps) {
  const { theme, setTheme } = useTheme();
  const { repo, loading } = useRepo();
  const { collapsed } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [heroImageIndex, setHeroImageIndex] = useState(0);

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
  const heroImageCandidates = owner && repoName
    ? [
        `https://github.com/${owner}.png?size=512`,
        `https://avatars.githubusercontent.com/${owner}?s=512`,
        `https://api.dicebear.com/9.x/identicon/svg?seed=${owner}`,
      ]
    : [];
  const heroImageUrl = heroImageCandidates[heroImageIndex] ?? null;

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
          <div className="absolute inset-x-0 bottom-0 flex h-[115px] items-end bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-2">
            <p className="whitespace-pre-line text-xl font-semibold leading-6 text-white">
              {loading ? "Loading..." : `${headerOwner}\n${headerRepo}`}
            </p>
          </div>
        </div>
        <div className={cn("absolute right-2 top-2 flex items-center justify-end gap-2", collapsed && "relative right-auto top-auto justify-center p-2")}>
          <SidebarTrigger className="h-9 w-9" />
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 space-y-2 overflow-x-hidden overflow-y-hidden p-2">
        <div className="mt-3 space-y-1">
          <div className="space-y-1 pb-2">
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
          </div>

          <div className="my-2 border-t border-[var(--border)]" />

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
                  {!collapsed ? <span className="truncate">{session.title || "New chat"}</span> : null}
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => onRenameSession(session.id)}>Rename</ContextMenuItem>
                <ContextMenuItem onClick={() => onDeleteSession(session.id)} className="text-red-500">Delete</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
          {!sessions.length && !collapsed ? (
            <p className="px-2 py-4 text-center text-xs text-[var(--foreground-subtle)]">No chats yet.</p>
          ) : null}
        </div>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-[var(--border)] px-2 py-2 min-h-14">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("w-full justify-start gap-2", collapsed && "w-10 justify-center px-0")}
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {mounted && theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          {!collapsed ? (mounted && theme === "light" ? "Dark mode" : "Light mode") : null}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
