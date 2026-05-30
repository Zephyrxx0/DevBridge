import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ChatInput } from "../ChatInput";
import type { SnippetChip } from "../types";

jest.mock("@/components/ai-elements/prompt-input", () => {
  const React = require("react");
  return {
    PromptInput: ({ children, onSubmit, className }: any) => (
      <form
        className={className}
        onSubmit={(event) => {
          event.preventDefault();
          const textarea = event.currentTarget.querySelector("textarea") as HTMLTextAreaElement | null;
          onSubmit({ text: textarea?.value ?? "", files: [{ type: "file", filename: "x.txt", mediaType: "text/plain", url: "blob:test" }] }, event);
        }}
      >
        {children}
      </form>
    ),
    PromptInputTextarea: React.forwardRef(({ onChange, onKeyDown, value, ...props }: any, ref) => (
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) return;
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        {...props}
      />
    )),
    PromptInputSubmit: ({ children, onStop, ...props }: any) => <button type="submit" {...props}>{children}</button>,
  };
});

describe("ChatInput", () => {
  const onSubmit = jest.fn();
  const onRemoveSnippet = jest.fn();

  const chips: SnippetChip[] = [
    { id: "s1", kind: "snippet", filePath: "src/a.ts", startLine: 2, endLine: 5, code: "const a = 1;" },
    { id: "f1", kind: "file", filePath: "src/b.ts", startLine: 1, endLine: 1, code: "" },
    { id: "d1", kind: "folder", filePath: "src/pages", startLine: 1, endLine: 1, code: "" },
  ];

  beforeEach(() => {
    onSubmit.mockReset();
    onRemoveSnippet.mockReset();
  });

  const renderInput = (input = "") =>
    render(
      <ChatInput
        input={input}
        setInput={jest.fn()}
        isLoading={false}
        snippetChips={chips}
        onRemoveSnippet={onRemoveSnippet}
        onDropSnippet={jest.fn()}
        onSubmit={onSubmit}
        fileTree={{ type: "directory", name: "root", path: "", children: [{ type: "file", name: "alpha.ts", path: "src/alp.ts" }] }}
      />
    );

  it("submits typed payload on Enter for non-empty text", () => {
    renderInput("hello");
    const textarea = screen.getByPlaceholderText("Ask about your code, use @path/to/file, or drop snippet here...");
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith({ text: "hello" });
  });

  it("does not submit on Shift+Enter", () => {
    renderInput("hello");
    const textarea = screen.getByPlaceholderText("Ask about your code, use @path/to/file, or drop snippet here...");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mention menu Enter selects mention and does not submit", () => {
    const setInputSpy = jest.fn();
    const MentionHarness = () => {
      const [value, setValue] = useState("@alp");
      return (
        <ChatInput
          input={value}
          setInput={(next) => {
            setValue(next);
            setInputSpy(next);
          }}
          isLoading={false}
          snippetChips={[]}
          onRemoveSnippet={onRemoveSnippet}
          onDropSnippet={jest.fn()}
          onSubmit={onSubmit}
          fileTree={{ type: "directory", name: "root", path: "", children: [{ type: "file", name: "alpha.ts", path: "src/alp.ts" }] }}
        />
      );
    };
    render(
      <MentionHarness />
    );
    const textarea = screen.getByPlaceholderText("Ask about your code, use @path/to/file, or drop snippet here...");
    (textarea as HTMLTextAreaElement).setSelectionRange(4, 4);
    fireEvent.change(textarea, { target: { value: "@alp" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(setInputSpy).toHaveBeenCalledWith("@src/alp.ts ");
  });

  it("mention menu Tab selects mention and does not submit", () => {
    const setInputSpy = jest.fn();
    const MentionHarness = () => {
      const [value, setValue] = useState("@alp");
      return (
        <ChatInput
          input={value}
          setInput={(next) => {
            setValue(next);
            setInputSpy(next);
          }}
          isLoading={false}
          snippetChips={[]}
          onRemoveSnippet={onRemoveSnippet}
          onDropSnippet={jest.fn()}
          onSubmit={onSubmit}
          fileTree={{ type: "directory", name: "root", path: "", children: [{ type: "file", name: "alpha.ts", path: "src/alp.ts" }] }}
        />
      );
    };
    render(
      <MentionHarness />
    );
    const textarea = screen.getByPlaceholderText("Ask about your code, use @path/to/file, or drop snippet here...");
    (textarea as HTMLTextAreaElement).setSelectionRange(4, 4);
    fireEvent.change(textarea, { target: { value: "@alp" } });
    fireEvent.keyDown(textarea, { key: "Tab" });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(setInputSpy).toHaveBeenCalledWith("@src/alp.ts ");
  });

  it("renders scoped chip labels and removes chip immediately", () => {
    renderInput("hello");
    expect(screen.getByText("Snippet · src/a.ts:2-5")).toBeInTheDocument();
    expect(screen.getByText("File · src/b.ts")).toBeInTheDocument();
    expect(screen.getByText("Folder · src/pages · up to 8 files, 8k chars each")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Remove folder context: src/pages"));
    expect(onRemoveSnippet).toHaveBeenCalledWith("d1");
  });
});
