 
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Code2,
  MessageSquareText,
  Sparkles,
  Target,
} from "lucide-react";

import { FloatingHeader } from "@/components/floating-header";
import { HeroDitheringCard } from "@/components/hero-dithering-card";
import { DitheringBackground } from "@/components/dithering-background";
import { BackgroundEffects } from "@/components/background-effects";
import { Footer } from "@/components/footer";
import { CodebaseGraph } from "@/components/codebase-graph";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionReveal } from "@/components/ui/section-reveal";
import { AnimatedCounter } from "@/components/ui/animated-counter";

/* ── Shared Section Heading ── */

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-[1.25rem] md:px-[2.5rem]">
      <div className="max-w-[760px]">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">{eyebrow}</p>
        )}
        <h2
          className="pt-3 text-balance font-heading text-[clamp(1.8rem,2.8vw,2.6rem)] font-medium leading-[1.1] tracking-tight text-foreground"
        >
          {title}
        </h2>
        {body && <p className="pt-3 text-[var(--text-body-lg)] leading-[1.7] text-muted-foreground">{body}</p>}
      </div>
    </div>
  );
}

/* ── Trust Strip ── */

function TrustStrip() {
  const stats = [
    { value: 12, suffix: "+", label: "Repos indexed", icon: <Code2 className="size-4" /> },
    { value: 340, suffix: "+", label: "Questions answered", icon: <MessageSquareText className="size-4" /> },
    { value: 98, suffix: "%", label: "Citations linked", icon: <Target className="size-4" /> },
  ];

  return (
    <SectionReveal animation="fade-up">
      <section className="px-[1.25rem] py-10 md:px-[2.5rem]">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="rounded-2xl border border-border bg-[color-mix(in_oklab,var(--surface-1)_85%,transparent)] backdrop-blur-md p-6 md:p-8 shadow-sm">
            <div className="grid gap-6 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--brand-muted)] bg-[color-mix(in_oklab,var(--surface-2)_70%,transparent)] text-[var(--brand)]">
                    {stat.icon}
                  </div>
                  <div>
                    <p className="font-heading text-2xl font-medium tracking-tight text-foreground">
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SectionReveal>
  );
}

/* ── How It Works ── */

function HowItWorks() {
  const steps = [
    {
      title: "Connect your repo",
      body: "Point DevBridge at GitHub and start indexing files, symbols, and history.",
      icon: <Code2 className="size-4" />,
    },
    {
      title: "Ask in natural language",
      body: "Get grounded answers with citations tied to files, line ranges, and PRs.",
      icon: <MessageSquareText className="size-4" />,
    },
    {
      title: "Explore the knowledge map",
      body: "See hotspots, annotations, and file relationships at a glance.",
      icon: <Sparkles className="size-4" />,
    },
  ];

  return (
    <section className="py-[var(--space-4xl)]">
      <SectionReveal>
        <SectionHeading
          eyebrow="How it works"
          title="Onboard faster with grounded context."
          body="Connect a repo, ask questions, and navigate the codebase with visual cues and citations."
        />
      </SectionReveal>
      <div className="mx-auto mt-10 w-full max-w-[1200px] px-[1.25rem] md:px-[2.5rem]">
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s, idx) => (
            <SectionReveal key={s.title} animation="fade-up" delay={idx * 120}>
              <Card className="group relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-[var(--brand-glow)] opacity-10" />
                </div>
                <CardHeader className="p-6">
                  <div className="inline-flex items-center gap-2">
                    <div className="grid size-9 place-items-center rounded-xl border border-[var(--brand-muted)] bg-[color-mix(in_oklab,var(--surface-2)_70%,transparent)] text-[var(--brand)]">
                      {s.icon}
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">
                      Step {idx + 1}
                    </p>
                  </div>
                  <CardTitle className="pt-3">{s.title}</CardTitle>
                  <CardDescription>{s.body}</CardDescription>
                </CardHeader>
              </Card>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Feature Grid ── */

function FeatureGrid() {
  const features = [
    {
      icon: <Code2 className="size-5" />,
      title: "Repo workspace",
      body: "Chat + code viewer + citations in a single flow for rapid onboarding.",
    },
    {
      icon: <Sparkles className="size-5" />,
      title: "Knowledge map",
      body: "Visualize hotspots, annotation density, and file relationships.",
    },
    {
      icon: <Bookmark className="size-5" />,
      title: "Human annotations",
      body: "Capture tribal knowledge and keep context attached to the source.",
    },
    {
      icon: <Target className="size-5" />,
      title: "Grounded answers",
      body: "Every response links to file paths and line ranges for trust.",
    },
  ];

  return (
    <section className="py-[var(--space-4xl)]">
      <SectionReveal>
        <SectionHeading
          eyebrow="Features"
          title="Built for onboarding developers."
          body="Everything centers on fast understanding of real repositories with evidence."
        />
      </SectionReveal>
      <div className="mx-auto mt-10 w-full max-w-[1200px] px-[1.25rem] md:px-[2.5rem]">
        <div className="grid gap-4 md:grid-cols-2">
          {features.map((f, idx) => (
            <SectionReveal key={f.title} animation="fade-up" delay={idx * 100}>
              <Card className="group relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-[var(--brand-glow)] opacity-10" />
                </div>
                <CardHeader className="p-6">
                  <div className="grid size-10 place-items-center rounded-xl border border-[var(--brand-muted)] bg-[color-mix(in_oklab,var(--surface-2)_70%,transparent)] text-[var(--brand)]">
                    {f.icon}
                  </div>
                  <CardTitle className="pt-3">{f.title}</CardTitle>
                  <CardDescription>{f.body}</CardDescription>
                </CardHeader>
              </Card>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Codebase Graph Section ── */

function CodebaseGraphSection() {
  return (
    <section className="py-[var(--space-4xl)]">
      <SectionReveal>
        <SectionHeading
          eyebrow="Repo graph"
          title="See how files connect across the codebase."
          body="A live map highlights relationships between files, hotspots, and annotated context—like an Obsidian vault for your repo."
        />
      </SectionReveal>
      <div className="mx-auto mt-10 w-full max-w-[1200px] px-[1.25rem] md:px-[2.5rem]">
        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <Card className="relative overflow-hidden">
            <CardHeader className="p-6">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4" />
                Knowledge graph preview
              </CardTitle>
              <CardDescription>Nodes represent files and modules. Edges show references, citations, and shared annotations.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-2">
              <CodebaseGraph />
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader className="p-6">
                <CardTitle>Map signals</CardTitle>
                <CardDescription>Track the most referenced, annotated, and recently changed files.</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border bg-[var(--surface-2)] p-3">
                  <p className="text-sm font-medium">Hotspot clusters</p>
                  <Badge variant="neutral">12</Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-[var(--surface-2)] p-3">
                  <p className="text-sm font-medium">Annotated files</p>
                  <Badge variant="neutral">46</Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-[var(--surface-2)] p-3">
                  <p className="text-sm font-medium">PR-linked nodes</p>
                  <Badge variant="neutral">18</Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-6">
                <CardTitle>Explore the map</CardTitle>
                <CardDescription>Jump into the workspace map view for real data once a repo is connected.</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full">
                    Go to Dashboard
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ── */

function FinalCTA() {
  return (
    <SectionReveal animation="slide-up">
      <section className="px-[1.25rem] pb-[var(--space-4xl)] md:px-[2.5rem]">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-[color-mix(in_oklab,var(--surface-2)_60%,transparent)] p-8 md:p-12">
            <div className="pointer-events-none absolute inset-0 bg-[var(--brand-glow)] opacity-[0.03]" />
            <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">Start onboarding</p>
                <h3 className="pt-3 font-heading text-2xl font-medium tracking-tight text-foreground md:text-3xl">
                  Turn your repo into a living knowledge base.
                </h3>
                <p className="pt-3 text-[var(--text-body-lg)] leading-[1.7] text-muted-foreground">
                  Connect a repository, explore the map, and help every new engineer ramp faster.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/dashboard">
                  <Button size="lg" className="w-full rounded-full sm:w-auto">
                    Go to Dashboard
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SectionReveal>
  );
}

/* ── Landing Page ── */

export default function HomePage() {
  return (
    <main className="min-h-dvh text-[var(--foreground)]">
      <BackgroundEffects />
      <DitheringBackground />
      <div className="relative pt-6">
        <FloatingHeader />
      </div>
      <HeroDitheringCard />

      <TrustStrip />

      <div className="mx-auto w-full max-w-[1200px] px-[1.25rem] md:px-[2.5rem]">
        <div className="h-px w-full bg-border" />
      </div>

      <HowItWorks />

      <div className="mx-auto w-full max-w-[1200px] px-[1.25rem] md:px-[2.5rem]">
        <div className="h-px w-full bg-border" />
      </div>

      <FeatureGrid />

      <div className="mx-auto w-full max-w-[1200px] px-[1.25rem] md:px-[2.5rem]">
        <div className="h-px w-full bg-border" />
      </div>

      <CodebaseGraphSection />

      <FinalCTA />

      <Footer />
    </main>
  );
}
