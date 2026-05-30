import { createChatStreamPayload } from "./prompt-submit";

describe("createChatStreamPayload", () => {
  it("uses backendPrompt only for stream message", () => {
    const payload = createChatStreamPayload({
      repoId: "repo-1",
      threadId: "thread-1",
      promptContext: {
        displayMessage: "visible",
        backendPrompt: "expanded backend",
        artifacts: [
          {
            id: "chip-1",
            kind: "snippet",
            filePath: "src/a.ts",
            startLine: 1,
            endLine: 2,
            code: "const x = 1;",
          },
        ],
      },
    });

    expect(payload.message).toBe("expanded backend");
    expect(JSON.stringify(payload)).not.toContain("visible");
    expect(JSON.stringify(payload)).not.toContain("artifacts");
  });
});
