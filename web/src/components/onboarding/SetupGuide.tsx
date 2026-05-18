import { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SetupGuideProps {
  commands: string[];
}

export function SetupGuide({ commands }: SetupGuideProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  if (!commands || commands.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
        <Terminal className="h-5 w-5" />
        Setup Commands
      </h3>
      <div className="space-y-3">
        {commands.map((cmd, i) => (
          <div 
            key={i} 
            className="group relative flex items-center justify-between rounded-lg border border-[var(--border)] bg-[#0d0d0d] px-4 py-3 font-mono text-sm text-[var(--foreground)]"
          >
            <span className="mr-8 overflow-x-auto whitespace-pre">{cmd}</span>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => handleCopy(cmd, i)}
            >
              {copiedIndex === i ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-[var(--foreground-muted)]" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
