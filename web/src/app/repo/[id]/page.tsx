"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { ChatShell } from "@/components/chat/ChatShell";
import { useRepo } from "@/contexts/repo-context";

export default function RepoWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const repoId = String(params.id ?? "");

  const { repo, error: repoError, loading: repoLoading } = useRepo();

  useEffect(() => {
    if (repoLoading) return;
    if (!repoError) return;
    router.replace("/dashboard");
  }, [repoError, repoLoading, router]);

  return <ChatShell repoId={repoId} repo={repo} apiUrl="/api/backend" />;
}
