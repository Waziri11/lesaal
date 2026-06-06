"use client";

import { useEffect, useMemo, useState } from "react";
import PageState from "../../../../components/shared/PageState";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
import { createCsrfHeaders } from "../../../../lib/csrf-client";

const PAGE_LIMIT = 30;

function formatDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString();
}

function sortNotesByRecentUpdate(notes) {
  return notes
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
}

export default function AdminNotesPage() {
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [loadingMoreNotes, setLoadingMoreNotes] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [creatingNote, setCreatingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [editorDraft, setEditorDraft] = useState({ title: "", content: "" });

  const filteredNotes = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return notes;
    }

    return notes.filter((note) => {
      const haystack = `${note.title} ${note.content || ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [notes, searchQuery]);

  const selectedNote = useMemo(() => notes.find((note) => note.id === selectedNoteId) || null, [notes, selectedNoteId]);

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    if (!selectedNote) {
      setEditorDraft({ title: "", content: "" });
      return;
    }

    setEditorDraft({
      title: selectedNote.title || "",
      content: selectedNote.content || "",
    });
  }, [selectedNote]);

  async function loadNotes({ cursor = null, append = false, preferredNoteId = null } = {}) {
    if (append) {
      setLoadingMoreNotes(true);
    } else {
      setLoadingNotes(true);
    }

    setStatusError("");

    try {
      const query = new URLSearchParams({ limit: String(PAGE_LIMIT) });
      if (cursor) {
        query.set("cursor", cursor);
      }

      const response = await fetch(`/api/admin/notes?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load notes.");
      }

      const nextNotes = Array.isArray(payload.notes) ? payload.notes : [];
      setNextCursor(payload.nextCursor || null);
      setHasMore(Boolean(payload.hasMore));

      if (append) {
        setNotes((current) => [...current, ...nextNotes]);
        return;
      }

      setNotes(nextNotes);

      if (!nextNotes.length) {
        setSelectedNoteId(null);
      } else {
        const resolvedSelection =
          preferredNoteId && nextNotes.some((note) => note.id === preferredNoteId)
            ? preferredNoteId
            : selectedNoteId && nextNotes.some((note) => note.id === selectedNoteId)
              ? selectedNoteId
              : nextNotes[0].id;

        setSelectedNoteId(resolvedSelection);
      }
    } catch (error) {
      setStatusError(error.message || "Unable to load notes.");
    } finally {
      if (append) {
        setLoadingMoreNotes(false);
      } else {
        setLoadingNotes(false);
      }
    }
  }

  async function handleCreateNote() {
    if (creatingNote) return;

    setCreatingNote(true);
    setStatusError("");
    setStatusMessage("");

    try {
      const response = await fetch("/api/admin/notes", {
        method: "POST",
        headers: createCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          title: "Untitled note",
          content: "",
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to create note.");
      }

      if (payload.note) {
        setNotes((current) => [payload.note, ...current.filter((note) => note.id !== payload.note.id)]);
        setSelectedNoteId(payload.note.id);
      }
      setStatusMessage("New note created.");
    } catch (error) {
      setStatusError(error.message || "Unable to create note.");
    } finally {
      setCreatingNote(false);
    }
  }

  async function handleSaveNote() {
    if (!selectedNote || savingNote) return;

    setSavingNote(true);
    setStatusError("");
    setStatusMessage("");

    try {
      const response = await fetch(`/api/admin/notes/${selectedNote.id}`, {
        method: "PUT",
        headers: createCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          title: editorDraft.title,
          content: editorDraft.content,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update note.");
      }

      if (payload.note) {
        setNotes((current) => {
          const updated = current.map((note) => (note.id === payload.note.id ? payload.note : note));
          return sortNotesByRecentUpdate(updated);
        });
        setSelectedNoteId(payload.note.id);
      }
      setStatusMessage("Note saved.");
    } catch (error) {
      setStatusError(error.message || "Unable to update note.");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteNote() {
    if (!selectedNote || deletingNote) return;

    const confirmed = window.confirm(`Delete "${selectedNote.title}"?`);
    if (!confirmed) return;

    setDeletingNote(true);
    setStatusError("");
    setStatusMessage("");

    try {
      const response = await fetch(`/api/admin/notes/${selectedNote.id}`, {
        method: "DELETE",
        headers: createCsrfHeaders(),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to delete note.");
      }

      setNotes((current) => {
        const remaining = current.filter((note) => note.id !== selectedNote.id);
        setSelectedNoteId(remaining[0]?.id || null);
        return remaining;
      });
      setStatusMessage("Note deleted.");
    } catch (error) {
      setStatusError(error.message || "Unable to delete note.");
    } finally {
      setDeletingNote(false);
    }
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Create and manage your notes with full CRUD.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {statusError ? <p className="text-sm text-[color:var(--ui-destructive)]">{statusError}</p> : null}
          {statusMessage ? <p className="text-sm text-[color:var(--ui-success)]">{statusMessage}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">My Notes</CardTitle>
              <Button size="sm" onClick={handleCreateNote} disabled={creatingNote}>
                {creatingNote ? "Adding..." : "+ New"}
              </Button>
            </div>

            <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search notes" />
          </CardHeader>

          <CardContent>
            <PageState
              status={loadingNotes ? "loading" : statusError ? "error" : notes.length ? "loaded" : "empty"}
              resourceLabel="notes"
              errorMessage={statusError}
              onRetry={() => loadNotes()}
              createAction={
                <Button size="sm" onClick={handleCreateNote} disabled={creatingNote}>
                  Create Note
                </Button>
              }
            >
              <div className="space-y-2">
                {filteredNotes.map((note) => {
                  const isActive = note.id === selectedNoteId;

                  return (
                    <button
                      key={note.id}
                      type="button"
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        isActive
                          ? "border-[color:var(--ui-primary)] bg-[color:var(--ui-primary-soft)]"
                          : "border-[color:var(--ui-border)] bg-[color:var(--ui-card)] hover:bg-[color:var(--ui-accent)]"
                      }`}
                      onClick={() => setSelectedNoteId(note.id)}
                    >
                      <p className="line-clamp-1 text-sm font-semibold">{note.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-[color:var(--ui-muted-foreground)]">{note.content || "No content"}</p>
                      <p className="mt-2 text-[11px] text-[color:var(--ui-muted-foreground)]">{formatDateTime(note.updatedAt)}</p>
                    </button>
                  );
                })}

                {hasMore ? (
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => loadNotes({ cursor: nextCursor, append: true })}
                      disabled={loadingMoreNotes || !nextCursor}
                    >
                      {loadingMoreNotes ? "Loading..." : "Load More"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </PageState>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Editor</CardTitle>
              <CardDescription>{selectedNote ? "Update your selected note." : "Select a note to begin editing."}</CardDescription>
            </div>
            {selectedNote ? <Badge variant="secondary">Last updated {formatDateTime(selectedNote.updatedAt)}</Badge> : null}
          </CardHeader>

          <CardContent className="space-y-3">
            {!selectedNote ? (
              <PageState
                status="empty"
                resourceLabel="selected note"
                createAction={
                  <Button onClick={handleCreateNote} disabled={creatingNote}>
                    {creatingNote ? "Creating..." : "Create First Note"}
                  </Button>
                }
              />
            ) : (
              <>
                <Input
                  value={editorDraft.title}
                  onChange={(event) => setEditorDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Note title"
                />
                <Textarea
                  value={editorDraft.content}
                  onChange={(event) => setEditorDraft((current) => ({ ...current, content: event.target.value }))}
                  placeholder="Write your note..."
                  className="min-h-[420px]"
                />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSaveNote} disabled={savingNote || deletingNote}>
                    {savingNote ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteNote} disabled={deletingNote || savingNote}>
                    {deletingNote ? "Deleting..." : "Delete Note"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
