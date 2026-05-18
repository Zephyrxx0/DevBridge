"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Plus, Sun, Moon, MessageSquare, Network, Search, StickyNote, BookOpen, UserCircle2 } from "lucide-react";
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

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Sidebar className="border-r border-[var(--border)] bg-[var(--surface-1)]">
      <SidebarHeader className="flex flex-col items-stretch gap-3 border-b border-[var(--border)] p-4">
        <div className={cn("min-w-0", collapsed && "hidden") }>
          <p className="truncate text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
            {loading ? "Loading..." : repo?.name || "Repository"}
          </p>
        </div>
        <div className={cn("flex items-center justify-between gap-2", collapsed && "justify-center")}>
          <span className={cn("text-sm font-medium text-[var(--foreground)]", collapsed && "sr-only")}>Chats</span>
          <SidebarTrigger className="h-9 w-9" />
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-[0.8] space-y-2 p-3">
        <Button
          type="button"
          variant="outline"
          className={cn("min-h-11 w-full justify-start gap-2", collapsed && "w-10 justify-center px-0")}
          onClick={onCreateSession}
          aria-label="New chat"
        >
          <Plus className="size-4" />
          {!collapsed ? "New chat" : null}
        </Button>

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
                  <MessageSquare className="size-4 shrink-0" />
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

      <SidebarFooter className="mt-auto border-t border-[var(--border)] p-3">
        <Link href="/profile" className={cn("mb-2 flex min-h-11 items-center gap-2 rounded-md px-2 py-2 text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]", collapsed && "justify-center px-0")}>
          <UserCircle2 className="size-4 shrink-0" />
          {!collapsed ? <span className="text-[var(--text-label)]">Account</span> : null}
        </Link>
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
