import { useEffect, useState } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingTrigger } from "./OnboardingTrigger";
import { ChoicePoll } from "./ChoicePoll";
import { StatusStream } from "./StatusStream";
import { SetupGuide } from "./SetupGuide";
import { OnboardingStepCard } from "./OnboardingStepCard";

import { Onboarding } from "@/components/ui/onboarding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingPlan } from "@/hooks/useOnboarding";

interface OnboardingGuideProps {
  repoId: string;
  resumePlan?: OnboardingPlan | null;
  resumeAtPlan?: boolean;
  onComplete?: (plan: OnboardingPlan) => void;
}

type FlowState = "IDLE" | "QUALIFYING" | "STREAMING" | "PLAN_READY" | "DONE";

export function OnboardingGuide({ repoId, resumePlan = null, resumeAtPlan = false, onComplete }: OnboardingGuideProps) {
  const [flowState, setFlowState] = useState<FlowState>(resumeAtPlan && resumePlan ? "PLAN_READY" : "IDLE");
  const { status, plan, loading, error, startGeneration, cancelGeneration } = useOnboarding(repoId);
  const effectivePlan = resumePlan ?? plan;

  useEffect(() => {
    if (flowState === "STREAMING" && !loading && plan) {
      const transitionTimer = window.setTimeout(() => {
        setFlowState("PLAN_READY");
      }, 0);
      return () => window.clearTimeout(transitionTimer);
    }
  }, [flowState, loading, plan]);

  const handleStart = () => setFlowState("QUALIFYING");
  
  const handlePollSubmit = (focus: string) => {
    setFlowState("STREAMING");
    startGeneration(focus);
  };

  if (flowState === "DONE") {
    return null;
  }

  if (flowState === "IDLE") {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Card className="mx-auto w-full max-w-2xl border-[var(--border)] bg-[var(--surface-1)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-heading)]">Ready to start a conversation?</CardTitle>
          </CardHeader>
          <CardContent>
            <OnboardingTrigger onClick={handleStart} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (flowState === "QUALIFYING") {
    return (
      <div className="h-full flex items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
        <ChoicePoll onSubmit={handlePollSubmit} />
      </div>
    );
  }

  if (flowState === "STREAMING" || (loading && !plan)) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
        <StatusStream statusMessages={status} />
        <button
          type="button"
          onClick={() => {
            cancelGeneration();
            setFlowState("IDLE");
          }}
          className="mt-3 rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        >
          Cancel analysis
        </button>
        {error && (
          <div className="mt-4 text-red-500 border border-red-500/20 bg-red-500/10 p-4 rounded-lg">
            {error}
            <button onClick={() => setFlowState("IDLE")} className="ml-4 underline">Try Again</button>
          </div>
        )}
      </div>
    );
  }

  if (flowState === "PLAN_READY" && effectivePlan) {
    // Total steps: Welcome + Architecture + <N Steps> + Setup
    const totalSteps = 2 + effectivePlan.steps.length + (effectivePlan.setup_commands?.length ? 1 : 0);
    
    return (
      <div className="mx-auto max-w-4xl p-6 h-full flex flex-col animate-in slide-in-from-bottom-4 duration-500">
        <Onboarding
          totalSteps={totalSteps}
          onComplete={() => {
            setFlowState("DONE");
            onComplete?.(effectivePlan);
          }}
          className="flex-1 overflow-hidden flex flex-col border-[var(--border)] bg-[var(--surface-1)]"
        >
          <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Onboarding.StepIndicator className="w-full sm:w-auto" variant="pills" />
          </div>

          <div className="flex-1 overflow-y-auto">
             <OnboardingStepCard
                step={1}
                title="Your Personalized Guide"
                description={effectivePlan.summary}
                keyFiles={effectivePlan.key_files?.map((kf) => kf.path) ?? []}
              />

            {/* Step 2: Architecture */}
            <Onboarding.Step step={2}>
              <Onboarding.Header 
                title="Architecture Overview" 
                description="High-level structure and patterns." 
              />
              <pre className="mt-8 text-sm leading-relaxed whitespace-pre-wrap text-[var(--foreground)]">
                {effectivePlan.architecture}
              </pre>
            </Onboarding.Step>

            {/* Dynamic Steps */}
             {effectivePlan.steps.map((stepData, index) => (
               <OnboardingStepCard
                 key={`${stepData.title}-${index}`}
                 step={index + 3}
                 title={stepData.title}
                 description={stepData.description}
                 files={stepData.files}
               />
             ))}

            {/* Final Step: Setup */}
            {effectivePlan.setup_commands?.length > 0 && (
              <Onboarding.Step step={totalSteps}>
                <Onboarding.Header 
                  title="Run it Locally" 
                  description="Follow these commands to spin up the environment." 
                />
                <div className="mt-8">
                  <SetupGuide commands={effectivePlan.setup_commands} />
                </div>
              </Onboarding.Step>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <Onboarding.Navigation completeLabel="Done" />
          </div>
        </Onboarding>
      </div>
    );
  }

  return null;
}
