"use client";

import { motion } from "framer-motion";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface ChatLayoutProps {
  sidebar: React.ReactNode;
  chatArea: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export function ChatLayout({ sidebar, chatArea, rightPanel }: ChatLayoutProps) {
  return (
    <SidebarProvider defaultCollapsed={false}>
      <div className="flex h-[calc(100vh-1rem)] min-h-0 w-full flex-row overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
        {/* Left Sidebar (History) */}
        {sidebar}
        
        {/* Main Chat Area */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Sidebar Trigger for Mobile/Collapsed State */}
          <div className="absolute top-2 left-2 z-10 md:hidden">
            <SidebarTrigger />
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex h-full min-h-0 flex-1 flex-row overflow-hidden"
          >
            {/* Center Chat */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
              {chatArea}
            </div>

            {/* Right Panel (File Explorer / Code Viewer) */}
            {rightPanel && (
              <aside className="hidden min-h-0 w-80 lg:w-96 flex-col overflow-hidden p-2 md:flex border-l border-[var(--border)] bg-[var(--surface-1)]">
                {rightPanel}
              </aside>
            )}
          </motion.div>
        </div>
      </div>
    </SidebarProvider>
  );
}