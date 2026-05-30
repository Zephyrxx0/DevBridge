import type { ChatContextChip } from "@/components/chat/types";
import {
  buildPromptContext,
  REFERENCED_FILES_HEADING,
  REFERENCED_SNIPPETS_HEADING,
  type PromptLoadedReference,
} from "./prompt-context";

describe("buildPromptContext", () => {
  it("keeps displayMessage separate from backendPrompt and preserves exact section order", () => {
    const chips: ChatContextChip[] = [
      {
        id: "snippet-1",
        kind: "snippet",
        filePath: "src/a.ts",
        startLine: 3,
        endLine: 7,
        code: "code",
      },
      {
        id: "file-1",
        kind: "file",
        filePath: "src/config.ts",
        startLine: 1,
        endLine: 1,
        code: "",
      },
      {
        id: "folder-1",
        kind: "folder",
        filePath: "src/lib",
        startLine: 1,
        endLine: 1,
        code: "",
      },
    ];

    const loadedReferences: PromptLoadedReference[] = [
      { kind: "snippet", label: "src/a.ts:3-7", content: "code" },
      { kind: "file", label: "src/config.ts", content: "Unable to load file content (404)." },
      { kind: "folder", label: "src/lib", content: "Folder reference provided, but no files found." },
    ];

    const result = buildPromptContext({
      text: "  check @src/app.tsx and @src/app.tsx  ",
      chips,
      loadedReferences,
    });

    expect(result.displayMessage).toBe("check @src/app.tsx and @src/app.tsx");
    expect(result.backendPrompt).toBe(
      "check src/app.tsx and src/app.tsx\n\nReferenced snippets:\n- src/a.ts:3-7\n```\ncode\n```\n- src/config.ts\n```\nUnable to load file content (404).\n```\n- src/lib\n```\nFolder reference provided, but no files found.\n```\n\nReferenced files:\n- src/app.tsx"
    );
    expect(result.backendPrompt).toContain(REFERENCED_SNIPPETS_HEADING);
    expect(result.backendPrompt).toContain(REFERENCED_FILES_HEADING);
    expect(result.artifacts).toEqual(chips);
  });

  it("escapes regex characters in @path mentions and keeps mention labels lightweight", () => {
    const result = buildPromptContext({
      text: "see @src/app.test[legacy](v2)+.tsx and @src/app.tsx",
      chips: [
        {
          id: "snippet-2",
          kind: "snippet",
          filePath: "src/a.ts",
          startLine: 3,
          endLine: 7,
          code: "code",
        },
      ],
      loadedReferences: [{ kind: "snippet", label: "src/a.ts:3-7", content: "code" }],
    });

    expect(result.backendPrompt).toBe(
      "see src/app.test[legacy](v2)+.tsx and src/app.tsx\n\nReferenced snippets:\n- src/a.ts:3-7\n```\ncode\n```\n\nReferenced files:\n- src/app.test[legacy](v2)+.tsx\n- src/app.tsx"
    );
    expect(result.backendPrompt).toContain("Referenced files:\n- src/app.test[legacy](v2)+.tsx");
    expect(result.backendPrompt).not.toContain("```\nsrc/app.tsx");
  });
});
