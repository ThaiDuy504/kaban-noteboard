'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Note, Board, BoardWithColumns } from '@/types';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Loader2, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Create note dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedColumnId, setSelectedColumnId] = useState('');
  const [selectedBoard, setSelectedBoard] = useState<BoardWithColumns | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [notesData, boardsData] = await Promise.all([
          api.getNotes(),
          api.getBoards(),
        ]);
        setNotes(notesData);
        setBoards(boardsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Load board details when board is selected
  useEffect(() => {
    async function loadBoard() {
      if (!selectedBoardId) {
        setSelectedBoard(null);
        setSelectedColumnId('');
        return;
      }
      try {
        const board = await api.getBoard(selectedBoardId);
        setSelectedBoard(board);
        // Auto-select first column if available
        if (board.columns.length > 0) {
          setSelectedColumnId(board.columns[0].id);
        }
      } catch (error) {
        console.error('Failed to load board:', error);
      }
    }
    loadBoard();
  }, [selectedBoardId]);

  const filteredNotes = notes.filter(
    (note) =>
      note.content.toLowerCase().includes(search.toLowerCase()) ||
      note.tags.some((tag) => tag.name.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleCreateNote() {
    if (!selectedColumnId || !newNoteContent.trim()) return;

    setCreating(true);
    try {
      const note = await api.createNote({ 
        columnId: selectedColumnId, 
        content: newNoteContent 
      });
      setNotes((prev) => [note, ...prev]);
      setCreateDialogOpen(false);
      setNewNoteContent('');
      setSelectedBoardId('');
      setSelectedColumnId('');
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setCreating(false);
    }
  }

  function openCreateDialog() {
    setNewNoteContent('');
    setSelectedBoardId('');
    setSelectedColumnId('');
    setSelectedBoard(null);
    setCreateDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between mb-6">
        <h1 className="text-2xl font-bold">Notes</h1>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New Note
          </Button>
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{search ? 'No notes match your search' : 'No notes yet'}</p>
          {!search && boards.length > 0 && (
            <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Create your first note
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => router.push(`/notes/${note.id}`)}
              className="p-4 bg-card border rounded-xl hover:shadow-md transition-shadow cursor-pointer"
            >
              <p className="text-sm line-clamp-2 mb-2">{note.content}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {note.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-xs">
                    #{tag.name}
                  </Badge>
                ))}
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Note Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Board Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Board</label>
              <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a board" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Column Selection */}
            {selectedBoard && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Column</label>
                <Select value={selectedColumnId} onValueChange={setSelectedColumnId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a column" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedBoard.columns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Note Content */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Write your note..."
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateNote} 
              disabled={creating || !selectedColumnId || !newNoteContent.trim()}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Note
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
