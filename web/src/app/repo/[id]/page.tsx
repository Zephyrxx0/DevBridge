"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, Send, Code2, GitBranch, Clock, FileText, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ file_path: string; function_name?: string; start_line: number; end_line: number; similarity?: number }>;
}

interface RepoMetadata {
  id: string;
  name: string;
  lastIndexed?: string;
  fileCount?: number;
  annotationCount?: number;
  prCount?: number;
}

const NavItems = [
  { label: "Chat", href: "", icon: Sparkles },
  { label: "Files", href: "/files", icon: FileText },
  { label: "Map", href: "/map", icon: Code2 },
  { label: "Search", href: "/search", icon: Sparkles },
  { label: "PRs", href: "/pr", icon: GitBranch },
  { label: "Annotations", href: "/annotations", icon: FileText },
  { label: "Settings", href: "/settings", icon: Code2 },
];

export default function RepoWorkspace() {
  const params = useParams();
  const repoId = params.id as string;
  
  const [repo, setRepo] = useState<RepoMetadata | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm DevBridge Orchestrator. Ask me anything about this codebase. I can search semantically, answer architecture questions, or help you understand specific code paths." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Message["sources"]?.[0] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchRepoMetadata();
  }, [mounted, repoId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchRepoMetadata = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/repo/${repoId}`);
      if (response.ok) {
        const data = await response.json();
        setRepo(data);
      }
    } catch (err) {
      console.error("Error fetching repo metadata:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    let accumulatedContent = "";
    let accumulatedSources: Message["sources"] = [];
    let firstChunkReceived = false;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage, repo_id: repoId, history: messages }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split("\n\n");

        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          
          try {
            const data = JSON.parse(event.slice(6));
            
            if (data.type === "chunk" && data.content) {
              if (!firstChunkReceived) {
                firstChunkReceived = true;
                setIsLoading(false);
              }
              
              accumulatedContent += data.content;
              
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: accumulatedContent,
                  sources: accumulatedSources.length > 0 ? accumulatedSources : undefined
                };
                return newMessages;
              });
            } else if (data.type === "sources" && data.sources) {
              accumulatedSources = data.sources;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: accumulatedContent,
                  sources: accumulatedSources
                };
                return newMessages;
              });
            } else if (data.type === "done") {
              setIsLoading(false);
            } else if (data.type === "error") {
              throw new Error(data.message || "Streaming error occurred");
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      if (!firstChunkReceived) {
        setIsLoading(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${errorMessage}` }
      ]);
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar Navigation */}
      <aside className="w-60 border-r border-border/40 bg-background/50 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-6 border-b border-border/40">
          <Link href="/" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-md">
              <span className="text-base font-bold text-primary-foreground">DB</span>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                DevBridge
              </p>
              {repo && <p className="text-xs text-muted-foreground truncate">{repo.name}</p>}
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NavItems.map((item) => {
            const Icon = item.icon;
            const href = `/repo/${repoId}${item.href}`;
            const isActive = item.href === "";
            
            return (
              <Link key={item.label} href={href}>
                <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 border-l-2 border-primary text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}>
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Status Bar */}
        <div className="px-4 py-4 border-t border-border/40">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Online
          </div>
          {repo?.lastIndexed && (
            <p className="text-xs text-muted-foreground mt-2">
              Last indexed: {new Date(repo.lastIndexed).toLocaleDateString()}
            </p>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border/40 bg-background/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                  {repo?.name || "Repository"}
                </h1>
                <p className="text-sm text-muted-foreground">Chat • Files • Map • Search</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area - Split Layout */}
        <div className="flex-1 overflow-hidden flex gap-6 p-6">
          {/* Chat Panel (60%) */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto mb-4 space-y-4"
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                  <div className="flex gap-3 max-w-[80%]">
                    {m.role === "assistant" && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">DB</AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div>
                      <Card className={`px-4 py-3 shadow-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border/50 text-card-foreground"
                      }`}>
                        <p className="text-sm leading-relaxed">{m.content}</p>
                      </Card>
                      
                      {/* Sources */}
                      {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">Sources:</p>
                          {m.sources.map((src, j) => (
                            <button
                              key={j}
                              onClick={() => setSelectedSource(src)}
                              className="block text-xs text-primary hover:underline text-left truncate max-w-sm"
                            >
                              {src.file_path}:{src.start_line}-{src.end_line}
                              {src.function_name && ` • ${src.function_name}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {m.role === "user" && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">U</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start animate-in fade-in duration-200">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">DB</AvatarFallback>
                    </Avatar>
                    <Card className="px-4 py-3 bg-card border border-border/50">
                      <div className="flex gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder="Ask about the codebase..."
                className="flex-1 bg-background border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all placeholder:text-muted-foreground"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="icon"
                className="h-10 w-10 rounded-lg bg-primary hover:bg-primary/90 transition-colors"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </Button>
            </form>
          </div>

          {/* Code Viewer Panel (40%) */}
          <div className="w-2/5 flex flex-col overflow-hidden">
            {selectedSource ? (
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="border-b border-border/40">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Cited Source</p>
                    <CardTitle className="text-sm mt-1">{selectedSource.file_path}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lines {selectedSource.start_line}–{selectedSource.end_line}
                      {selectedSource.function_name && ` • ${selectedSource.function_name}`}
                      {selectedSource.similarity && ` • {Math.round(selectedSource.similarity * 100)}%`}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4">
                  <pre className="text-xs font-mono text-muted-foreground">
                    <code>// Full code viewer coming in phase 14-02</code>
                  </pre>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Repository Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Code2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Files</p>
                      <p className="text-lg font-semibold">{repo?.fileCount || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Annotations</p>
                      <p className="text-lg font-semibold">{repo?.annotationCount || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Last Indexed</p>
                      <p className="text-sm font-medium">{repo?.lastIndexed ? new Date(repo.lastIndexed).toLocaleDateString() : "Never"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-4">Click a source citation to preview the file here.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
