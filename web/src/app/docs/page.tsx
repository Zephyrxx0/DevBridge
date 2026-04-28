import Link from "next/link";
import { ArrowRight, Bot, BookOpen, GitBranch, Map, Search } from "lucide-react";

import { FloatingHeader } from "@/components/floating-header";

const guides = [
  {
    title: "Ask the orchestrator",
    body: "Use natural language to explore architecture, data flow, and why decisions were made.",
    href: "/repo/demo",
    icon: Bot,
  },
  {
    title: "Browse the repo map",
    body: "Find hotspots and knowledge density so you know where to focus first.",
    href: "/repo/demo/map",
    icon: Map,
  },
  {
    title: "Run semantic search",
    body: "Find symbols and intent-level matches quickly before deep dive debugging.",
    href: "/repo/demo/search",
    icon: Search,
  },
  {
    title: "Capture annotations",
    body: "Turn tribal knowledge into searchable annotations for your team.",
    href: "/repo/demo/annotations",
    icon: BookOpen,
  },
  {
    title: "Review pull requests",
    body: "Inspect PR summaries, findings, and risk areas tied to changed files.",
    href: "/repo/demo/pr",
    icon: GitBranch,
  },
  {
    title: "Connect a repo",
    body: "Link a GitHub repository and sync files, PRs, and annotations.",
    href: "/repo/demo",
    icon: GitBranch,
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="px-[1.25rem] pt-6 md:px-[2.5rem]">
        <FloatingHeader />
      </div>

      <section className="mx-auto w-full max-w-[640px] px-[1.25rem] pt-12 pb-12 md:px-[2.5rem]">
        <div className="space-y-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--foreground-muted)]">
              Docs
            </p>
            <h1 className="pt-2 text-2xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              DevBridge
            </h1>
            <p className="pt-3 text-[var(--text-body)] text-[var(--foreground-muted)]">
              A short path: connect repo, ask questions, explore map, capture team context.
            </p>
          </div>

          <div className="grid gap-3">
            {guides.map((guide) => {
              const Icon = guide.icon;
              return (
                <Link
                  key={guide.title}
                  href={guide.href}
                  className="group flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                >
                  <div className="flex size-9 items-center justify-center rounded-md bg-[var(--surface-2)] text-[var(--foreground-muted)]">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-[var(--foreground)]">{guide.title}</h3>
                    <p className="text-xs text-[var(--foreground-muted)]">{guide.body}</p>
                  </div>
                  <ArrowRight className="size-4 text-[var(--foreground-muted)] transition-transform group-hover:translate-x-1" />
                </Link>
              );
            })}
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
            <p className="text-sm text-[var(--foreground-muted)]">
              Full technical docs running separately via{" "}
              <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-xs">docsify</code>.
              Run <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-xs">npx docsify-cli serve docs</code> locally.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}