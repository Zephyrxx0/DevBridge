import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AddRepoModal } from "@/components/add-repo-modal";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Dashboard - DevBridge",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: repos } = await supabase
    .from("repositories")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-bold tracking-tight">Your Workspaces</h1>
          <p className="mt-2 text-muted-foreground">Select a repository to explore, chat, and take notes.</p>
        </div>
        <AddRepoModal />
      </div>

      {!repos || repos.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-[color-mix(in_oklab,var(--surface-1)_40%,transparent)] backdrop-blur-sm p-8 text-center">
          <div className="mb-4 rounded-full bg-white/5 p-4 ring-1 ring-white/10">
            <GitBranch className="h-4 w-4 mr-1 text-muted-foreground" />
          </div>
          <h2 className="font-heading text-2xl font-semibold">No repositories connected</h2>
          <p className="mt-2 max-w-sm text-balance text-muted-foreground">
            Connect your first GitHub repository to start mapping the codebase and adding annotations.
          </p>
          <div className="mt-6">
            <AddRepoModal />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo) => (
            <Card key={repo.id} className="group relative flex flex-col hover:border-brand/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-white/5 p-2 ring-1 ring-white/10">
                    <GitBranch className="size-5" />
                  </div>
                  <CardTitle className="truncate text-xl">{repo.name}</CardTitle>
                </div>
                <CardDescription className="flex items-center gap-1.5 pt-2">
                  <Clock className="size-3.5" />
                  Added {new Date(repo.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Ready to explore
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t border-border">
                <Link href={`/repo/${repo.id}`} className="w-full">
                  <Button variant="ghost" className="w-full justify-between hover:bg-white/5 group-hover:text-brand-glow">
                    Open Workspace
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
