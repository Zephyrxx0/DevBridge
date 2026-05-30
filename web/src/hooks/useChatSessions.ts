import { useCallback, useEffect, useState } from "react";

import type { ChatSession } from "@/components/chat/HistorySidebar";

type UseChatSessionsResult = {
  sessions: ChatSession[];
  activeSessionId: string | null;
  loadingSessions: boolean;
  setActiveSessionId: (sessionId: string | null) => void;
  createSession: () => Promise<ChatSession | null>;
  renameSession: (sessionId: string, newTitle: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearSession: (sessionId: string) => Promise<void>;
  loadSessions: () => Promise<void>;
};

export function useChatSessions(repoId: string, apiUrl: string): UseChatSessionsResult {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const createSession = useCallback(async (): Promise<ChatSession | null> => {
    const response = await fetch(`${apiUrl}/repo/${repoId}/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_id: repoId, title: "New chat" }),
    });

    if (!response.ok) return null;

    const created = (await response.json()) as ChatSession;
    setSessions((prev) => [created, ...prev]);
    setActiveSessionId(created.id);
    return created;
  }, [apiUrl, repoId]);

  const renameSession = useCallback(
    async (sessionId: string, newTitle: string): Promise<void> => {
      const normalizedTitle = newTitle.trim();
      if (!normalizedTitle) return;

      const response = await fetch(`${apiUrl}/repo/${repoId}/chats/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: normalizedTitle }),
      });

      if (!response.ok) return;

      setSessions((prev) => prev.map((session) => (session.id === sessionId ? { ...session, title: normalizedTitle } : session)));
    },
    [apiUrl, repoId]
  );

  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      const response = await fetch(`${apiUrl}/repo/${repoId}/chats/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) return;

      const previousSessions = sessions;
      const remaining = previousSessions.filter((session) => session.id !== sessionId);
      setSessions(remaining);

      if (activeSessionId !== sessionId) return;

      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
        return;
      }

      const created = await createSession();
      if (!created) {
        setActiveSessionId(null);
      }
    },
    [activeSessionId, apiUrl, createSession, repoId, sessions]
  );

  const clearSession = useCallback(
    async (sessionId: string): Promise<void> => {
      const response = await fetch(`${apiUrl}/chats/${sessionId}/messages`, {
        method: "DELETE",
      });

      if (!response.ok) return;

      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                last_message: undefined,
              }
            : session
        )
      );
    },
    [apiUrl]
  );

  const loadSessions = useCallback(async (): Promise<void> => {
    if (!repoId) {
      setSessions([]);
      setActiveSessionId(null);
      setLoadingSessions(false);
      return;
    }

    setLoadingSessions(true);
    try {
      const response = await fetch(`${apiUrl}/repo/${repoId}/chats`);
      if (!response.ok) return;

      const data = (await response.json()) as ChatSession[];
      setSessions(data);

      if (data.length === 0) {
        const created = await createSession();
        if (!created) {
          setActiveSessionId(null);
        }
        return;
      }

      const savedSessionId = localStorage.getItem(`repo:${repoId}:activeSessionId`);
      const hasSavedSession = savedSessionId ? data.some((session) => session.id === savedSessionId) : false;
      setActiveSessionId(hasSavedSession ? savedSessionId : data[0].id);
    } finally {
      setLoadingSessions(false);
    }
  }, [apiUrl, createSession, repoId]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!repoId) return;

    if (activeSessionId) {
      localStorage.setItem(`repo:${repoId}:activeSessionId`, activeSessionId);
      return;
    }

    localStorage.removeItem(`repo:${repoId}:activeSessionId`);
  }, [activeSessionId, repoId]);

  return {
    sessions,
    activeSessionId,
    loadingSessions,
    setActiveSessionId,
    createSession,
    renameSession,
    deleteSession,
    clearSession,
    loadSessions,
  };
}
