import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackgroundEffects } from "@/components/background-effects";
import { DitheringBackground } from "@/components/dithering-background";
import { FloatingHeader } from "@/components/floating-header";

const tiers = [
  {
    name: "Starter",
    price: "$0",
    period: "/mo",
    desc: "For individual experiments",
    bullets: ["1 workspace", "Basic chat", "Notes + links"],
  },
  {
    name: "Pro",
    price: "$24",
    period: "/mo",
    desc: "For active developers",
    recommended: true,
    bullets: ["25 workspaces", "Advanced map", "Priority indexing", "API access"],
  },
  {
    name: "Team",
    price: "$79",
    period: "/mo",
    desc: "For onboarding teams",
    bullets: ["Unlimited workspaces", "Team annotation workflows", "Role-based access", "SSO & audit logs"],
  },
];

export default function PricingPage() {
  return (
    <div className="relative min-h-dvh text-[var(--foreground)] selection:bg-white/30 selection:text-white">
      <BackgroundEffects />
      <DitheringBackground />
      <div className="relative pt-6">
        <FloatingHeader />
      </div>
      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-14 md:px-8">
        <div className="mb-12 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">Plans</p>
          <h1 className="font-heading text-4xl font-bold md:text-5xl lg:text-6xl">Pricing that scales with you</h1>
          <p className="mx-auto mt-4 max-w-md text-balance text-lg text-[var(--foreground-muted)]">
            Choose the perfect plan for your needs and start optimizing your workflow today.
          </p>
        </div>
        <div className="space-y-6 md:space-y-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--surface-1)_48%,transparent)] p-0.5 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-2xl md:rounded-3xl"
            >
              <div className="grid items-center divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
                <div className="p-6 md:p-8 md:pr-12">
                  <div className="flex flex-col items-center text-center md:items-start md:text-left">
                    <h3 className="text-xl font-semibold">{tier.name}</h3>
                    <p className="mt-1 text-sm text-[var(--foreground-muted)]">{tier.desc}</p>
                    <span className="mt-6 inline-flex items-baseline text-5xl font-bold">
                      <span className="text-2xl">$</span>
                      {tier.price.replace("$", "")}
                      <span className="ml-1 text-base font-normal text-[var(--foreground-muted)]">{tier.period}</span>
                    </span>
                    <Button
                      size="lg"
                      className={`mt-6 w-full md:w-auto ${tier.recommended ? "" : "variant-outline"}`}
                    >
                      Get started
                    </Button>
                  </div>
                </div>
                <div className="relative p-6 md:p-8">
                  <ul role="list" className="space-y-3">
                    {tier.bullets.map((item, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        <Check
                          className="size-3.5 shrink-0 text-[var(--brand)]"
                          strokeWidth={3.5}
                        />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-[var(--foreground-subtle)]">
          All plans include 14-day free trial. No credit card required.
        </p>
      </main>
    </div>
  );
}