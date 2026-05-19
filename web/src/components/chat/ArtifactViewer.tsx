"use client";

import {
  Artifact,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import {
  JSXPreview,
  JSXPreviewContent,
  JSXPreviewError,
} from "@/components/ai-elements/jsx-preview";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { Badge } from "@/components/ui/badge";

type ArtifactViewerProps = {
  title: string;
  code: string;
  language?: string;
  isJsxPreview?: boolean;
};

type CodeLanguage = Parameters<typeof CodeBlock>[0]["language"];

const BUNDLED_LANGUAGES = new Set<string>([
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "json",
  "markdown",
  "bash",
  "shell",
  "python",
  "go",
  "rust",
  "java",
  "css",
  "html",
  "sql",
  "yaml",
]);

const toBundledLanguage = (language?: string): CodeLanguage => {
  if (!language) return "markdown" as CodeLanguage;

  const normalized = language.toLowerCase();
  if (normalized === "ts") return "typescript";
  if (normalized === "js") return "javascript";
  if (normalized === "sh") return "shell";
  if (normalized === "md") return "markdown";
  if (normalized === "yml") return "yaml";

  if (BUNDLED_LANGUAGES.has(normalized)) {
    return normalized as CodeLanguage;
  }

  return "markdown" as CodeLanguage;
};

const sanitizeJsx = (input: string): string =>
  input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*\{[^}]*\}/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\shref\s*=\s*"javascript:[^"]*"/gi, "");

export function ArtifactViewer({
  title,
  code,
  language,
  isJsxPreview = false,
}: ArtifactViewerProps) {
  const bundledLanguage = toBundledLanguage(language);
  const safeJsx = isJsxPreview ? sanitizeJsx(code) : code;

  return (
    <Artifact className="border-[var(--border)] bg-[var(--surface-1)]">
      <ArtifactHeader className="border-[var(--border)] bg-[var(--surface-2)]">
        <div>
          <ArtifactTitle>{title}</ArtifactTitle>
          <ArtifactDescription>
            {isJsxPreview
              ? "Artifact + JSX preview (sanitized allow-list rendering)"
              : "Artifact code preview"}
          </ArtifactDescription>
        </div>
        <Badge variant="secondary" className="font-mono text-[10px] uppercase">
          {isJsxPreview ? "jsx-preview" : bundledLanguage}
        </Badge>
      </ArtifactHeader>

      <ArtifactContent className="space-y-4">
        {isJsxPreview ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-auto rounded-lg border border-[var(--border)]">
              <CodeBlock code={safeJsx} language={bundledLanguage} />
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <JSXPreview jsx={safeJsx}>
                <JSXPreviewError />
                <JSXPreviewContent className="text-sm" />
              </JSXPreview>
            </div>
          </div>
        ) : (
          <div className="overflow-auto rounded-lg border border-[var(--border)]">
            <CodeBlock code={code} language={bundledLanguage} />
          </div>
        )}
      </ArtifactContent>
    </Artifact>
  );
}
