'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { BoardWithColumns, Note, ColumnWithNotes } from '@/types';
import { api } from '@/lib/api';
import { Column } from '@/components/board/Column';
import { NoteCard } from '@/components/board/NoteCard';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface PendingMove {
  noteId: string;
  sourceColumnId: string;
  targetColumnId: string;
}

type ColumnType = 'todo' | 'idea' | 'question' | 'custom';

// Helper to update a specific column in a board
function updateColumn(
  board: BoardWithColumns,
  columnId: string,
  updater: (col: ColumnWithNotes) => ColumnWithNotes
): BoardWithColumns {
  return {
    ...board,
    columns: board.columns.map((col) => (col.id === columnId ? updater(col) : col)),
  };
}

export default function BoardPage() {
  const params = useParams();
  const [board, setBoard] = useState<BoardWithColumns | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const pendingMoveRef = useRef<PendingMove | null>(null);
  
  // Dialog states
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [deleteColumnDialogOpen, setDeleteColumnDialogOpen] = useState(false);
  const [deleteNoteDialogOpen, setDeleteNoteDialogOpen] = useState(false);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<ColumnType>('custom');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const loadBoard = useCallback(async () => {
    try {
      const data = await api.getBoard(params.id as string);
      setBoard(data);
    } catch (error) {
      console.error('Failed to load board:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      loadBoard();
    }
  }, [params.id, loadBoard]);

  function findNoteById(id: string): Note | null {
    if (!board) return null;
    for (const column of board.columns) {
      const note = (column.notes ?? []).find((n) => n.id === id);
      if (note) return note;
    }
    return null;
  }

  function findColumnByNoteId(noteId: string): ColumnWithNotes | null {
    if (!board) return null;
    return board.columns.find((col) => (col.notes ?? []).some((n) => n.id === noteId)) ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    const noteId = event.active.id as string;
    const note = findNoteById(noteId);
    const sourceColumn = findColumnByNoteId(noteId);
    setActiveNote(note);
    pendingMoveRef.current = sourceColumn
      ? { noteId, sourceColumnId: sourceColumn.id, targetColumnId: sourceColumn.id }
      : null;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !board) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumnByNoteId(activeId);
    const overColumn = board.columns.find((c) => c.id === overId) ?? findColumnByNoteId(overId);

    if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) return;

    // Update pending move target
    if (pendingMoveRef.current) {
      pendingMoveRef.current.targetColumnId = overColumn.id;
    }

    // Move note to different column (optimistic)
    const note = (activeColumn.notes ?? []).find((n) => n.id === activeId);
    if (!note) return;

    setBoard((prev) => {
      if (!prev) return prev;
      // Remove from source, add to target
      let updated = updateColumn(prev, activeColumn.id, (col) => ({
        ...col,
        notes: (col.notes ?? []).filter((n) => n.id !== activeId),
      }));
      updated = updateColumn(updated, overColumn.id, (col) => ({
        ...col,
        notes: [...(col.notes ?? []), { ...note, columnId: col.id, category: col.name }],
      }));
      return updated;
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveNote(null);

    const pendingMove = pendingMoveRef.current;
    pendingMoveRef.current = null;

    if (!over || !board || !pendingMove) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const { sourceColumnId, targetColumnId } = pendingMove;
    const wasCrossColumnMove = sourceColumnId !== targetColumnId;

    // No-op for same position drops
    if (activeId === overId && !wasCrossColumnMove) return;

    if (wasCrossColumnMove) {
      // Cross-column move - already handled optimistically, sync with API
      const targetColumn = board.columns.find((c) => c.id === targetColumnId);
      const targetNotes = targetColumn?.notes ?? [];
      const noteIndex = targetNotes.findIndex((n) => n.id === activeId);
      const newOrder = noteIndex >= 0 ? noteIndex : targetNotes.length;

      try {
        const updatedNote = await api.moveNote(activeId, targetColumnId, newOrder);
        setBoard((prev) =>
          prev
            ? updateColumn(prev, targetColumnId, (col) => ({
                ...col,
                notes: (col.notes ?? []).map((n) => (n.id === activeId ? { ...n, ...updatedNote } : n)),
              }))
            : prev
        );
      } catch (error) {
        console.error('Failed to move note:', error);
        loadBoard();
      }
      return;
    }

    // Reorder within same column
    const currentColumn = board.columns.find((c) => c.id === sourceColumnId);
    if (!currentColumn) return;

    const colNotes = currentColumn.notes ?? [];
    const oldIndex = colNotes.findIndex((n) => n.id === activeId);
    const newIndex = colNotes.findIndex((n) => n.id === overId);

    if (oldIndex === newIndex || oldIndex < 0 || newIndex < 0) return;

    setBoard((prev) =>
      prev
        ? updateColumn(prev, currentColumn.id, (col) => ({
            ...col,
            notes: arrayMove(col.notes ?? [], oldIndex, newIndex).map((n, i) => ({ ...n, order: i })),
          }))
        : prev
    );

    try {
      await api.moveNote(activeId, currentColumn.id, newIndex);
    } catch (error) {
      console.error('Failed to move note:', error);
      loadBoard();
    }
  }

  function handleAddNote(columnId: string) {
    setActiveColumnId(columnId);
    setNewNoteContent('');
    setNoteDialogOpen(true);
  }

  async function handleCreateNote() {
    if (!activeColumnId || !newNoteContent.trim()) return;

    try {
      const note = await api.createNote({ columnId: activeColumnId, content: newNoteContent });
      setBoard((prev) =>
        prev ? updateColumn(prev, activeColumnId, (col) => ({ ...col, notes: [...(col.notes ?? []), note] })) : prev
      );
      setNoteDialogOpen(false);
      setNewNoteContent('');
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  }

  async function handleCreateColumn() {
    if (!board || !newColumnName.trim()) return;

    try {
      const column = await api.createColumn({ boardId: board.id, name: newColumnName, type: newColumnType });
      setBoard((prev) => (prev ? { ...prev, columns: [...prev.columns, { ...column, notes: [] }] } : prev));
      setColumnDialogOpen(false);
      setNewColumnName('');
      setNewColumnType('custom');
    } catch (error) {
      console.error('Failed to create column:', error);
    }
  }

  function handleDeleteColumnClick(columnId: string) {
    setActiveColumnId(columnId);
    setDeleteColumnDialogOpen(true);
  }

  async function handleDeleteColumn() {
    if (!activeColumnId || !board) return;

    try {
      await api.deleteColumn(activeColumnId);
      setBoard((prev) =>
        prev ? { ...prev, columns: prev.columns.filter((c) => c.id !== activeColumnId) } : prev
      );
      setDeleteColumnDialogOpen(false);
      setActiveColumnId(null);
    } catch (error) {
      console.error('Failed to delete column:', error);
    }
  }

  function handleDeleteNoteClick(noteId: string) {
    setActiveNoteId(noteId);
    setDeleteNoteDialogOpen(true);
  }

  async function handleDeleteNote() {
    if (!activeNoteId || !board) return;

    try {
      await api.deleteNote(activeNoteId);
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              columns: prev.columns.map((col) => ({
                ...col,
                notes: col.notes.filter((n) => n.id !== activeNoteId),
              })),
            }
          : prev
      );
      setDeleteNoteDialogOpen(false);
      setActiveNoteId(null);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="text-2xl font-semibold mb-4">Board not found</h1>
        <Button asChild>
          <Link href="/boards">Back to Boards</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-14 z-10">
        <div className="max-w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
              <Link href="/boards">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-lg sm:text-2xl font-semibold text-foreground truncate">{board.name}</h1>
          </div>
          
          <Button onClick={() => setColumnDialogOpen(true)} size="sm" className="flex-shrink-0">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Column</span>
          </Button>
        </div>
      </header>

      {/* Board */}
      <div className="p-4 sm:p-6 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 pb-4">
            {board.columns
              .sort((a, b) => a.order - b.order)
              .map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  onAddNote={() => handleAddNote(column.id)}
                  onDeleteColumn={() => handleDeleteColumnClick(column.id)}
                  onDeleteNote={(noteId) => handleDeleteNoteClick(noteId)}
                />
              ))}

            {board.columns.length === 0 && (
              <div className="flex items-center justify-center w-full min-h-[400px]">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    No columns yet. Add a column to get started.
                  </p>
                  <Button onClick={() => setColumnDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Column
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DragOverlay>
            {activeNote && <NoteCard note={activeNote} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Write your note content. You can use !todo, !idea, or !question to categorize.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="What's on your mind?"
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNote} disabled={!newNoteContent.trim()}>
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Column Dialog */}
      <Dialog open={columnDialogOpen} onOpenChange={setColumnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
            <DialogDescription>
              Create a new column to organize your notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Column name"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
            />
            <div className="flex gap-2">
              {(['todo', 'idea', 'question', 'custom'] as const).map((type) => (
                <Button
                  key={type}
                  variant={newColumnType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewColumnType(type)}
                >
                  {type === 'custom' ? 'Custom' : `!${type}`}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColumnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateColumn} disabled={!newColumnName.trim()}>
              Create Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Column Confirmation Dialog */}
      <ConfirmDialog
        open={deleteColumnDialogOpen}
        onOpenChange={setDeleteColumnDialogOpen}
        title="Delete Column"
        description="Are you sure you want to delete this column? All notes in this column will also be deleted. This action cannot be undone."
        confirmLabel="Delete Column"
        onConfirm={handleDeleteColumn}
      />

      {/* Delete Note Confirmation Dialog */}
      <ConfirmDialog
        open={deleteNoteDialogOpen}
        onOpenChange={setDeleteNoteDialogOpen}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        confirmLabel="Delete Note"
        onConfirm={handleDeleteNote}
      />
    </div>
  );
}
