"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingGuide } from "@/components/onboarding/OnboardingGuide";
import { Message as ElementsMessage, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Skeleton } from "@/components/ui/skeleton";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import {
  InlineCitation,
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationCarouselIndex,
  InlineCitationSource,
} from "@/components/ai-elements/inline-citation";
import { ArtifactViewer } from "./ArtifactViewer";
import { FeedbackButtons } from "./FeedbackButtons";
import { EscalationIndicator } from "./EscalationIndicator";
import type { Message, SourceReference, SnippetChip } from "./types";

interface ChatStreamProps {
  messages: Message[];
  isLoading: boolean;
  isInitializing?: boolean;
  repoId: string;
  onOpenArtifact: (artifact: SnippetChip) => void;
  onSelectSource: (source: SourceReference) => void;
}

export function ChatStream({
  messages,
  isLoading,
  isInitializing = false,
  repoId,
  onOpenArtifact,
  onSelectSource,
}: ChatStreamProps) {
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());

  const extractCodeBlocks = (content: string): Array<{ language: string; code: string }> => {
    const matches = [...content.matchAll(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g)];
    return matches.map((match) => ({
      language: (match[1] || "markdown").toLowerCase(),
      code: match[2] || "",
    }));
  };

  const isJsxLanguage = (language: string) =>
    ["jsx", "tsx", "react", "typescriptreact", "javascriptreact"].includes(language);

  const toggleSourceSection = (messageIndex: number) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(messageIndex)) {
        next.delete(messageIndex);
      } else {
        next.add(messageIndex);
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-1 py-1">
      <Conversation>
        <ConversationContent className="p-0">
          <div className="space-y-[var(--space-md)]">
            {messages.length === 0 && !isLoading ? (
              isInitializing ? (
                <div className="flex h-full flex-col gap-4 p-3">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-20 w-full rounded-xl" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-14 w-[85%] rounded-xl" />
                    </div>
                  </div>
                  <div className="mt-auto space-y-2">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col animate-in fade-in zoom-in duration-500">
                  <OnboardingGuide repoId={repoId} />
                </div>
              )
            ) : null}
            {messages.map((message, index) => {
              const messageMeta = message as Message & {
                reasoning?: string;
                toolCalls?: Array<{
                  id?: string;
                  type?: string;
                  state?:
                    | "approval-requested"
                    | "approval-responded"
                    | "input-available"
                    | "input-streaming"
                    | "output-available"
                    | "output-denied"
                    | "output-error";
                  input?: unknown;
                  output?: unknown;
                  errorText?: string;
                  toolName?: string;
                }>;
              };

              const isUser = message.role === "user";
              if (!isUser && message.content.trim() === "") return null;
              const hasSources = !isUser && Boolean(message.sources?.length);
              const isSourceOpen = expandedSources.has(index);
              const codeBlocks = !isUser ? extractCodeBlocks(message.content) : [];
              const hasPendingToolCall = Boolean(
                messageMeta.toolCalls?.some((tool) =>
                  ["input-streaming", "input-available", "approval-requested"].includes(tool.state || "")
                )
              );

              return (
                <ElementsMessage key={`${message.role}-${index}`} from={message.role}>
                  <div className={cn("flex w-full gap-2.5", isUser ? "flex-row-reverse justify-end" : "flex-row")}>
                    {isUser ? (
                      <Avatar className="mt-1 shrink-0">
                        <AvatarFallback className="bg-[var(--surface-3)] text-[var(--foreground)]">U</AvatarFallback>
                      </Avatar>
                    ) : null}

                    <div className={cn("min-w-0", isUser ? "ml-auto max-w-[92%]" : "flex-1")}>
                      {!isUser && (typeof message.cascaded !== "undefined" || typeof message.model_used !== "undefined" || message.fallback) ? (
                        <EscalationIndicator
                          modelUsed={message.model_used}
                          cascaded={typeof message.cascaded !== "undefined" ? message.cascaded : message.fallback}
                        />
                      ) : null}
                      
                      <MessageContent className={cn(
                        "px-0 py-0 text-[var(--text-body)] leading-[1.62] max-w-full",
                        isUser
                          ? "rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-4 py-3 text-[var(--foreground)]"
                          : "border-0 bg-transparent text-[var(--foreground)]"
                      )}>
                        {!isUser ? (
                          <MessageResponse>{message.content}</MessageResponse>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        )}
                      </MessageContent>

                      {!isUser && messageMeta.reasoning ? (
                        <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                          <Reasoning defaultOpen={false} isStreaming={isLoading}>
                            <ReasoningTrigger />
                            <ReasoningContent>{messageMeta.reasoning}</ReasoningContent>
                          </Reasoning>
                        </div>
                      ) : null}

                      {!isUser && messageMeta.toolCalls?.length ? (
                        <div className="mt-2 space-y-2">
                          {messageMeta.toolCalls.map((tool, toolIndex) => (
                            <Tool key={tool.id ?? `${index}-${toolIndex}`}>
                              {tool.type === "dynamic-tool" ? (
                                <ToolHeader
                                  type="dynamic-tool"
                                  state={tool.state || "input-available"}
                                  toolName={tool.toolName || "unknown"}
                                />
                              ) : (
                                <ToolHeader
                                  type={tool.type?.startsWith("tool-") ? (tool.type as `tool-${string}`) : "tool-unknown"}
                                  state={tool.state || "input-available"}
                                />
                              )}
                              <ToolContent>
                                {tool.input ? <ToolInput input={tool.input as never} /> : null}
                                {tool.output || tool.errorText ? (
                                  <ToolOutput output={tool.output as never} errorText={tool.errorText as never} />
                                ) : null}
                              </ToolContent>
                            </Tool>
                          ))}
                          {hasPendingToolCall ? (
                            <p className="text-xs text-[var(--foreground-subtle)]">
                              <Shimmer>Agent running tools…</Shimmer>
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {!isUser && codeBlocks.length ? (
                        <div className="mt-2 space-y-3">
                          {codeBlocks.map((block, blockIndex) => (
                            <ArtifactViewer
                              key={`${index}-artifact-${blockIndex}`}
                              title={`Artifact ${blockIndex + 1}`}
                              code={block.code}
                              language={block.language}
                              isJsxPreview={isJsxLanguage(block.language)}
                            />
                          ))}
                        </div>
                      ) : null}

                      {isUser && message.artifacts?.length ? (
                        <div className="pt-2">
                          <div className="flex flex-wrap justify-end gap-2">
                            {message.artifacts.map((artifact) => (
                              <button
                                type="button"
                                key={artifact.id}
                                onClick={() => onOpenArtifact(artifact)}
                                className="rounded-md border border-[var(--brand-muted)] bg-[var(--brand-muted)] px-2 py-1 font-mono text-[var(--text-xs)] text-[var(--brand)] hover:opacity-90"
                              >
                                {artifact.filePath.split("/").pop() || artifact.filePath}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {hasSources ? (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => toggleSourceSection(index)}
                            className="inline-flex items-center gap-1 text-(length:--text-xs) font-medium tracking-[0.08em] uppercase text-(--foreground-subtle) hover:text-(--foreground-muted)"
                          >
                            {isSourceOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                            Sources ({message.sources?.length})
                          </button>

                          {isSourceOpen ? (
                            <div className="mt-2 space-y-1.5">
                              <div className="flex flex-wrap gap-2">
                                {message.sources?.map((source, sourceIndex) => (
                                  <button
                                    type="button"
                                    key={`${source.file_path}-${sourceIndex}`}
                                    onClick={() => onSelectSource(source)}
                                    className="rounded-md border border-border bg-(--surface-2) px-1.5 py-0.5 font-mono text-[10px] text-(--foreground-muted) transition-colors hover:border-(--brand-muted) hover:text-(--brand)"
                                  >
                                    {source.file_path}:{source.start_line}
                                  </button>
                                ))}
                              </div>

                              <InlineCitation className="block">
                                <InlineCitationText className="text-[9px] text-[var(--foreground-subtle)]">
                                  Source citations
                                </InlineCitationText>
                                <InlineCitationCard>
                                  <InlineCitationCardTrigger
                                    sources={(message.sources || []).map((source) => `https://local.dev/${source.file_path}`)}
                                  />
                                  <InlineCitationCardBody>
                                    <InlineCitationCarousel>
                                      <InlineCitationCarouselHeader>
                                        <InlineCitationCarouselPrev />
                                        <InlineCitationCarouselIndex />
                                        <InlineCitationCarouselNext />
                                      </InlineCitationCarouselHeader>
                                      <InlineCitationCarouselContent>
                                        {(message.sources || []).map((source, sourceIndex) => (
                                          <InlineCitationCarouselItem key={`${source.file_path}-${sourceIndex}-card`}>
                                            <InlineCitationSource
                                              title={source.file_path}
                                              description={`L${source.start_line}-L${source.end_line}${source.function_name ? ` • ${source.function_name}` : ""}`}
                                            />
                                          </InlineCitationCarouselItem>
                                        ))}
                                      </InlineCitationCarouselContent>
                                    </InlineCitationCarousel>
                                  </InlineCitationCardBody>
                                </InlineCitationCard>
                              </InlineCitation>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {!isUser ? (
                        <FeedbackButtons messageIndex={index} messagePreview={message.content} />
                      ) : null}
                    </div>
                  </div>
                </ElementsMessage>
              );
            })}

            {isLoading ? (
              <ElementsMessage from="assistant">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-[var(--brand-muted)] text-[var(--brand)]">DB</AvatarFallback>
                  </Avatar>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-[var(--space-lg)] py-[var(--space-md)]">
                    <div className="flex gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--brand)] [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--brand)] [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--brand)] [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              </ElementsMessage>
            ) : null}
          </div>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  );
}
