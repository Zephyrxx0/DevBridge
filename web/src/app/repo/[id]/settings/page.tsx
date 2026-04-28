import { RepoConfig } from "@/components/RepoConfig";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface SettingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/50 bg-background/80 px-6 py-4 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href={`/repo/${id}`}>
            <Button variant="ghost" size="icon-sm" className="rounded-lg">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
              <span className="text-xs font-bold text-primary-foreground">DB</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                Repository Settings
              </h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{id}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="space-y-10">
          <section className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              General Settings
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure your repository integration and agent behaviors.
            </p>
          </section>

          <div className="grid gap-8">
            <RepoConfig repoId={id} />
            
            {/* Future settings sections can go here */}
            <div className="rounded-xl border border-dashed border-border/50 p-8 flex flex-col items-center justify-center text-center gap-2 bg-muted/5">
              <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
                <span className="text-xs font-bold text-muted-foreground">+</span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">More settings coming soon</p>
              <p className="text-[10px] text-muted-foreground max-w-[200px]">
                Webhook management and custom agent personas are currently in development.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Decoration */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-50" />
    </div>
  );
}
