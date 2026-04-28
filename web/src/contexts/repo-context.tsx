"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface RepoMetadata {
  id: string;
  user_id: string;
  name: string;
  url: string;
  created_at: string;
  lastIndexed?: string;
  fileCount?: number;
  annotationCount?: number;
  prCount?: number;
}

interface RepoContextType {
  repo: RepoMetadata | null;
  loading: boolean;
  error: Error | null;
  refreshRepo: () => Promise<void>;
}

const RepoContext = createContext<RepoContextType>({
  repo: null,
  loading: true,
  error: null,
  refreshRepo: async () => {},
});

export function RepoProvider({ children, repoId }: { children: React.ReactNode; repoId: string }) {
  const [repo, setRepo] = useState<RepoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const toError = (value: unknown, fallback: string) => {
    if (value instanceof Error) return value;
    if (typeof value === "string" && value.trim()) return new Error(value);
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const message = [obj.message, obj.error_description, obj.details, obj.hint]
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .join(" | ");
      if (message) return new Error(message);
    }
    return new Error(fallback);
  };

  const fetchRepo = useCallback(async () => {
    if (!repoId) return;

    if (!isUuid(repoId)) {
      setRepo({
        id: repoId,
        user_id: "demo",
        name: repoId === "demo" ? "Demo Repository" : repoId,
        url: "",
        created_at: new Date().toISOString(),
      });
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/backend/repo/${repoId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch repository");
      }
      const data = await res.json();

      setRepo({
        ...data,
        url: data.github_url || "",
        lastIndexed: data.last_indexed,
        fileCount: data.file_count,
        annotationCount: data.annotation_count,
      } as RepoMetadata);
    } catch (err) {
      const normalizedError = toError(err, "Failed to fetch repository");
      console.error("Error fetching repo:", normalizedError.message);
      setError(normalizedError);
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    fetchRepo();
  }, [fetchRepo]);

  return (
    <RepoContext.Provider value={{ repo, loading, error, refreshRepo: fetchRepo }}>
      {children}
    </RepoContext.Provider>
  );
}

export function useRepo() {
  const context = useContext(RepoContext);
  if (context === undefined) {
    throw new Error("useRepo must be used within a RepoProvider");
  }
  return context;
}
