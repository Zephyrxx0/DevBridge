import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const tiers = [
  { name: "Starter", price: "$0", desc: "For individual experiments", bullets: ["1 workspace", "Basic chat", "Notes + links"] },
  { name: "Pro", price: "$24", desc: "For active developers", bullets: ["25 workspaces", "Advanced map", "Priority indexing"] },
  { name: "Team", price: "$79", desc: "For onboarding teams", bullets: ["Unlimited workspaces", "Team annotation workflows", "Role-based access"] },
];

export default function PricingPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-14">
      <div className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">Mock pricing</p>
        <h1 className="font-heading text-5xl">Plans for every workspace</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => (
          <Card key={tier.name} className="border-white/10 bg-[color-mix(in_oklab,var(--surface-1)_75%,transparent)] backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl">{tier.name}</CardTitle>
              <p className="text-4xl font-bold">{tier.price}<span className="text-base text-[var(--foreground-muted)]">/mo</span></p>
              <p className="text-sm text-[var(--foreground-muted)]">{tier.desc}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-[var(--foreground-muted)]">
                {tier.bullets.map((b) => <li key={b}>• {b}</li>)}
              </ul>
              <Button className="w-full">Choose {tier.name}</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
