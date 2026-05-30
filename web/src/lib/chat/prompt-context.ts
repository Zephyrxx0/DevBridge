import type { ChatContextChip } from "@/components/chat/types";

export const REFERENCED_SNIPPETS_HEADING = "Referenced snippets:";
export const REFERENCED_FILES_HEADING = "Referenced files:";

export type PromptLoadedReference = {
  kind: "snippet" | "file" | "folder";
  label: string;
  content: string;
};

export type PromptBuildInput = {
  text: string;
  chips: ChatContextChip[];
  loadedReferences: PromptLoadedReference[];
};

export type PromptBuildResult = {
  displayMessage: string;
  backendPrompt: string;
  artifacts: ChatContextChip[];
};

export function buildPromptContext(input: PromptBuildInput): PromptBuildResult {
  const displayMessage = input.text.trim();
  const mentionRegex = /@([\w.\/-]+)/g;
  const mentionMatches = [...displayMessage.matchAll(mentionRegex)];
  const uniqueMentionPaths = [...new Set(mentionMatches.map((m) => m[1]))];

  let mentionResolvedMessage = displayMessage;
  const mentionContextParts: string[] = [];

  for (const path of uniqueMentionPaths) {
    mentionContextParts.push(`- ${path}`);
    mentionResolvedMessage = mentionResolvedMessage.replace(
      new RegExp(`@${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"),
      path
    );
  }

  const snippetContext = input.loadedReferences.length
    ? `\n\n${REFERENCED_SNIPPETS_HEADING}\n${input.loadedReferences
        .map((payload) => `- ${payload.label}\n\`\`\`\n${payload.content}\n\`\`\``)
        .join("\n")}`
    : "";

  const mentionContext = mentionContextParts.length
    ? `\n\n${REFERENCED_FILES_HEADING}\n${mentionContextParts.join("\n")}`
    : "";

  const backendPrompt = `${mentionResolvedMessage}${snippetContext}${mentionContext}`;
  const artifacts = input.chips.map((chip) => ({ ...chip }));

  return {
    displayMessage,
    backendPrompt,
    artifacts,
  };
}
