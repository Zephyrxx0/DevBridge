"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingGuide } from "@/components/onboarding/OnboardingGuide";
import { Message as ElementsMessage, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Shimmer } from "@/components/ai-elements/shimmer";
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
import type { Message, SourceReference, SnippetChip } from "./types";

interface ChatStreamProps {
  messages: Message[];
  isLoading: boolean;
  repoId: string;
  onOpenArtifact: (artifact: SnippetChip) => void;
  onSelectSource: (source: SourceReference) => void;
}

export function ChatStream({
  messages,
  isLoading,
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-1)_88%,transparent)] p-2.5">
      <Conversation>
        <ConversationContent className="p-0">
          <div className="space-y-[var(--space-md)] pr-1">
            {messages.length === 0 && !isLoading ? (
              <div className="flex h-full flex-col animate-in fade-in zoom-in duration-500">
                <OnboardingGuide repoId={repoId} />
              </div>
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
                  <div className={cn("flex max-w-[85%] gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
                    <Avatar className="mt-1 shrink-0">
                      <AvatarFallback className={cn(isUser ? "bg-[var(--surface-3)] text-[var(--foreground)]" : "bg-[var(--brand-muted)] text-[var(--brand)]")}>
                        {isUser ? "U" : "DB"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      {!isUser ? (
                        <div className="mb-1 flex items-center gap-2 text-xs text-[var(--foreground-subtle)]">
                          <span>DevBridge</span>
                          {message.fallback ? (
                            <Badge className="border-yellow-500/20 bg-yellow-500/10 text-yellow-600">Fast Mode</Badge>
                          ) : null}
                        </div>
                      ) : null}
                      
                      <MessageContent className={cn(
                        "rounded-xl border px-4 py-3 text-[var(--text-body)] leading-[1.62] max-w-full",
                        isUser
                          ? "border-[var(--border)] bg-[var(--surface-3)] text-[var(--foreground)]"
                          : "border-[var(--brand-muted)] bg-[var(--surface-1)] text-[var(--foreground)]"
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
                          <div className="flex flex-wrap gap-2">
                            {message.artifacts.map((artifact) => (
                              <button
                                type="button"
                                key={artifact.id}
                                onClick={() => onOpenArtifact(artifact)}
                                className="rounded-md border border-[var(--brand-muted)] bg-[var(--brand-muted)] px-2 py-1 font-mono text-[var(--text-xs)] text-[var(--brand)] hover:opacity-90"
                              >
                                {artifact.kind === "folder" ? "Folder" : artifact.kind === "file" ? "File" : "Snippet"}: {artifact.filePath}
                                {artifact.kind === "snippet" ? `:${artifact.startLine}-${artifact.endLine}` : ""}
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
                            <div className="mt-2 space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {message.sources?.map((source, sourceIndex) => (
                                  <button
                                    type="button"
                                    key={`${source.file_path}-${sourceIndex}`}
                                    onClick={() => onSelectSource(source)}
                                    className="rounded-md border border-border bg-(--surface-2) px-2 py-1 font-mono text-(length:--text-xs) text-(--foreground-muted) transition-colors hover:border-(--brand-muted) hover:text-(--brand)"
                                  >
                                    {source.file_path}:{source.start_line}
                                  </button>
                                ))}
                              </div>

                              <InlineCitation className="block">
                                <InlineCitationText className="text-xs text-[var(--foreground-subtle)]">
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
