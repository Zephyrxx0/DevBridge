import { useState } from "react";
import { Server, LayoutTemplate, Layers, Compass, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChoicePoll as UIChoicePoll,
} from "@/components/ui/choice-poll";

const OPTIONS = [
  { id: "Backend", label: "Backend Logic", icon: Server, description: "API routes, models, and database" },
  { id: "Frontend", label: "Frontend Components", icon: LayoutTemplate, description: "React components, UI, and hooks" },
  { id: "Fullstack", label: "Fullstack Flow", icon: Layers, description: "End-to-end data flow and pages" },
  { id: "Exploring", label: "Just Exploring", icon: Compass, description: "General overview of everything" },
];

interface ChoicePollProps {
  onSubmit: (focus: string) => void;
}

export function ChoicePoll({ onSubmit }: ChoicePollProps) {
  const [selected, setSelected] = useState<string>("Exploring");

  return (
    <div className="mx-auto max-w-lg p-6 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm">
      <UIChoicePoll.Root 
        value={selected} 
        onValueChange={(val) => setSelected(val as string)}
      >
        <UIChoicePoll.Header className="mb-4 text-center">
          <UIChoicePoll.Title className="text-2xl font-bold text-[var(--foreground)]">
            What is your primary focus?
          </UIChoicePoll.Title>
          <UIChoicePoll.Description>
            We&apos;ll tailor your onboarding guide to highlight the most relevant files and concepts.
          </UIChoicePoll.Description>
        </UIChoicePoll.Header>

        <UIChoicePoll.Options className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <UIChoicePoll.Option key={opt.id} value={opt.id}>
                <UIChoicePoll.Indicator />
                <div className="flex flex-col items-start text-left">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[var(--brand)]" />
                    <UIChoicePoll.Label>{opt.label}</UIChoicePoll.Label>
                  </div>
                  <span className="text-xs text-[var(--foreground-muted)] mt-1 ml-6">
                    {opt.description}
                  </span>
                </div>
              </UIChoicePoll.Option>
            );
          })}
        </UIChoicePoll.Options>

        <div className="mt-8 flex justify-end">
          <Button 
            onClick={() => onSubmit(selected)}
            className="w-full sm:w-auto"
            style={{ backgroundColor: "var(--brand)" }}
          >
            Personalize My Guide
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </UIChoicePoll.Root>
    </div>
  );
}
