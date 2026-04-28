"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, GitBranch, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export function AddRepoModal() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Extract repo name from URL (e.g. https://github.com/owner/repo)
      const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
      if (!match) throw new Error("Invalid GitHub URL. Must be like https://github.com/owner/repo");
      
      const repoName = match[1].replace(/\.git$/, "");

      const { data, error: insertError } = await supabase
        .from("repositories")
        .insert({
          user_id: user.id,
          github_url: url,
          name: repoName,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") throw new Error("Repository already connected");
        throw insertError;
      }

      setOpen(false);
      setUrl("");
      router.refresh();
      router.push(`/repo/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect repository");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="size-4" />
        Connect Repository
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-[color-mix(in_oklab,var(--surface-1)_85%,transparent)] backdrop-blur-xl border-white/10 text-foreground">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Connect a GitHub Repo</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Paste the URL of the repository you want to analyze and explore.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="url">GitHub Repository URL</Label>
              <div className="relative">
                <GitBranch className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="url"
                  placeholder="https://github.com/facebook/react"
                  className="pl-9 bg-background/50 border-white/10 focus-visible:ring-brand-glow"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !url}>
              {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Connect Repo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
