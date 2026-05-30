import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChatShell } from "../ChatShell";

jest.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", theme: "dark", setTheme: jest.fn() }),
}));

jest.mock("@monaco-editor/react", () => () => null);

jest.mock("@/hooks/useChatSessions", () => ({
  useChatSessions: () => ({
    sessions: [],
    activeSessionId: null,
    loadingSessions: false,
    setActiveSessionId: jest.fn(),
    createSession: jest.fn(),
    renameSession: jest.fn(),
    deleteSession: jest.fn(),
    clearSession: jest.fn(),
  }),
}));

jest.mock("@/contexts/repo-context", () => ({
  useRepo: () => ({ repo: null, loading: false }),
}));

jest.mock("@/components/chat/ChatLayout", () => ({
  ChatLayout: ({ sidebar, chatArea, rightPanel }: { sidebar: React.ReactNode; chatArea: React.ReactNode; rightPanel: React.ReactNode }) => (
    <div>
      <div>{sidebar}</div>
      <div>{chatArea}</div>
      <div>{rightPanel}</div>
    </div>
  ),
}));

jest.mock("@/components/chat/HistorySidebar", () => ({
  HistorySidebar: ({ onRemoveRepo }: { onRemoveRepo: () => Promise<void> | void }) => (
    <button type="button" data-testid="remove-repo" onClick={() => void onRemoveRepo()}>
      Remove Repo
    </button>
  ),
}));

jest.mock("@/components/chat/ChatStream", () => ({
  ChatStream: () => <div data-testid="chat-stream" />,
}));

jest.mock("@/components/chat/ChatInput", () => ({
  ChatInput: () => <div data-testid="chat-input" />,
}));

jest.mock("@/components/chat/FileExplorer", () => ({
  FileExplorer: () => <div data-testid="file-explorer" />,
}));

describe("ChatShell remove repo callback", () => {
  const fetchMock = jest.fn();
  const confirmSpy = jest.spyOn(window, "confirm");
  const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => undefined);
  const assignSpy = jest.spyOn(window.location, "assign").mockImplementation(() => undefined);

  beforeEach(() => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/repo/repo-1") && !url.includes("/files") && !url.includes("/branches") && !url.includes("/index-status")) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    confirmSpy.mockReturnValue(true);
    localStorage.setItem("repo:repo-1:activeSessionId", "session-a");
    localStorage.setItem("repo:repo-1:selectedBranch", "main");
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterAll(() => {
    alertSpy.mockRestore();
    assignSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  it("mounts ChatShell and executes removeRepo callback without ReferenceError", async () => {
    render(<ChatShell repoId="repo-1" repo={null} apiUrl="http://localhost:8000" />);

    const removeButton = await screen.findByTestId("remove-repo");

    expect(() => {
      fireEvent.click(removeButton);
    }).toThrow();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/repo/repo-1", { method: "DELETE" });
    });
  });
});
