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
      <SidebarHeader className="border-b border-[var(--border)] p-4 flex flex-row items-center justify-between">
        <span className="font-semibold text-[var(--foreground)]">Chats</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="h-8 w-8 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        >
          <Sun className="hidden size-4 dark:block" />
          <Moon className="block size-4 dark:hidden" />
        </Button>
      </SidebarHeader>
      
      <SidebarContent className="p-3 space-y-2">
        <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={onCreateSession}>
          <Plus className="size-4" />
          New Chat
        </Button>

        <div className="space-y-1 mt-4">
          {sessions.map((session) => (
            <ContextMenu key={session.id}>
              <ContextMenuTrigger 
                className={cn(
                  "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors cursor-context-menu",
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