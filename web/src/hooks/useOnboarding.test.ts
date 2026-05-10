import { renderHook, act } from "@testing-library/react";
import { useOnboarding } from "./useOnboarding";

// Mock EventSource
class MockEventSource {
  url: string;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  static instances: MockEventSource[] = [];

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    // mock close
  }
}

describe("useOnboarding", () => {
  const originalEventSource = global.EventSource;

  beforeAll(() => {
    (global as any).EventSource = MockEventSource;
  });

  afterAll(() => {
    global.EventSource = originalEventSource;
  });

  beforeEach(() => {
    MockEventSource.instances = [];
  });

  it("should initialize correctly", () => {
    const { result } = renderHook(() => useOnboarding("123"));
    expect(result.current.loading).toBe(false);
    expect(result.current.plan).toBeNull();
    expect(result.current.status).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("should open EventSource with correct URL and focus param", () => {
    const { result } = renderHook(() => useOnboarding("123"));
    
    act(() => {
      result.current.startGeneration("Backend");
    });

    expect(result.current.loading).toBe(true);
    expect(MockEventSource.instances.length).toBe(1);
    expect(MockEventSource.instances[0].url).toBe("/api/backend/repo/123/start-here?focus=Backend");
  });

  it("should update status on receiving status message", () => {
    const { result } = renderHook(() => useOnboarding("123"));
    
    act(() => {
      result.current.startGeneration("Backend");
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

  it("should complete loading and set plan on receiving plan message", () => {
    const { result } = renderHook(() => useOnboarding("123"));
    
    act(() => {
      result.current.startGeneration("Frontend");
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

  it("should handle error messages correctly", () => {
    const { result } = renderHook(() => useOnboarding("123"));
    
    act(() => {
      result.current.startGeneration("Frontend");
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

  it("should handle connection errors", () => {
    const { result } = renderHook(() => useOnboarding("123"));
    
    act(() => {
      result.current.startGeneration("Frontend");
    });

    const es = MockEventSource.instances[0];

    act(() => {
      es.onerror?.(new Event("error"));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Connection lost. Please try again.");
  });

  it("should clean up EventSource on unmount", () => {
    const { result, unmount } = renderHook(() => useOnboarding("123"));
    
    act(() => {
      result.current.startGeneration("Backend");
    });

    const es = MockEventSource.instances[0];
    const closeSpy = jest.spyOn(es, "close");

    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });
});
