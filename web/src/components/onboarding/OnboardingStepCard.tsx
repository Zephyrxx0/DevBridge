import { Onboarding } from "@/components/ui/onboarding";
import { FileTree } from "@pierre/trees";
import { CodeDiff } from "@pierre/diffs";

interface OnboardingStepCardProps {
  step: number;
  title: string;
  description: string;
  files?: string[];
  keyFiles?: string[];
}

export function OnboardingStepCard({
  step,
  title,
  description,
  files,
  keyFiles,
}: OnboardingStepCardProps) {
  const hasKeyFiles = Array.isArray(keyFiles) && keyFiles.length > 0;
  const hasFiles = Array.isArray(files) && files.length > 0;

  return (
    <Onboarding.Step step={step}>
      <Onboarding.Header title={title} description={description} />

      {hasKeyFiles && (
        <div className="mt-8 p-4 border border-[var(--border)] rounded-xl bg-[var(--surface-2)]">
          <h3 className="text-sm font-semibold mb-3 text-[var(--foreground)]">Key Files to Know</h3>
          <div className="h-64 overflow-auto rounded border border-[var(--border)] bg-[#0d0d0d] p-2">
            <FileTree files={keyFiles} />
          </div>
        </div>
      )}

      {hasFiles && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold mb-3 text-[var(--foreground)]">Relevant Code</h3>
          <div className="rounded border border-[var(--border)] bg-[#0d0d0d] overflow-hidden">
            <CodeDiff files={files} />
          </div>
        </div>
      )}
    </Onboarding.Step>
  );
}
