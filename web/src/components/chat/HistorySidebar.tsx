"use client";

import { useTheme } from "next-themes";
import { Plus, Sun, Moon, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { motion } from "framer-motion";

export type ChatSession = {
  id: string;
  title: string;
  updated_at: string;
  last_message?: string;
};

interface HistorySidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onRenameSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export function HistorySidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
}: HistorySidebarProps) {
  const { resolvedTheme, theme, setTheme } = useTheme();

  return (
    <Sidebar className="border-r border-[var(--border)] bg-[var(--surface-1)]">
      <SidebarHeader className="flex flex-row items-center justify-between border-b border-[var(--border)] p-4">
        <span className="font-semibold text-[var(--foreground)]">Chats</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="h-11 w-11 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        >
          <Sun className="hidden size-4 dark:block" />
          <Moon className="block size-4 dark:hidden" />
        </Button>
      </SidebarHeader>
      
      <SidebarContent className="space-y-2 p-3">
        <Button type="button" variant="outline" className="min-h-11 w-full justify-start gap-2" onClick={onCreateSession}>
          <Plus className="size-4" />
          New Chat
        </Button>

        <div className="space-y-1 mt-4">
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
                  className="flex-1 flex items-center gap-2 text-left"
                >
                  <MessageSquare className="size-4 shrink-0" />
                  <span className="truncate">{session.title || "New chat"}</span>
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => onRenameSession(session.id)}>Rename</ContextMenuItem>
                <ContextMenuItem onClick={() => onDeleteSession(session.id)} className="text-red-500">Delete</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
