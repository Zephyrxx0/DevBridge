"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ReportMeta = {
  filename: string;
  size: number;
  modified_at: number;
};

type ReportContent = {
  filename: string;
  content: string;
};

type AccessState = "loading" | "ready" | "denied" | "error";

function MarkdownBlock({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1 text-sm leading-6 text-foreground">
      {lines.map((line, index) => {
        if (line.startsWith("### ")) {
          return <h3 key={index} className="pt-2 text-base font-semibold">{line.slice(4)}</h3>;
        }
        if (line.startsWith("## ")) {
          return <h2 key={index} className="pt-3 text-lg font-semibold">{line.slice(3)}</h2>;
        }
        if (line.startsWith("# ")) {
          return <h1 key={index} className="pt-3 text-xl font-semibold">{line.slice(2)}</h1>;
        }
        if (line.startsWith("- ")) {
          return (
            <li key={index} className="ml-5 list-disc">
              {line.slice(2)}
            </li>
          );
        }
        if (line.trim().length === 0) {
          return <div key={index} className="h-2" />;
        }

        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

export default function RepoAdminPage() {
  const params = useParams<{ id: string }>();
  const repoId = String(params.id ?? "");

  const [state, setState] = useState<AccessState>("loading");
  const [reports, setReports] = useState<ReportContent[]>([]);

  const apiBase = "/api/backend";

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      setState("loading");
      setReports([]);

      const listResponse = await fetch(`${apiBase}/admin/repo/${repoId}/reports`);

      if (cancelled) return;

      if (listResponse.status === 401 || listResponse.status === 403) {
        setState("denied");
        return;
      }

      if (!listResponse.ok) {
        setState("error");
        return;
      }

      const payload = (await listResponse.json()) as { reports?: ReportMeta[] };
      const items = (payload.reports ?? []).filter((item) => item.filename.endsWith(".md"));

      if (items.length === 0) {
        setState("ready");
        return;
      }

      const contentResponses = await Promise.all(
        items.map(async (item) => {
          const response = await fetch(`${apiBase}/admin/reports/${encodeURIComponent(item.filename)}`);

          if (response.status === 401 || response.status === 403) {
            return { denied: true } as const;
          }
          if (!response.ok) {
            return null;
          }

          const body = (await response.json()) as ReportContent;
          return body;
        })
      );

      if (cancelled) return;

      if (contentResponses.some((item) => item && "denied" in item)) {
        setState("denied");
        return;
      }

      const validReports = contentResponses.filter(
        (item): item is ReportContent => Boolean(item && "content" in item)
      );
      setReports(validReports);
      setState("ready");
    }

    if (repoId) {
      void loadReports();
    }

    return () => {
      cancelled = true;
    };
  }, [apiBase, repoId]);

  const headerBadge = useMemo(() => {
    if (state === "loading") return "Loading";
    if (state === "denied") return "Access Denied";
    return `${reports.length} Report${reports.length === 1 ? "" : "s"}`;
  }, [reports.length, state]);

  return (
    <div className="w-full min-h-screen bg-background text-foreground px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Intern Confusion Reports</h1>
            <p className="text-sm text-muted-foreground">Repository: {repoId}</p>
          </div>
          <Badge variant="neutral">{headerBadge}</Badge>
        </div>

        {state === "loading" && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardHeader>
                  <Skeleton className="h-5 w-56" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-[75%]" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {state === "denied" && (
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              You do not have permission to view repository confusion reports.
            </CardContent>
          </Card>
        )}

        {state === "error" && (
          <Card>
            <CardHeader>
              <CardTitle>Failed to load topics</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Failed to load topics. Please check your connection and try again.
            </CardContent>
          </Card>
        )}

        {state === "ready" && reports.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No confusion topics logged</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Check back later after developers have queried the models.
            </CardContent>
          </Card>
        )}

        {state === "ready" && reports.length > 0 && (
          <div className="space-y-4 overflow-y-auto pr-1">
            {reports.map((report) => (
              <Card key={report.filename}>
                <CardHeader>
                  <CardTitle className="text-base">{report.filename}</CardTitle>
                </CardHeader>
                <CardContent>
                  <MarkdownBlock content={report.content} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
