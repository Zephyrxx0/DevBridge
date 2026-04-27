import Link from "next/link";
import { GitBranch, SearchCode, StickyNote, Workflow } from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { DitheringCard } from "@/components/ui/dithering-card";

function HeroSection() {
  return (
    <section className="px-[1.25rem] py-0 md:px-[2.5rem]">
      <DitheringCard
        className="min-h-[calc(100dvh-64px)]"
        contentClassName="flex min-h-[calc(100dvh-64px)] items-center"
      >
        <div className="mx-auto w-full max-w-[1200px] px-[1.25rem] py-[var(--space-3xl)] md:px-[2.5rem]">
          <div className="max-w-[760px] space-y-[var(--space-lg)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-emerald)]/35 bg-[var(--accent-emerald-muted)] px-3 py-1.5">
              <span className="inline-block h-2 w-2 animate-[pulse-dot_2s_infinite] rounded-full bg-[var(--accent-emerald)]" />
              <span className="text-[var(--text-sm)] font-medium text-[var(--foreground)]">Agent System Online</span>
            </div>

            <h1
              className="text-[var(--text-hero)] font-extrabold leading-[1.1] text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.03em" }}
            >
              Your codebase,
              <br />
              finally understood.
            </h1>

            <p className="max-w-[64ch] text-[var(--text-body-lg)] font-normal leading-[1.65] text-[var(--foreground-muted)]">
              DevBridge connects a multi-agent AI layer to your real code, PR history, and team knowledge.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="h-11 rounded-lg border border-transparent px-6 text-[var(--text-sm)] font-semibold"
                >
                  Get Started &rarr;
                </Button>
              </Link>
              <Link href="https://github.com" target="_blank" rel="noreferrer">
                <Button
                  variant="ghost"
                  size="lg"
                  className="h-11 rounded-lg border border-[var(--border)] px-6 text-[var(--text-sm)] font-medium text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                >
                  View on GitHub &#8599;
                </Button>
              </Link>
            </div>

            <div className="pt-[var(--space-md)]">
              <div className="h-px w-full max-w-[560px] bg-[var(--border)]" />
              <p
                className="pt-3 text-[var(--text-xs)] font-medium uppercase text-[var(--foreground-subtle)]"
                style={{ letterSpacing: "0.1em" }}
              >
                0 hallucinations &middot; cited sources &middot; persistent team memory
              </p>
            </div>
          </div>
        </div>
      </DitheringCard>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      step: "①",
      title: "Ingest",
      body: "Your repo is indexed by file, function, and PR.",
    },
    {
      step: "②",
      title: "Ask",
      body: "Ask in plain English. The agent decides how to retrieve.",
    },
    {
      step: "③",
      title: "Understand",
      body: "Get grounded answers with exact file paths, line numbers, and team annotations cited.",
    },
  ];

  return (
    <section id="how-it-works" className="px-[1.25rem] py-[var(--space-4xl)] md:px-[2.5rem]">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="mb-[var(--space-xl)] max-w-[700px]">
          <h2
            className="text-[var(--text-h1)] font-bold leading-[1.1] text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
          >
            How it works
          </h2>
          <p className="pt-3 text-[var(--text-body)] text-[var(--foreground-muted)]">
            Precision retrieval pipeline, tuned for real engineering questions.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:gap-6">
          {steps.map((step, index) => (
            <div key={step.title} className="contents">
              <article className="relative rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-[var(--space-xl)] transition-[border-color,transform,box-shadow] duration-150 hover:translate-y-[-1px] hover:border-[var(--border-strong)] hover:shadow-[0_0_0_1px_var(--border-strong)]">
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-2 text-[var(--text-hero)] font-extrabold leading-none text-[var(--brand-muted)]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {step.step}
                </span>
                <div className="pt-8">
                  <h3
                    className="text-[var(--text-h3)] font-semibold text-[var(--foreground)]"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {step.title}
                  </h3>
                  <p className="pt-3 text-[var(--text-body)] leading-[1.65] text-[var(--foreground-muted)]">
                    {step.body}
                  </p>
                </div>
              </article>
              {index < steps.length - 1 ? (
                <div className="hidden items-center justify-center text-[var(--foreground-subtle)] lg:flex">
                  <span className="text-xl">&rarr;</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: <SearchCode className="h-5 w-5" />,
      title: "Find code by what it does",
      body: "Not just keywords. Embed and retrieve by intent.",
    },
    {
      icon: <GitBranch className="h-5 w-5" />,
      title: "Know why, not just what",
      body: "Every PR's title, description, and diff is searchable.",
    },
    {
      icon: <StickyNote className="h-5 w-5" />,
      title: "Capture what code can't say",
      body: "Warnings, gotchas, architectural context live alongside the code.",
    },
    {
      icon: <Workflow className="h-5 w-5" />,
      title: "Answers that reason, not guess",
      body: "A multi-step ReAct loop picks the right tools for each query.",
    },
  ];

  return (
    <section id="features" className="px-[1.25rem] py-[var(--space-4xl)] md:px-[2.5rem]">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="mb-[var(--space-xl)] max-w-[700px]">
          <h2
            className="text-[var(--text-h1)] font-bold leading-[1.1] text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
          >
            Feature grid
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-[var(--space-xl)] transition-all duration-200 ease-out hover:translate-y-[-2px] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
            >
              <div className="text-[var(--brand)]">{feature.icon}</div>
              <h3
                className="pt-3 text-[var(--text-h3)] font-semibold text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {feature.title}
              </h3>
              <p className="pt-3 text-[var(--text-body)] leading-[1.65] text-[var(--foreground-muted)]">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TerminalDemo() {
  return (
    <section className="px-[1.25rem] py-[var(--space-4xl)] md:px-[2.5rem]">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[oklch(0.055_0.004_240)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28ca42]" />
          </div>
          <pre
            className="overflow-x-auto p-6 text-[var(--text-code)] leading-[1.7] text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <code>{`> user: Why does checkout timeout after deploy?

assistant:
Found likely regression in billing client retry policy.

Sources:
- web/src/lib/billing/client.ts:118
- web/src/app/api/checkout/route.ts:42
- docs/incident/2026-04-12-postmortem.md:17

Reasoning:
Recent PR removed exponential backoff when 429 returned.
Reintroduce jitter + cap to restore stable checkout latency.`}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--sidebar)] px-[1.25rem] py-[var(--space-2xl)] md:px-[2.5rem]">
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-[var(--text-h3)] font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-heading)" }}>
              DevBridge
            </p>
            <p className="text-[var(--text-sm)] text-[var(--foreground-muted)]">Context-grounded AI for engineering teams.</p>
          </div>
          <div className="flex gap-4 text-[var(--text-sm)] text-[var(--foreground-muted)]">
            <Link href="#features" className="transition-colors hover:text-[var(--foreground)]">
              Features
            </Link>
            <Link href="#how-it-works" className="transition-colors hover:text-[var(--foreground)]">
              How it works
            </Link>
            <Link href="#" className="transition-colors hover:text-[var(--foreground)]">
              Docs
            </Link>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-2 border-t border-[var(--border)] pt-4 text-[var(--text-xs)] text-[var(--foreground-subtle)] md:flex-row">
          <p>&copy; {new Date().getFullYear()} DevBridge</p>
          <p>Built for Google Solutions Hackathon</p>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <main className="bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <TerminalDemo />
      <Footer />
    </main>
  );
}
