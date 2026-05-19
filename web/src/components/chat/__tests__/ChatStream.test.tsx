import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ChatStream } from "../ChatStream";
import type { Message } from "../types";

jest.mock("@/components/onboarding/OnboardingGuide", () => ({ OnboardingGuide: () => <div>Onboarding</div> }));
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

describe("ChatStream escalation indicator", () => {
  const baseMessage: Message = {
    role: "assistant",
    content: "answer",
  };

  it("renders escalation indicator when metadata is present", () => {
    render(
      <ChatStream
        messages={[{ ...baseMessage, model_used: "qwen2.5-72b", cascaded: true }]}
        isLoading={false}
        repoId="repo-1"
        onOpenArtifact={jest.fn()}
        onSelectSource={jest.fn()}
      />
    );

    expect(screen.getByTestId("escalation-indicator")).toBeInTheDocument();
    expect(screen.getByText("Big Model")).toBeInTheDocument();
    expect(screen.getByTestId("escalation-indicator-dot").className).toContain("bg-amber-500");
  });

  it("does not render escalation indicator when metadata is missing", () => {
    render(
      <ChatStream
        messages={[baseMessage]}
        isLoading={false}
        repoId="repo-1"
        onOpenArtifact={jest.fn()}
        onSelectSource={jest.fn()}
      />
    );

    expect(screen.queryByTestId("escalation-indicator")).not.toBeInTheDocument();
  });
});
