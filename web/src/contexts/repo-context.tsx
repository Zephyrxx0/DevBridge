"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
}

const RepoContext = createContext<RepoContextType>({
  repo: null,
  loading: true,
  error: null,
});

export function RepoProvider({ children, repoId }: { children: React.ReactNode; repoId: string }) {
  const [repo, setRepo] = useState<RepoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchRepo() {
      if (!repoId) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("repositories")
          .select("*")
          .eq("id", repoId)
          .single();

        if (error) {
          throw error;
        }

        setRepo(data as RepoMetadata);
      } catch (err) {
        console.error("Error fetching repo:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch repository"));
      } finally {
        setLoading(false);
      }
    }

    fetchRepo();
  }, [repoId, supabase]);

  return (
    <RepoContext.Provider value={{ repo, loading, error }}>
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
