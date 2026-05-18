"use client"

import { Clock3, Plus, MessageSquare, Sun, Moon, Landmark } from "lucide-react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useRepo } from "@/contexts/repo-context";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

export type ChatSession = {
  id: string;
  title: string;
  updated_at: string;
  last_message?: string;
};

interface AppSidebarProps {
  sessions?: ChatSession[];
  activeSessionId?: string;
  onSelectSession?: (id: string) => void;
  onCreateSession?: () => void;
  onRenameSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
}

function AppSidebarContent({
  sessions = [],
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
}: AppSidebarProps) {
  const { collapsed } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { repo, loading } = useRepo();
  const params = useParams();
  const repoId = params.id as string;

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-col gap-0 p-0">
        <div className="border-b border-[var(--sidebar-border)] px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[0.5rem] bg-[var(--brand-muted)] text-[var(--brand)]">
              <Landmark className="size-4" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[var(--text-sm)] font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                  {loading ? "Loading..." : repo?.name || "Repository"}
                </p>
              </div>
            )}
          </Link>
        </div>
        <div className="flex h-12 items-center justify-between px-3">
          <div className="flex items-center gap-2 overflow-hidden px-1">
            <Clock3 className="h-4 w-4 shrink-0 text-[var(--brand)]" />
            {!collapsed && <span className="truncate text-sm font-medium">History</span>}
          </div>
          <SidebarTrigger className="h-9 w-9" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-2">
        <Button 
          className="mb-4 min-h-11 w-full justify-start gap-2" 
          variant="secondary" 
          size="sm" 
          onClick={onCreateSession}
          aria-label="New thread"
        >
          <Plus className="h-4 w-4" />
          {!collapsed && "New thread"}
        </Button>

        <div className="space-y-1">
          {sessions.map((session) => (
            <ContextMenu key={session.id}>
              <ContextMenuTrigger
                className={cn(
                  "flex min-h-11 w-full cursor-context-menu items-center gap-2 rounded-md px-3 py-2 text-left transition-colors",
                  activeSessionId === session.id
                    ? "bg-[var(--brand-muted)] text-[var(--brand)] font-medium"
                    : "text-[var(--foreground-muted)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-foreground)]",
                  collapsed && "justify-center px-0"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectSession?.(session.id)}
                  className={cn("flex items-center gap-2 text-left", collapsed ? "w-auto" : "flex-1 min-w-0")}
                  title={session.title || "New chat"}
                >
                  <MessageSquare className="size-4 shrink-0" />
                  {!collapsed && <span className="truncate text-[var(--text-label)]">{session.title || "New chat"}</span>}
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => onRenameSession?.(session.id)}>Rename</ContextMenuItem>
                <ContextMenuItem onClick={() => onDeleteSession?.(session.id)} className="text-red-500">Delete</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
          {!sessions.length && !collapsed && (
            <p className="px-2 py-4 text-center text-xs text-[var(--foreground-subtle)]">
              No threads yet.
            </p>
          )}
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--sidebar-border)] p-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          {!collapsed && (theme === "light" ? "Dark mode" : "Light mode")}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppSidebar(props: AppSidebarProps) {
  return <AppSidebarContent {...props} />;
}
