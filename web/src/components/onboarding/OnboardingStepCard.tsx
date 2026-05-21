import { Onboarding } from "@/components/ui/onboarding";

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
        <section className="mt-8">
          <h3 className="text-sm font-semibold mb-3 text-[var(--foreground)]">Key Files to Know</h3>
          <pre className="h-64 overflow-auto rounded border border-[var(--border)] bg-[#0d0d0d] p-2 text-xs text-zinc-200 whitespace-pre-wrap break-all">
            {keyFiles.join("\n")}
          </pre>
        </section>
      )}

      {hasFiles && (
        <section className="mt-8">
          <h3 className="text-sm font-semibold mb-3 text-[var(--foreground)]">Relevant Code</h3>
          <pre className="rounded border border-[var(--border)] bg-[#0d0d0d] p-4 text-xs text-zinc-200 whitespace-pre-wrap break-all">
            {files.join("\n")}
          </pre>
        </section>
      )}
    </Onboarding.Step>
  );
}
