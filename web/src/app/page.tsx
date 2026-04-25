"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I am DevBridge Orchestrator. How can I help you understand your codebase today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Track streaming content for typewriter effect
    let accumulatedContent = "";
    let firstChunkReceived = false;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      
      const response = await fetch(`${apiUrl}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, thread_id: "demo-thread" }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Get the ReadableStream from the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      // Add empty assistant message for streaming content
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Decode the chunk and process SSE events
        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split("\n\n");

        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          
          try {
            const data = JSON.parse(event.slice(6));
            
            if (data.type === "chunk" && data.content) {
              // First chunk - transition from typing indicator to response display (D-03)
              if (!firstChunkReceived) {
                firstChunkReceived = true;
                setIsLoading(false); // Stop typing indicator once content starts flowing
              }
              
              accumulatedContent += data.content;
              
              // Update the last message (assistant) with accumulated content
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: accumulatedContent
                };
                return newMessages;
              });
            } else if (data.type === "done") {
              // Stream complete
              setIsLoading(false);
            } else if (data.type === "error") {
              // Error from server
              throw new Error(data.message || "Streaming error occurred");
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Ensure loading is turned off after stream completes
      if (!firstChunkReceived) {
        setIsLoading(false);
      }
    } catch (err) {
      // Error handling - fail fast, show in message bubble
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${errorMessage}` }
      ]);
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/50 bg-background/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg">
            <span className="text-lg font-bold text-primary-foreground">DB</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              DevBridge
            </h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Orchestrator v0.1</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">System Online</span>
          </div>
          
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="h-4 w-4"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              ) : (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="h-4 w-4"
                >
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-hidden relative">
        <div 
          ref={scrollRef}
          className="h-full overflow-y-auto px-4 py-8 scroll-smooth"
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-4 duration-300`}
              >
                <div className="flex gap-3 max-w-[85%]">
                  {m.role === "assistant" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">DB</AvatarFallback>
                    </Avatar>
                  )}
                  
                  <Card className={`px-4 py-3 shadow-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border/50 text-card-foreground"
                  }`}>
                    <p className="text-sm leading-relaxed">{m.content}</p>
                  </Card>
                  
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
        </div>

        {/* Ambient Glow - subtle, not purple/blue */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-[0.02] overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary blur-[150px] rounded-full" />
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-6 border-t border-border/50 bg-background/50">
        <form 
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto relative"
        >
          <div className="flex gap-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Ask about project intent or implementation..."
              className="flex-1 bg-background border-border rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-all placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className="h-[46px] w-12 shrink-0 rounded-xl bg-primary hover:bg-primary/90 transition-colors"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-5 h-5 text-primary-foreground"
              >
                <path d="m5 12 7-7 7 7" />
                <path d="M12 19V5" />
              </svg>
            </Button>
          </div>
        </form>
        <p className="text-[10px] text-muted-foreground text-center mt-4 font-medium uppercase tracking-[0.2em]">
          Grounded by Knowledge Graph • Experimental v0.1
        </p>
      </footer>
    </div>
  );
}
