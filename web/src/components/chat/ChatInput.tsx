"use client";

import { 
  PromptInput, 
  PromptInputTextarea, 
  PromptInputSubmit 
} from "@/components/ai-elements/prompt-input";
import type { SnippetChip } from "./types";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  snippetChips: SnippetChip[];
  onRemoveSnippet: (id: string) => void;
  onDropSnippet: (e: React.DragEvent<HTMLDivElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function ChatInput({
  input,
  setInput,
  isLoading,
  snippetChips,
  onRemoveSnippet,
  onDropSnippet,
  onSubmit
}: ChatInputProps) {
  return (
    <div className="mt-2.5 shrink-0 border-t border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-1)_92%,transparent)] pt-2.5">
      <div
        className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-1)_94%,transparent)] p-2 focus-within:border-[var(--brand)] focus-within:ring-1 focus-within:ring-[var(--brand)] transition-all"
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDropSnippet}
      >
        {snippetChips.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-1">
            {snippetChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => onRemoveSnippet(chip.id)}
                className="rounded-full border border-[var(--brand-muted)] bg-[var(--brand-muted)] px-3 py-1 text-[var(--text-xs)] text-[var(--brand)] hover:opacity-80 transition-opacity"
                title="Click to remove snippet"
              >
                {chip.filePath}:{chip.startLine}-{chip.endLine}
              </button>
            ))}
          </div>
        ) : null}
        
        <div className="flex items-end gap-[var(--space-sm)]">
          <PromptInput 
            className="flex-1"
            onSubmit={(msg, e) => onSubmit(e)}
          >
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your code or drop snippet here..."
              className="min-h-[44px] max-h-48 border-0 bg-transparent resize-none focus-visible:ring-0 p-3 shadow-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  // Trigger form submit
                  if (input.trim() && !isLoading) {
                    const form = e.currentTarget.closest("form");
                    if (form) {
                      const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
                      form.dispatchEvent(submitEvent);
                    }
                  }
                }
              }}
            />
            <PromptInputSubmit 
              disabled={isLoading || !input.trim()}
              className="mb-1 mr-1 size-8 shrink-0 bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white rounded-md"
            >
              <ArrowUp className="size-4" />
            </PromptInputSubmit>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}