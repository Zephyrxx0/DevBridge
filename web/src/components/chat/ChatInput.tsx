"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit
} from "@/components/ai-elements/prompt-input";
import type { SnippetChip } from "./types";
import type { FileNode } from "./FileExplorer";
import { ArrowUp, Square, FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  snippetChips: SnippetChip[];
  onRemoveSnippet: (id: string) => void;
  onDropSnippet: (e: React.DragEvent<HTMLDivElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onStopGenerating?: () => void;
  fileTree?: FileNode | null;
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
  fileTree,
}: ChatInputProps) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const flatFiles = useMemo(() => {
    if (!fileTree) return [];
    const files: string[] = [];
    const traverse = (node: FileNode) => {
      if (node.type === "file") files.push(node.path);
      if (node.children) node.children.forEach(traverse);
    };
    traverse(fileTree);
    return files;
  }, [fileTree]);

  const filteredFiles = useMemo(() => {
    if (mentionQuery === null) return [];
    const lowerQuery = mentionQuery.toLowerCase();
    return flatFiles
      .filter((file) => file.toLowerCase().includes(lowerQuery))
      .slice(0, 10);
  }, [flatFiles, mentionQuery]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredFiles]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    
    const match = textBeforeCursor.match(/@([\w.\/-]*)$/);
    if (match) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (filePath: string) => {
    if (!inputRef.current) return;
    const cursorPosition = inputRef.current.selectionStart;
    const textBeforeCursor = input.slice(0, cursorPosition);
    const textAfterCursor = input.slice(cursorPosition);
    
    const match = textBeforeCursor.match(/@([\w.\/-]*)$/);
    if (match) {
      const start = match.index!;
      const newText = input.slice(0, start) + `@${filePath} ` + textAfterCursor;
      setInput(newText);
      setMentionQuery(null);
      
      // Try to focus back and set cursor
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newPos = start + filePath.length + 2;
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredFiles.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredFiles.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredFiles.length) % filteredFiles.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredFiles[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }

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
  };

  return (
    <div className="mt-1 shrink-0 border-t border-[var(--border)]/70 pt-1.5 relative">
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
        
        <div className="flex items-end gap-[var(--space-sm)] relative">
          {mentionQuery !== null && filteredFiles.length > 0 && (
            <div 
              ref={menuRef}
              className="absolute bottom-full left-0 mb-2 w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-1 shadow-lg z-50 overflow-hidden"
            >
              <div className="max-h-60 overflow-y-auto">
                {filteredFiles.map((file, idx) => (
                  <button
                    key={file}
                    type="button"
                    onClick={() => insertMention(file)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                      idx === selectedIndex
                        ? "bg-[var(--brand)]/10 text-[var(--brand)]"
                        : "text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                    )}
                  >
                    <FileCode2 className="size-4 opacity-70" />
                    <span className="truncate">{file}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <PromptInput
            className="flex-1 ring-0 shadow-none [&_[data-slot=input-group]]:border-[var(--border-strong)] [&_[data-slot=input-group]]:bg-[var(--surface-2)] [&_[data-slot=input-group]]:shadow-none [&_[data-slot=input-group]]:has-[[data-slot=input-group-control]:focus-visible]:ring-0 [&_[data-slot=input-group-addon][data-align=inline-end]]:border-l-0 [&_[data-slot=input-group-addon][data-align=inline-end]]:pl-0 [&_[data-slot=input-group-addon][data-align=inline-end]]:pr-1"
            onSubmit={(msg, e) => onSubmit(e)}
          >
            <PromptInputTextarea
              ref={inputRef as any}
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about your code, use @path/to/file, or drop snippet here..."
              className="min-h-[44px] max-h-48 border-0 bg-transparent resize-none focus-visible:ring-0 px-3 py-3 shadow-none"
              onKeyDown={handleKeyDown}
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