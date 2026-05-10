import { useState, useCallback, useEffect, useRef } from "react";

interface StatusMessage {
  id: string;
  message: string;
  timestamp: string;
}

export interface OnboardingPlan {
  summary: string;
  architecture: string;
  setup_commands: string[];
  key_files: Array<{
    path: string;
    description: string;
  }>;
  steps: Array<{
    title: string;
    description: string;
    files: string[];
  }>;
}

interface UseOnboardingReturn {
  status: StatusMessage[];
  plan: OnboardingPlan | null;
  loading: boolean;
  error: string | null;
  startGeneration: (focus: string) => void;
  reset: () => void;
}

export function useOnboarding(repoId: string): UseOnboardingReturn {
  const [status, setStatus] = useState<StatusMessage[]>([]);
  const [plan, setPlan] = useState<OnboardingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setStatus([]);
    setPlan(null);
    setLoading(false);
    setError(null);
  }, [cleanup]);

  const startGeneration = useCallback(
    (focus: string) => {
      reset();
      setLoading(true);

      const encodedFocus = encodeURIComponent(focus);
      const url = `/api/backend/repo/${repoId}/start-here?focus=${encodedFocus}`;
      
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "status") {
            setStatus((prev) => [
              ...prev,
              {
                id: Math.random().toString(36).substring(7),
                message: data.content,
                timestamp: new Date().toISOString(),
              },
            ]);
          } else if (data.type === "plan") {
            setPlan(data.content);
            setLoading(false);
            cleanup();
          } else if (data.type === "error") {
            setError(data.message || "An error occurred");
            setLoading(false);
            cleanup();
          }
        } catch (err) {
          console.error("Failed to parse SSE message", err);
        }
      };

      es.onerror = (err) => {
        console.error("SSE error", err);
        setError("Connection lost. Please try again.");
        setLoading(false);
        cleanup();
      };
    },
    [repoId, reset, cleanup]
  );

  return { status, plan, loading, error, startGeneration, reset };
}
