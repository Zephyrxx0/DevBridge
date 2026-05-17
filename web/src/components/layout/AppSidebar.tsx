"use client"

import { Clock3, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

function SidebarHistorySkeleton() {
  const { collapsed } = useSidebar()

  if (collapsed) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="mx-auto h-8 w-8 rounded-md bg-[var(--surface-2)] animate-pulse-dot" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-10 rounded-lg border border-[var(--sidebar-border)] bg-[var(--surface-2)]/70 px-3 py-2">
          <div className="mb-2 h-2 w-1/2 rounded bg-[var(--foreground-subtle)]/45" />
          <div className="h-2 w-2/3 rounded bg-[var(--foreground-subtle)]/30" />
        </div>
      ))}
    </div>
  )
}

function AppSidebarContent() {
  const { collapsed } = useSidebar()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex min-w-0 items-center gap-2">
          <Clock3 className="h-4 w-4 text-[var(--brand)]" />
          {!collapsed ? <span className="truncate text-sm font-medium">Thread History</span> : null}
        </div>
        <SidebarTrigger />
      </SidebarHeader>

      <SidebarContent>
        <Button className="mb-3 w-full justify-start gap-2" variant="secondary" size="sm" aria-label="Create new thread">
          <Plus className="h-4 w-4" />
          {!collapsed ? "New thread" : null}
        </Button>
        <Separator className="mb-3" />
        <SidebarHistorySkeleton />
      </SidebarContent>

      <SidebarFooter>
        {!collapsed ? <p className="text-xs text-[var(--foreground-muted)]">History integration in next plan.</p> : null}
      </SidebarFooter>
    </Sidebar>
  )
}

export function AppSidebar() {
  return (
    <SidebarProvider defaultCollapsed={false}>
      <AppSidebarContent />
    </SidebarProvider>
  )
}
