import { renderHook, act } from "@testing-library/react";
import { useOnboarding } from "./useOnboarding";

// Mock EventSource
class MockEventSource {
  url: string;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  readyState = 1;
  close = jest.fn(() => {
    this.readyState = 2;
  });

  static instances: MockEventSource[] = [];

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

}

describe("useOnboarding", () => {
  const originalEventSource = global.EventSource;
  const originalFetch = global.fetch;

  beforeAll(() => {
    (global as any).EventSource = MockEventSource;
  });

  afterAll(() => {
    global.EventSource = originalEventSource;
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    MockEventSource.instances = [];
    global.fetch = jest.fn(async () => ({
      ok: false,
      json: async () => ({}),
    })) as unknown as typeof fetch;
  });

  it("starts in IDLE-equivalent state", () => {
    const { result } = renderHook(() => useOnboarding("123"));
    expect(result.current.loading).toBe(false);
    expect(result.current.plan).toBeNull();
    expect(result.current.status).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("checks cached onboarding plan before opening EventSource", async () => {
    const { result } = renderHook(() => useOnboarding("123"));
    
    await act(async () => {
      await result.current.startGeneration("Backend");
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/backend/repo/123/onboarding-plan");
    expect(result.current.loading).toBe(true);
    expect(MockEventSource.instances.length).toBe(1);
    expect(MockEventSource.instances[0].url).toBe("/api/backend/repo/123/start-here?focus=Backend");
  });

  it("should update status on receiving status message", async () => {
    const { result } = renderHook(() => useOnboarding("123"));
    
    await act(async () => {
      await result.current.startGeneration("Backend");
    });

    const es = MockEventSource.instances[0];
    act(() => {
      es.onmessage?.({
        data: JSON.stringify({ type: "status", content: "Analyzing entry points..." }),
      });
    });

    expect(result.current.status.length).toBe(1);
    expect(result.current.status[0].message).toBe("Analyzing entry points...");
  });

  it("sets PLAN_READY-equivalent state on plan message", async () => {
    const { result } = renderHook(() => useOnboarding("123"));
    
    await act(async () => {
      await result.current.startGeneration("Frontend");
    });

    const es = MockEventSource.instances[0];
    const mockPlan = {
      summary: "Test",
      architecture: "Test Arch",
      setup_commands: [],
      key_files: [],
      steps: []
    };

    act(() => {
      es.onmessage?.({
        data: JSON.stringify({ type: "plan", content: mockPlan }),
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.plan).toEqual(mockPlan);
  });

  it("should handle error messages correctly", async () => {
    const { result } = renderHook(() => useOnboarding("123"));
    
    await act(async () => {
      await result.current.startGeneration("Frontend");
    });

    const es = MockEventSource.instances[0];

    act(() => {
      es.onmessage?.({
        data: JSON.stringify({ type: "error", message: "Validation failed" }),
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Validation failed");
  });

  it("should handle connection errors", async () => {
    const { result } = renderHook(() => useOnboarding("123"));
    
    await act(async () => {
      await result.current.startGeneration("Frontend");
    });

    const es = MockEventSource.instances[0];

    act(() => {
      es.onerror?.(new Event("error"));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Connection lost. Please try again.");
  });

  it("cleans up EventSource on unmount", async () => {
    const { result, unmount } = renderHook(() => useOnboarding("123"));
    
    await act(async () => {
      await result.current.startGeneration("Backend");
    });

    const es = MockEventSource.instances[0];
    unmount();

    expect(es.close).toHaveBeenCalled();
  });

  it("should reuse cached onboarding plan when available", async () => {
    const cachedPlan = {
      summary: "Cached Summary",
      architecture: "Cached Architecture",
      setup_commands: ["npm install"],
      key_files: [{ path: "README.md", description: "Entry point" }],
      steps: [],
    };

    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => cachedPlan,
    })) as unknown as typeof fetch;

    const { result } = renderHook(() => useOnboarding("123"));

    await act(async () => {
      await result.current.startGeneration("Exploring");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.plan).toEqual(cachedPlan);
    expect(MockEventSource.instances.length).toBe(0);
  });

  it("cancelGeneration closes EventSource, clears error, and preserves existing plan", async () => {
    const cachedPlan = {
      summary: "Cached Summary",
      architecture: "Cached Architecture",
      setup_commands: [],
      key_files: [],
      steps: [],
    };

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => cachedPlan }) as unknown as typeof fetch;

    const { result } = renderHook(() => useOnboarding("123"));

    await act(async () => {
      await result.current.startGeneration("Backend");
    });

    const es = MockEventSource.instances[0];
    act(() => {
      es.onmessage?.({ data: JSON.stringify({ type: "error", message: "Boom" }) });
    });
    expect(result.current.error).toBe("Boom");

    act(() => {
      result.current.cancelGeneration();
    });

    expect(es.close).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    await act(async () => {
      await result.current.startGeneration("Frontend");
    });

    expect(result.current.plan).toEqual(cachedPlan);

    act(() => {
      result.current.cancelGeneration();
    });

    expect(result.current.plan).toEqual(cachedPlan);
  });

  it("try-again after errors resets status/error and opens new EventSource", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    const { result } = renderHook(() => useOnboarding("123"));

    await act(async () => {
      await result.current.startGeneration("Backend");
    });

    const first = MockEventSource.instances[0];
    act(() => {
      first.onmessage?.({ data: JSON.stringify({ type: "status", content: "Phase one" }) });
      first.onmessage?.({ data: JSON.stringify({ type: "error", message: "Validation failed" }) });
    });

    expect(result.current.status).toHaveLength(1);
    expect(result.current.error).toBe("Validation failed");

    await act(async () => {
      await result.current.startGeneration("Frontend");
    });

    expect(result.current.status).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(MockEventSource.instances).toHaveLength(2);
    expect(MockEventSource.instances[1].url).toBe("/api/backend/repo/123/start-here?focus=Frontend");
  });
});
