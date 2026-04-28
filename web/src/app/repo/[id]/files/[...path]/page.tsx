"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Editor, { OnMount } from "@monaco-editor/react";
import { ChevronLeft, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Annotation {
  id: string;
  line: number;
  comment: string;
  author: string;
  tags: string[];
  upvotes: number;
  created_at: string;
}

interface FileContent {
  content: string;
  language: string;
  line_count: number;
  annotations: Annotation[];
}

const languageMap: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  css: "css",
  html: "html",
  json: "json",
  md: "markdown",
  sql: "sql",
  sh: "shell",
};

function detectLanguage(filePath: string, fallback: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  return languageMap[ext] || fallback || "plaintext";
}

export default function CodeViewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const repoId = params.id as string;
  const pathArray = (params.path as string[]) || [];
  const filePath = pathArray.join("/");
  const lineParam = Number(searchParams.get("line") || 0);

  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const editorRef = useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api/backend";

  useEffect(() => {
    async function fetchFileContent() {
      setLoading(true);
      try {
        const response = await fetch(`${apiUrl}/repo/${repoId}/files/${filePath}`);
        if (!response.ok) return;
        const data = (await response.json()) as FileContent;
        setFileContent(data);
      } finally {
        setLoading(false);
      }
    }
    fetchFileContent();
  }, [apiUrl, repoId, filePath]);

  const sortedAnnotations = useMemo(
    () => (fileContent?.annotations || []).slice().sort((a, b) => a.line - b.line),
    [fileContent?.annotations],
  );

  const applyDecorations = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const nextDecorations: import("monaco-editor").editor.IModelDeltaDecoration[] = sortedAnnotations.map((ann) => ({
      range: new monaco.Range(ann.line, 1, ann.line, 1),
      options: {
        isWholeLine: true,
        linesDecorationsClassName: "db-annotation-gutter",
        className: "db-annotation-line",
        glyphMarginClassName: "db-annotation-glyph",
        glyphMarginHoverMessage: { value: ann.comment },
      },
    }));

    if (lineParam > 0) {
      nextDecorations.push({
        range: new monaco.Range(lineParam, 1, lineParam, 1),
        options: {
          isWholeLine: true,
          className: "db-highlight-line",
          linesDecorationsClassName: "db-highlight-gutter",
        },
      });
      editor.revealLineInCenter(lineParam);
      editor.setPosition({ lineNumber: lineParam, column: 1 });
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, nextDecorations);
  }, [lineParam, sortedAnnotations]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyDecorations();
  };

  useEffect(() => {
    applyDecorations();
  }, [applyDecorations]);

  const language = detectLanguage(filePath, fileContent?.language || "plaintext");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/repo/${repoId}/files`}>
                <Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4" /></Button>
              </Link>
              <div>
                <p className="text-xs text-muted-foreground">Code Browser</p>
                <h1 className="font-mono text-sm font-semibold">{filePath}</h1>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {fileContent?.line_count || 0} lines • {language} • {sortedAnnotations.length} annotations
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        <div className="min-w-0 flex-1">
          <Card className="overflow-hidden">
            <div className="h-[72vh]">
              {loading ? (
                <div className="h-full animate-pulse bg-muted/50" />
              ) : (
                <Editor
                  language={language}
                  value={fileContent?.content || ""}
                  onMount={handleEditorMount}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    glyphMargin: true,
                    lineNumbersMinChars: 4,
                    wordWrap: "off",
                    automaticLayout: true,
                  }}
                />
              )}
            </div>
          </Card>
        </div>

        <aside className="w-80 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Annotations</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[68vh] space-y-3 overflow-y-auto">
              {sortedAnnotations.length === 0 ? (
                <p className="text-xs text-muted-foreground">No annotations for this file yet.</p>
              ) : (
                sortedAnnotations.map((ann) => (
                  <button
                    key={ann.id}
                    type="button"
                    onClick={() => {
                      setSelectedAnnotationId(ann.id);
                      if (editorRef.current) {
                        editorRef.current.revealLineInCenter(ann.line);
                        editorRef.current.setPosition({ lineNumber: ann.line, column: 1 });
                        editorRef.current.focus();
                      }
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedAnnotationId === ann.id ? "border-primary bg-primary/10" : "border-border/40 hover:bg-muted/30"}`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-xs text-primary">Line {ann.line}</span>
                      <span className="text-xs text-muted-foreground">{ann.author}</span>
                    </div>
                    <p className="mb-2 line-clamp-3 text-sm">{ann.comment}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ThumbsUp className="h-3 w-3" /> {ann.upvotes}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
