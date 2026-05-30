import type { PromptBuildResult } from "@/lib/chat/prompt-context";

export function createChatStreamPayload(input: {
  promptContext: PromptBuildResult;
  repoId: string;
  threadId: string;
}): { message: string; repo_id: string; thread_id: string } {
  return {
    message: input.promptContext.backendPrompt,
    repo_id: input.repoId,
    thread_id: input.threadId,
  };
}
