export type SourceReference = {
  file_path: string;
  function_name?: string;
  start_line: number;
  end_line: number;
  similarity?: number;
};

export type SnippetChip = {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  code: string;
  kind?: "snippet" | "file" | "folder";
};

export interface Message {
  role: "user" | "assistant";
  content: string;
  fallback?: boolean;
  sources?: SourceReference[];
  artifacts?: SnippetChip[];
}