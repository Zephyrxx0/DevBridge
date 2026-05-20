"use client";

import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit
} from "@/components/ai-elements/prompt-input";
import type { SnippetChip } from "./types";
import { ArrowUp, Square } from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  snippetChips: SnippetChip[];
  onRemoveSnippet: (id: string) => void;
  onDropSnippet: (e: React.DragEvent<HTMLDivElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onStopGenerating?: () => void;
}

export function ChatInput({
  input,
  setInput,
  isLoading,
  snippetChips,
  onRemoveSnippet,
  onDropSnippet,
  onSubmit,
  onStopGenerating,
}: ChatInputProps) {
  return (
    <div className="mt-1 shrink-0 border-t border-[var(--border)]/70 pt-1.5">
      <div
        className="flex flex-col gap-2 rounded-lg bg-transparent p-1"
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDropSnippet}
      >
        {snippetChips.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-2 px-1">
            {snippetChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => onRemoveSnippet(chip.id)}
                className="min-h-11 rounded-full border border-[var(--brand-muted)] bg-[var(--brand-muted)] px-3 py-1 text-[var(--text-xs)] text-[var(--brand)] transition-opacity hover:opacity-80"
                title="Click to remove snippet"
              >
                {chip.filePath.split("/").pop() || chip.filePath}
              </button>
            ))}
          </div>
        ) : null}
        
        <div className="flex items-end gap-[var(--space-sm)]">
          <PromptInput
            className="flex-1 ring-0 shadow-none [&_[data-slot=input-group]]:border-[var(--border-strong)] [&_[data-slot=input-group]]:bg-[var(--surface-2)] [&_[data-slot=input-group]]:shadow-none [&_[data-slot=input-group]]:has-[[data-slot=input-group-control]:focus-visible]:ring-0 [&_[data-slot=input-group-addon][data-align=inline-end]]:border-l-0 [&_[data-slot=input-group-addon][data-align=inline-end]]:pl-0 [&_[data-slot=input-group-addon][data-align=inline-end]]:pr-1"
            onSubmit={(msg, e) => onSubmit(e)}
          >
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your code, use @path/to/file, or drop snippet here..."
              className="min-h-[44px] max-h-48 border-0 bg-transparent resize-none focus-visible:ring-0 px-3 py-3 shadow-none"
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
              disabled={!isLoading && !input.trim()}
              status={isLoading ? "streaming" : "ready"}
              onStop={onStopGenerating}
              className="mb-1 mr-1 size-11 shrink-0 rounded-md border border-[var(--border-strong)] border-l-0 bg-[var(--brand)] text-[var(--icon-contrast)] ring-0 shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0 before:hidden after:hidden hover:bg-[var(--brand-hover)]"
            >
              {isLoading ? <Square className="size-4" /> : <ArrowUp className="size-4" />}
            </PromptInputSubmit>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
