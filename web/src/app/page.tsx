"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

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
  const scrollRef = useRef<HTMLDivElement>(null);

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

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, thread_id: "demo-thread" }),
      });

      if (!response.ok) throw new Error("Failed to connect to orchestrator");

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: Could not connect to the backend. Please ensure the FastAPI server is running." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#050505] text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800/50 bg-black/20 px-8 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <span className="text-xl font-bold text-white">DB</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">DevBridge</h1>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Orchestrator v0.1</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">System Online</span>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-hidden relative">
        <div 
          ref={scrollRef}
          className="h-full overflow-y-auto px-4 py-8 space-y-6 scroll-smooth"
        >
          <div className="max-w-3xl mx-auto space-y-8">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-4 duration-500`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white shadow-indigo-500/10"
                      : "bg-zinc-900 border border-zinc-800/50 text-zinc-200"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-zinc-900 border border-zinc-800/50 rounded-2xl px-5 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-[0.03] overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500 blur-[150px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500 blur-[150px] rounded-full" />
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-6 bg-gradient-to-t from-black to-transparent">
        <form 
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto relative group"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ask about project intent or implementation..."
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all backdrop-blur-md placeholder:text-zinc-600"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-900/20"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-5 h-5 text-white"
            >
              <path d="m5 12 7-7 7 7" />
              <path d="M12 19V5" />
            </svg>
          </button>
        </form>
        <p className="text-[10px] text-zinc-600 text-center mt-4 font-medium uppercase tracking-[0.2em]">
          Grounded by Knowledge Graph • Experimental v0.1
        </p>
      </footer>
    </div>
  );
}
