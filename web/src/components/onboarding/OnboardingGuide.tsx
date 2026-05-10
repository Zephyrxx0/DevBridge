import { useState } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingTrigger } from "./OnboardingTrigger";
import { ChoicePoll } from "./ChoicePoll";
import { StatusStream } from "./StatusStream";
import { SetupGuide } from "./SetupGuide";

import { Onboarding } from "@/components/ui/onboarding";
import { IntroDisclosure } from "@/components/ui/intro-disclosure";
import { FileTree } from "@pierre/trees";
// Note: @pierre/diffs typically exports something like CodeDiff or similar.
// We'll use a placeholder or basic div if it's purely mock for now, but assume CodeDiff exists.
import { CodeDiff } from "@pierre/diffs"; 

interface OnboardingGuideProps {
  repoId: string;
}

type FlowState = "IDLE" | "QUALIFYING" | "STREAMING" | "PLAN_READY";

export function OnboardingGuide({ repoId }: OnboardingGuideProps) {
  const [flowState, setFlowState] = useState<FlowState>("IDLE");
  const { status, plan, loading, error, startGeneration } = useOnboarding(repoId);

  // Watch for transition to plan ready
  if (flowState === "STREAMING" && !loading && plan) {
    setFlowState("PLAN_READY");
  }

  // Also handle error
  if (error && flowState === "STREAMING") {
    // maybe go back to IDLE or show error
  }

  const handleStart = () => setFlowState("QUALIFYING");
  
  const handlePollSubmit = (focus: string) => {
    setFlowState("STREAMING");
    startGeneration(focus);
  };

  if (flowState === "IDLE") {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <OnboardingTrigger onClick={handleStart} />
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
      <div className="h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
        <StatusStream statusMessages={status} />
        {error && (
          <div className="mt-4 text-red-500 border border-red-500/20 bg-red-500/10 p-4 rounded-lg">
            {error}
            <button onClick={() => setFlowState("IDLE")} className="ml-4 underline">Try Again</button>
          </div>
        )}
      </div>
    );
  }

  if (flowState === "PLAN_READY" && plan) {
    // Total steps: Welcome + Architecture + <N Steps> + Setup
    const totalSteps = 2 + plan.steps.length + (plan.setup_commands?.length ? 1 : 0);
    
    return (
      <div className="mx-auto max-w-4xl p-6 h-full flex flex-col animate-in slide-in-from-bottom-4 duration-500">
        <Onboarding.Root totalSteps={totalSteps} className="flex-1 overflow-hidden flex flex-col border-[var(--border)] bg-[var(--surface-1)]">
          <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Onboarding.StepIndicator className="w-full sm:w-auto" variant="pills" />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 pb-6">
            {/* Step 1: Welcome & Overview */}
            <Onboarding.Step step={1}>
              <Onboarding.Header 
                title="Your Personalized Guide" 
                description={plan.summary} 
              />
              {plan.key_files && plan.key_files.length > 0 && (
                <div className="mt-8 p-4 border border-[var(--border)] rounded-xl bg-[var(--surface-2)]">
                  <h3 className="text-sm font-semibold mb-3 text-[var(--foreground)]">Key Files to Know</h3>
                  {/* Pierre FileTree visualizes the key files */}
                  <div className="h-64 overflow-auto rounded border border-[var(--border)] bg-[#0d0d0d] p-2">
                    <FileTree files={plan.key_files.map(kf => kf.path)} />
                  </div>
                </div>
              )}
            </Onboarding.Step>

            {/* Step 2: Architecture */}
            <Onboarding.Step step={2}>
              <Onboarding.Header 
                title="Architecture Overview" 
                description="High-level structure and patterns." 
              />
              <div className="mt-8">
                <IntroDisclosure title="View Architecture Details">
                  <div className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                    {plan.architecture}
                  </div>
                </IntroDisclosure>
              </div>
            </Onboarding.Step>

            {/* Dynamic Steps */}
            {plan.steps.map((stepData, index) => (
              <Onboarding.Step key={index} step={index + 3}>
                <Onboarding.Header 
                  title={stepData.title} 
                  description={stepData.description} 
                />
                {stepData.files && stepData.files.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-semibold mb-3 text-[var(--foreground)]">Relevant Code</h3>
                    <div className="rounded border border-[var(--border)] bg-[#0d0d0d] overflow-hidden">
                       <CodeDiff files={stepData.files} />
                    </div>
                  </div>
                )}
              </Onboarding.Step>
            ))}

            {/* Final Step: Setup */}
            {plan.setup_commands?.length > 0 && (
              <Onboarding.Step step={totalSteps}>
                <Onboarding.Header 
                  title="Run it Locally" 
                  description="Follow these commands to spin up the environment." 
                />
                <div className="mt-8">
                  <SetupGuide commands={plan.setup_commands} />
                </div>
              </Onboarding.Step>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <Onboarding.Navigation />
          </div>
        </Onboarding.Root>
      </div>
    );
  }

  return null;
}
