'use client';

import { useState, useEffect, useMemo } from 'react';
import { Note, ColumnWithNotes, BoardWithColumns } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TagInput } from './TagInput';
import { CategorySelector } from './CategorySelector';
import { Sparkles, Loader2, Check, Plus } from 'lucide-react';
import { useNoteEditor } from '@/hooks/useNoteEditor';

interface NoteEditorModalProps {
  note: Note | null;
  open: boolean;
  onClose: () => void;
  onSave: (note: Note) => void;
  columns?: { id: string; name: string; type: string }[];
  boardId?: string;
  onColumnsUpdate?: (columns: ColumnWithNotes[]) => void;
}

export function NoteEditorModal({ note, open, onClose, onSave, columns, boardId, onColumnsUpdate }: NoteEditorModalProps) {
  const [localColumns, setLocalColumns] = useState(columns);

  useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  // Create a minimal board object for the hook
  const board = useMemo((): BoardWithColumns | null => {
    if (!boardId || !localColumns) return null;
    return {
      id: boardId,
      userId: '',
      name: '',
      order: 0,
      createdAt: new Date().toISOString(),
      columns: localColumns.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type as 'todo' | 'idea' | 'question' | 'custom',
        boardId: boardId,
        order: 0,
        notes: [],
      })),
    };
  }, [boardId, localColumns]);

  const handleBoardUpdate = (updatedBoard: BoardWithColumns) => {
    setLocalColumns(updatedBoard.columns.map(c => ({ id: c.id, name: c.name, type: c.type })));
    onColumnsUpdate?.(updatedBoard.columns);
  };

  const {
    content,
    tags,
    selectedColumn,
    aiSuggestion,
    aiLoading,
    saving,
    setContent,
    setTags,
    setSelectedColumn,
    handleSave: hookHandleSave,
    handleAiSuggest,
    acceptAllSuggestions,
    dismissSuggestion,
    resetEditor,
  } = useNoteEditor({
    note,
    board,
    onBoardUpdate: handleBoardUpdate,
  });

  // Reset editor when modal opens with a new note
  useEffect(() => {
    if (open) {
      resetEditor(note);
    }
  }, [note, open, resetEditor]);

  async function handleSave() {
    const updated = await hookHandleSave();
    if (updated) {
      onSave(updated);
      onClose();
    }
  }

  function acceptSuggestions() {
    acceptAllSuggestions();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh] py-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note..."
            className="min-h-[200px] text-lg resize-none"
          />

          {/* Category Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Category</label>
            <CategorySelector 
              value={selectedColumn} 
              onChange={setSelectedColumn}
              columns={localColumns}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Tags</label>
            <TagInput tags={tags} onChange={setTags} />
          </div>

          {/* AI Suggestion */}
          {aiSuggestion && (
            <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Sparkles className="w-4 h-4" />
                AI Suggestions
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-muted-foreground">Category:</span>
                  <Badge className="ml-2 bg-primary text-primary-foreground">!{aiSuggestion.category}</Badge>
                  {aiSuggestion.columnCreated && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400 inline-flex items-center gap-1">
                      <Check className="w-3 h-3" /> Column created
                    </span>
                  )}
                  {!aiSuggestion.columnId && (
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Will create column
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Hashtags:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {aiSuggestion.hashtags.map((tag) => (
                      <Badge key={tag} variant="outline">#{tag}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={acceptSuggestions}>
                  <Check className="w-4 h-4 mr-1" /> Accept
                </Button>
                <Button size="sm" variant="ghost" onClick={dismissSuggestion}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleAiSuggest}
            disabled={aiLoading || !content}
          >
            {aiLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            AI Suggest
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
