export type SourceReference = {
  file_path: string;
  function_name?: string;
  start_line: number;
  end_line: number;
  similarity?: number;
};

type BaseContextChip = {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  code: string;
};

export type SnippetContextChip = BaseContextChip & {
  kind: "snippet";
  startLine: number;
  endLine: number;
  code: string;
};

export type FileContextChip = BaseContextChip & {
  kind: "file";
  code: "";
};

export type FolderContextChip = BaseContextChip & {
  kind: "folder";
  code: "";
};

type LegacyContextChip = BaseContextChip & {
  kind: "snippet" | "file" | "folder" | undefined;
};

export type ChatContextChip = SnippetContextChip | FileContextChip | FolderContextChip | LegacyContextChip;

export type SnippetChip = ChatContextChip;

export interface Message {
  role: "user" | "assistant";
  content: string;
  fallback?: boolean;
  model_used?: string;
  cascaded?: boolean;
  sources?: SourceReference[];
  artifacts?: ChatContextChip[];
}
