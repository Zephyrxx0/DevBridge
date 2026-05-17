"use client";

import { Bookmark, Code2, Sparkles, Target } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionReveal } from "@/components/ui/section-reveal";

type FeaturesSectionProps = {
  title: string;
  body: string;
};

export function FeaturesSection({ title, body }: FeaturesSectionProps) {
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
        <div className="mx-auto w-full max-w-[1200px] px-[1.25rem] md:px-[2.5rem]">
          <div className="max-w-[760px]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">Features</p>
            <h2 className="pt-3 text-balance font-heading text-[clamp(1.8rem,2.8vw,2.6rem)] font-medium leading-[1.1] tracking-tight text-foreground">
              {title}
            </h2>
            <p className="pt-3 text-[var(--text-body-lg)] leading-[1.7] text-muted-foreground">{body}</p>
          </div>
        </div>
      </SectionReveal>

      <div className="mx-auto mt-10 w-full max-w-[1200px] px-[1.25rem] md:px-[2.5rem]">
        <div className="grid gap-4 md:grid-cols-2">
          {features.map((feature, idx) => (
            <SectionReveal key={feature.title} animation="fade-up" delay={idx * 90}>
              <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_var(--brand-muted),0_20px_45px_-30px_var(--brand-glow)]">
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-[radial-gradient(80%_75%_at_50%_0%,var(--brand-glow),transparent_72%)]" />
                </div>
                <CardHeader className="p-6">
                  <div className="grid size-10 place-items-center rounded-xl border border-[var(--brand-muted)] bg-[color-mix(in_oklab,var(--surface-2)_70%,transparent)] text-[var(--brand)]">
                    {feature.icon}
                  </div>
                  <CardTitle className="pt-3">{feature.title}</CardTitle>
                  <CardDescription>{feature.body}</CardDescription>
                </CardHeader>
              </Card>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
