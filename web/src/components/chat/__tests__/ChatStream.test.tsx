import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChatStream } from "../ChatStream";
import type { Message } from "../types";

const mockPlan = {
  summary: "Mock onboarding summary",
  architecture: "Mock architecture",
  setup_commands: ["npm install"],
  key_files: [{ path: "README.md", description: "Start" }],
  steps: [{ title: "Step 1", description: "Do this", files: ["README.md"] }],
};

jest.mock("@/components/onboarding/OnboardingGuide", () => ({
  OnboardingGuide: ({ resumeAtPlan, resumePlan, onComplete }: any) => (
    <div data-testid="onboarding-guide" data-resume-at-plan={resumeAtPlan ? "true" : "false"}>
      <div>{resumePlan?.summary ?? "No resume plan"}</div>
      <button type="button" onClick={() => onComplete?.(mockPlan)}>
        Complete onboarding
      </button>
      <button type="button">Start onboarding</button>
      <div>Choose focus area</div>
    </div>
  ),
}));
jest.mock("@/components/chat/ArtifactViewer", () => ({ ArtifactViewer: () => null }));
jest.mock("@/components/chat/FeedbackButtons", () => ({ FeedbackButtons: () => null }));

jest.mock("@/components/ai-elements/message", () => ({
  Message: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MessageContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  MessageResponse: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ai-elements/conversation", () => ({
  Conversation: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ConversationContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  ConversationScrollButton: () => null,
}));

jest.mock("@/components/ai-elements/shimmer", () => ({
  Shimmer: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ai-elements/reasoning", () => ({
  Reasoning: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReasoningContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReasoningTrigger: () => null,
}));

jest.mock("@/components/ai-elements/tool", () => ({
  Tool: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToolContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToolHeader: () => null,
  ToolInput: () => null,
  ToolOutput: () => null,
}));

jest.mock("@/components/ai-elements/inline-citation", () => ({
  InlineCitation: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InlineCitationText: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InlineCitationCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InlineCitationCardTrigger: () => null,
  InlineCitationCardBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InlineCitationCarousel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InlineCitationCarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InlineCitationCarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InlineCitationCarouselHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InlineCitationCarouselPrev: () => null,
  InlineCitationCarouselNext: () => null,
  InlineCitationCarouselIndex: () => null,
  InlineCitationSource: () => null,
}));

describe("ChatStream onboarding and escalation pins", () => {
  const baseProps = {
    repoId: "repo-1",
    onOpenArtifact: jest.fn(),
    onSelectSource: jest.fn(),
    onOnboardingComplete: jest.fn(),
  };

  const baseMessage: Message = {
    role: "assistant",
    content: "answer",
  };

  it("renders first-run onboarding when empty and not loading", () => {
    render(<ChatStream messages={[]} isLoading={false} {...baseProps} />);
    expect(screen.getByTestId("onboarding-guide")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start onboarding" })).toBeInTheDocument();
    expect(screen.getByText("Choose focus area")).toBeInTheDocument();
  });

  it("renders skeleton and not onboarding during initialization", () => {
    render(<ChatStream messages={[]} isLoading={false} isInitializing={true} {...baseProps} />);
    expect(screen.queryByTestId("onboarding-guide")).not.toBeInTheDocument();
  });

  it("renders escalation indicator when metadata is present", () => {
    render(
      <ChatStream
        messages={[{ ...baseMessage, model_used: "gemini-2.5-flash", cascaded: true }]}
        isLoading={false}
        {...baseProps}
      />
    );

    expect(screen.getByTestId("escalation-indicator")).toBeInTheDocument();
    expect(screen.getByText("Big Model")).toBeInTheDocument();
    expect(screen.getByTestId("escalation-indicator-dot").className).toContain("bg-amber-500");
  });

  it("does not render escalation indicator when metadata is missing", () => {
    render(<ChatStream messages={[baseMessage]} isLoading={false} {...baseProps} />);
    expect(screen.queryByTestId("escalation-indicator")).not.toBeInTheDocument();
  });

  it("shows onboarding ready card for sentinel and reopens overlay", () => {
    render(
      <ChatStream
        messages={[{ role: "assistant", content: "__DEVBRIDGE_ONBOARDING_READY__" }]}
        isLoading={false}
        {...baseProps}
      />
    );

    expect(screen.getByText("Onboarding guide ready.")).toBeInTheDocument();
    const reopenButton = screen.getByRole("button", { name: "Reopen onboarding" });
    fireEvent.click(reopenButton);
    expect(screen.getByTestId("onboarding-guide")).toBeInTheDocument();
  });

  it("completes onboarding and reopens with resume plan", () => {
    const onOnboardingComplete = jest.fn();
    const messages: Message[] = [{ role: "assistant", content: "__DEVBRIDGE_ONBOARDING_READY__" }];

    render(
      <ChatStream
        messages={messages}
        isLoading={false}
        repoId="repo-1"
        onOpenArtifact={jest.fn()}
        onSelectSource={jest.fn()}
        onOnboardingComplete={onOnboardingComplete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Reopen onboarding" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete onboarding" }));

    expect(onOnboardingComplete).toHaveBeenCalledWith(mockPlan);

    fireEvent.click(screen.getByRole("button", { name: "Reopen onboarding" }));

    expect(screen.getByTestId("onboarding-guide")).toHaveAttribute("data-resume-at-plan", "true");
    expect(screen.getByText(mockPlan.summary)).toBeInTheDocument();
  });
});
