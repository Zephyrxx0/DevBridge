"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, ChevronLeft, Link2, Plus, Search } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { Markdown } from "tiptap-markdown";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

type Note = {
  id: string;
  repo_id: string;
  author_id: string;
  title: string;
  content_markdown: string | null;
  created_at: string;
  updated_at: string;
};

type NoteLink = {
  source_note_id: string;
  target_note_id: string;
  created_at: string;
};

const NOTE_LINK_PATTERN = /\[\[([^\]]+)\]\]/g;

function extractNoteTitles(markdown: string) {
  const matches = markdown.matchAll(NOTE_LINK_PATTERN);
  const titles = new Set<string>();
  for (const match of matches) {
    const title = match[1]?.trim();
    if (title) titles.add(title);
  }
  return Array.from(titles);
}

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function NotesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const repoId = params.id as string;
  const selectedId = searchParams.get("note") ?? "";
  const supabase = useMemo(() => createClient(), []);

  const [notes, setNotes] = useState<Note[]>([]);
  const [noteLinks, setNoteLinks] = useState<NoteLink[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [linkSuggestions, setLinkSuggestions] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const saveTimeout = useRef<number | null>(null);

  // Track which note ID is currently loaded in the editor — prevents
  // re-setting content when notes state updates during autosave.
  const loadedNoteIdRef = useRef<string>("");

  const activeNote = useMemo(() => {
    if (!selectedId) return notes[0] ?? null;
    return notes.find((item) => item.id === selectedId) ?? null;
  }, [notes, selectedId]);

  // Redirect to first note if none selected and notes exist
  const router = useRouter();
  useEffect(() => {
    if (!selectedId && notes.length > 0 && !loading) {
      router.replace(`/repo/${repoId}/notes?note=${notes[0].id}`);
    }
  }, [selectedId, notes, loading, repoId, router]);

  const editorExtensions = useMemo(() => [
    StarterKit,
    Markdown,
    Typography,
    Placeholder.configure({
      placeholder: "Start writing a note...",
    }),
  ], []);

  const editor = useEditor({
    extensions: editorExtensions,
    content: "",
    autofocus: true,
    immediatelyRender: false,
    // Do NOT use editorProps.handleDOMEvents here — Tiptap manages selection internally
  });

  useEffect(() => {
    if (!repoId) return;
    let mounted = true;

    async function loadNotes() {
      setLoading(true);
      setErrorMessage(null);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? "";
      setCurrentUserId(userId);
      if (authError || !userId) {
        setErrorMessage("You must be signed in to create and edit notes.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("repo_id", repoId)
        .order("updated_at", { ascending: false });

      if (!mounted) return;
      if (error) {
        setErrorMessage(error.message);
      } else {
        setNotes((data ?? []) as Note[]);
      }
      setLoading(false);
    }

    async function loadLinks() {
      const { data } = await supabase.from("note_links").select("*");
      if (!mounted) return;
      setNoteLinks((data ?? []) as NoteLink[]);
    }

    loadNotes();
    loadLinks();

    return () => {
      mounted = false;
    };
  }, [repoId, supabase]);

  // Only set editor content when the *note ID* changes — NOT when note content
  // updates from autosave. This is the fix for the erratic cursor / deleted text bug.
  useEffect(() => {
    if (!editor || !activeNote) return;
    if (loadedNoteIdRef.current === activeNote.id) return; 

    loadedNoteIdRef.current = activeNote.id;
    // Small delay to ensure Tiptap is ready and avoids selection reset if called too fast
    const timeout = setTimeout(() => {
      editor.commands.setContent(activeNote.content_markdown ?? "");
    }, 10);
    return () => clearTimeout(timeout);
  }, [editor, activeNote?.id]);

  const syncNoteLinks = useCallback(async (sourceId: string, markdown: string) => {
    if (!currentUserId) return;
    const titles = extractNoteTitles(markdown);
    if (titles.length === 0) return;

    const { data: existingNotes } = await supabase
      .from("notes")
      .select("id,title")
      .eq("repo_id", repoId);

    const known = new Map((existingNotes ?? []).map((note) => [note.title.toLowerCase(), note]));
    const toLink: string[] = [];

    for (const title of titles) {
      const match = known.get(title.toLowerCase());
      if (match) {
        toLink.push(match.id);
      } else {
        const { data: created } = await supabase
          .from("notes")
          .insert({
            repo_id: repoId,
            author_id: currentUserId,
            title,
            content_markdown: "",
          })
          .select("*")
          .single();
        if (created) {
          setNotes((prev) => [created as Note, ...prev]);
          toLink.push(created.id);
        }
      }
    }

    const linkRows = toLink.map((targetId) => ({ source_note_id: sourceId, target_note_id: targetId }));
    if (linkRows.length > 0) {
      await supabase.from("note_links").upsert(linkRows, { onConflict: "source_note_id,target_note_id" });
      const { data } = await supabase.from("note_links").select("*");
      setNoteLinks((data ?? []) as NoteLink[]);
    }
  }, [currentUserId, repoId, supabase]);

  // persistNote must use a ref to activeNote so the closure doesn't capture a
  // stale snapshot — this avoids stale-closure autosave overwriting newer content.
  const activeNoteRef = useRef<Note | null>(null);
  activeNoteRef.current = activeNote;

  const persistNote = useCallback(async (markdown: string) => {
    const note = activeNoteRef.current;
    if (!note) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("notes")
      .update({ content_markdown: markdown, updated_at: new Date().toISOString() })
      .eq("id", note.id)
      .select("*")
      .single();

    if (error) {
      setErrorMessage(error.message);
    } else if (data) {
      // Update notes list WITHOUT changing activeNote identity (id stays same)
      // This is safe because loadedNoteIdRef prevents re-loading on same ID.
      setNotes((prev) => prev.map((item) => (item.id === data.id ? (data as Note) : item)));
      await syncNoteLinks(data.id, markdown);
    }
    setSaving(false);
  }, [supabase, syncNoteLinks]); // note intentionally not in deps — use ref instead

  useEffect(() => {
    if (!editor || !activeNote) return;

    const handler = () => {
      const markdown =
        ((editor.storage as { markdown?: { getMarkdown?: () => string } }).markdown?.getMarkdown?.() ??
          editor.getText());
      setLinkSuggestions(extractNoteTitles(markdown));
      if (saveTimeout.current) window.clearTimeout(saveTimeout.current);
      saveTimeout.current = window.setTimeout(() => {
        void persistNote(markdown);
      }, 800); // slightly longer debounce — reduces save churn
    };

    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      if (saveTimeout.current) window.clearTimeout(saveTimeout.current);
    };
  }, [editor, activeNote?.id, persistNote]); // key on id, not whole object


  const handleCreateNote = async () => {
    if (!currentUserId) {
      setErrorMessage("You must be signed in to create and edit notes.");
      return;
    }
    const title = `Untitled ${notes.length + 1}`;
    const { data, error } = await supabase
      .from("notes")
      .insert({ repo_id: repoId, author_id: currentUserId, title, content_markdown: "" })
      .select("*")
      .single();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data) {
      setNotes((prev) => [data as Note, ...prev]);
      // Reset the loadedNoteIdRef so new note content loads fresh
      loadedNoteIdRef.current = "";
      router.push(`/repo/${repoId}/notes?note=${data.id}`);
    }
  };

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(filter.toLowerCase())
  );

  const linkedNotes = useMemo(() => {
    if (!activeNote) return [];
    const linkIds = noteLinks
      .filter((link) => link.source_note_id === activeNote.id)
      .map((link) => link.target_note_id);
    return notes.filter((note) => linkIds.includes(note.id));
  }, [noteLinks, notes, activeNote]);

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="hidden w-[280px] shrink-0 border-r border-[var(--border)] bg-[var(--surface-1)] lg:flex lg:flex-col">
        <div className="border-b border-[var(--border)] px-4 py-4">
          <Link href={`/repo/${repoId}`} className="inline-flex items-center gap-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
            <ChevronLeft className="size-4" />
            Back to workspace
          </Link>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">Notes</p>
              <p className="text-sm font-semibold">Knowledge vault</p>
            </div>
            <Button size="icon" variant="outline" onClick={handleCreateNote}>
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-[var(--foreground-subtle)]" />
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter notes..."
              className="h-9 pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="h-10 rounded-lg bg-[var(--surface-2)] animate-pulse" />
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <p className="text-sm text-[var(--foreground-subtle)]">No notes yet.</p>
          ) : (
            <div className="space-y-2">
              {filteredNotes.map((note) => {
                const isActive = activeNote?.id === note.id;
                return (
                  <Link
                    key={note.id}
                    href={`/repo/${repoId}/notes?note=${note.id}`}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "border-[var(--brand)] bg-[var(--brand-muted)] text-[var(--brand)]"
                        : "border-transparent text-[var(--foreground-muted)] hover:border-[var(--border)] hover:bg-[var(--surface-2)]"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{note.title}</p>
                      <p className="text-xs text-[var(--foreground-subtle)]">
                        Updated {new Date(note.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <BookOpen className="size-4" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[var(--border)] bg-[var(--surface-1)] px-[var(--space-lg)] py-[var(--space-md)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">Active note</p>
              <h1 className="text-lg font-semibold text-[var(--foreground)]">
                {activeNote?.title ?? "Pick a note"}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
              {saving ? "Saving..." : "Saved"}
              {errorMessage ? <span className="text-[var(--accent-rose)]">{errorMessage}</span> : null}
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-[var(--space-lg)] p-[var(--space-lg)] lg:flex-row">
          <section className="min-h-0 flex-1">
            <Card className="h-full">
              <CardHeader className="border-b border-[var(--border)]">
                <CardTitle className="text-sm">Editor</CardTitle>
              </CardHeader>
              <CardContent className="h-full">
                {activeNote ? (
                  <div className="prose-editor prose prose-invert max-w-none text-[var(--foreground)]">
                    <EditorContent editor={editor} className="min-h-[420px] [&_.tiptap]:focus:outline-none" />
                  </div>
                ) : (
                  <div className="flex h-[420px] items-center justify-center text-sm text-[var(--foreground-muted)]">
                    Create or select a note to start writing.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <aside className="flex w-full flex-col gap-[var(--space-md)] lg:w-[320px]">
            <Card>
              <CardHeader className="border-b border-[var(--border)]">
                <CardTitle className="text-sm">Linked notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {linkedNotes.length === 0 ? (
                  <p className="text-sm text-[var(--foreground-subtle)]">No outgoing links yet.</p>
                ) : (
                  linkedNotes.map((note) => (
                    <Link
                      key={note.id}
                      href={`/repo/${repoId}/notes?note=${note.id}`}
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] hover:border-[var(--brand)]"
                    >
                      <span className="truncate">{note.title}</span>
                      <Link2 className="size-4 text-[var(--foreground-subtle)]" />
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-[var(--border)]">
                <CardTitle className="text-sm">Suggested links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {linkSuggestions.length === 0 ? (
                  <p className="text-sm text-[var(--foreground-subtle)]">Use [[note name]] to link notes.</p>
                ) : (
                  linkSuggestions.map((title) => (
                    <div
                      key={title}
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                    >
                      <span className="truncate">{title}</span>
                      <span className="rounded-full bg-[var(--brand-muted)] px-2 py-0.5 text-xs text-[var(--brand)]">
                        {toSlug(title)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
