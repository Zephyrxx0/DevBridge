"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RepoConfigProps {
  repoId: string;
}

type ReviewDepth = "basic" | "deep";

export function RepoConfig({ repoId }: RepoConfigProps) {
  const [depth, setDepth] = useState<ReviewDepth>("basic");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api/backend";

  useEffect(() => {
    async function fetchConfig() {
      try {
        setIsLoading(true);
        const response = await fetch(`${apiUrl}/pr/config/${repoId}`);
        if (!response.ok) {
          if (response.status === 404) {
            // Default to basic if no config found
            setDepth("basic");
            return;
          }
          throw new Error("Failed to fetch configuration");
        }
        const data = await response.json();
        setDepth(data.review_depth || "basic");
      } catch (err) {
        console.error("Fetch error:", err);
        // Don't show error for 404/initial state
      } finally {
        setIsLoading(false);
      }
    }

    if (repoId) {
      fetchConfig();
    }
  }, [repoId, apiUrl]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`${apiUrl}/pr/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repoId, review_depth: depth }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to update configuration");
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full border-dashed">
        <CardContent className="py-12 flex flex-col items-center justify-center gap-4">
          <div className="flex gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" />
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Loading Settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">PR Review Depth</CardTitle>
        <CardDescription>
          Choose how the AI agent analyzes Pull Requests in this repository.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm border border-emerald-500/20 animate-in fade-in slide-in-from-top-1">
            Settings saved successfully!
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setDepth("basic")}
            className={cn(
              "flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              depth === "basic" 
                ? "border-primary bg-primary/[0.03] shadow-sm" 
                : "border-border bg-card hover:border-border/80 hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-2 w-full">
              <div className={cn(
                "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors",
                depth === "basic" ? "border-primary" : "border-muted-foreground/30"
              )}>
                {depth === "basic" && <div className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <span className="font-bold tracking-tight">Basic Review</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Provides a concise summary of changes and highlights potential issues. Optimized for speed and cost-efficiency.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setDepth("deep")}
            className={cn(
              "flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              depth === "deep" 
                ? "border-primary bg-primary/[0.03] shadow-sm" 
                : "border-border bg-card hover:border-border/80 hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-2 w-full">
              <div className={cn(
                "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors",
                depth === "deep" ? "border-primary" : "border-muted-foreground/30"
              )}>
                {depth === "deep" && <div className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <span className="font-bold tracking-tight">Deep Audit</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              In-depth analysis including security vulnerabilities, performance bottlenecks, and architectural alignment. Recommended for critical production code.
            </p>
          </button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/50 bg-muted/30 p-6">
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
          Applied to future PRs
        </p>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full sm:w-auto min-w-[120px] rounded-xl shadow-sm"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving
            </span>
          ) : "Save Settings"}
        </Button>
      </CardFooter>
    </Card>
  );
}
