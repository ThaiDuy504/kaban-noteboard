'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Note, AISuggestion, BoardWithColumns, Column } from '@/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TagInput } from '@/components/note-editor/TagInput';
import { CategorySelector } from '@/components/note-editor/CategorySelector';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X, Sparkles, Loader2, Check, Trash2, Plus } from 'lucide-react';

export default function NoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [board, setBoard] = useState<BoardWithColumns | null>(null);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Create column dialog state
  const [createColumnOpen, setCreateColumnOpen] = useState(false);
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [creatingColumn, setCreatingColumn] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (params.id && params.id !== 'new') {
        try {
          const noteData = await api.getNote(params.id as string);
          setNote(noteData);
          setContent(noteData.content);
          setTags(noteData.tags.map(t => t.name));
          setSelectedColumn(noteData.columnId);
          
          // Get board to check available columns
          if (noteData.boardId) {
            // Optimized: fetch board directly using boardId from note
            const fullBoard = await api.getBoard(noteData.boardId);
            setBoard(fullBoard);
          } else {
            // Fallback for notes without boardId (legacy)
            const boards = await api.getBoards();
            for (const b of boards) {
              const fullBoard = await api.getBoard(b.id);
              if (fullBoard.columns.some(c => c.id === noteData.columnId)) {
                setBoard(fullBoard);
                break;
              }
            }
          }
        } catch (error) {
          console.error('Failed to load note:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (note) {
        await api.updateNote(note.id, { 
          content, 
          tagNames: tags,
          columnId: selectedColumn || undefined,
        });
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    
    setDeleting(true);
    try {
      await api.deleteNote(note.id);
      router.back();
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleAiSuggest = async () => {
    setAiLoading(true);
    try {
      const suggestion = await api.suggestTags(content, board?.id);
      setAiSuggestion(suggestion);
      
      // If backend auto-created a column, update local board state
      if (suggestion.columnCreated && suggestion.columnId && board) {
        const updatedBoard = await api.getBoard(board.id);
        setBoard(updatedBoard);
      }
    } catch (error) {
      console.error('AI suggestion failed:', error);
    } finally {
      setAiLoading(false);
    }
  };

  // Check if a column with the given category type exists
  const getCategoryColumn = (category: string): Column | undefined => {
    return board?.columns.find(c => c.type === category);
  };

  // Cherry-pick a single tag
  const acceptTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  // Accept the category suggestion
  const acceptCategory = () => {
    if (!aiSuggestion) return;
    
    // If backend already created the column, use its ID
    if (aiSuggestion.columnId) {
      setSelectedColumn(aiSuggestion.columnId);
      return;
    }
    
    // Check if column exists locally
    const categoryColumn = getCategoryColumn(aiSuggestion.category);
    if (categoryColumn) {
      setSelectedColumn(categoryColumn.id);
    } else if (board) {
      // Column doesn't exist, prompt to create it
      setPendingCategory(aiSuggestion.category);
      setNewColumnName(aiSuggestion.category.charAt(0).toUpperCase() + aiSuggestion.category.slice(1));
      setCreateColumnOpen(true);
    }
  };

  // Accept all suggestions (tags + category)
  const acceptAllSuggestions = () => {
    if (!aiSuggestion) return;
    
    // Add hashtags
    const newTags = [...new Set([...tags, ...aiSuggestion.hashtags])];
    setTags(newTags);
    
    // If backend already created the column, use its ID
    if (aiSuggestion.columnId) {
      setSelectedColumn(aiSuggestion.columnId);
      setAiSuggestion(null);
      return;
    }
    
    // Handle category
    const categoryColumn = getCategoryColumn(aiSuggestion.category);
    if (categoryColumn) {
      setSelectedColumn(categoryColumn.id);
      setAiSuggestion(null);
    } else if (board) {
      // Need to create column first
      setPendingCategory(aiSuggestion.category);
      setNewColumnName(aiSuggestion.category.charAt(0).toUpperCase() + aiSuggestion.category.slice(1));
      setCreateColumnOpen(true);
    } else {
      setAiSuggestion(null);
    }
  };

  // Create the missing column for the suggested category
  const handleCreateColumn = async () => {
    if (!board || !pendingCategory || !newColumnName.trim()) return;
    
    setCreatingColumn(true);
    try {
      const column = await api.createColumn({
        boardId: board.id,
        name: newColumnName,
        type: pendingCategory,
      });
      
      // Update local board state
      setBoard(prev => prev ? {
        ...prev,
        columns: [...prev.columns, { ...column, notes: [] }],
      } : null);
      
      // Move note to the new column
      setSelectedColumn(column.id);
      setCreateColumnOpen(false);
      setAiSuggestion(null);
      setPendingCategory(null);
    } catch (error) {
      console.error('Failed to create column:', error);
    } finally {
      setCreatingColumn(false);
    }
  };

  // Skip column creation
  const skipColumnCreation = () => {
    setCreateColumnOpen(false);
    setPendingCategory(null);
    setAiSuggestion(null);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-card rounded-xl sm:rounded-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b">
          <h2 className="font-semibold text-base sm:text-lg">Edit Note</h2>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 sm:h-9 sm:w-9"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 sm:h-9 sm:w-9">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-4 overflow-y-auto max-h-[55vh] sm:max-h-[60vh]">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note..."
            className="min-h-[200px] text-lg border-0 focus-visible:ring-0 resize-none"
          />

          {/* Category Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Category</label>
            <CategorySelector 
              value={selectedColumn} 
              onChange={setSelectedColumn} 
              columns={board?.columns.map(c => ({ id: c.id, name: c.name, type: c.type }))}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Tags</label>
            <TagInput tags={tags} onChange={setTags} />
          </div>

          {/* AI Suggestion */}
          {aiSuggestion && (
            <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="w-4 h-4" />
                AI Suggestions
              </div>
              
              {/* Category */}
              <div>
                <span className="text-xs font-medium text-muted-foreground block mb-1.5">Category</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer transition-colors"
                    onClick={acceptCategory}
                  >
                    !{aiSuggestion.category}
                    <Check className="w-3 h-3 ml-1 opacity-70" />
                  </Badge>
                  {aiSuggestion.columnCreated && (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Column created
                    </span>
                  )}
                  {!aiSuggestion.columnId && !getCategoryColumn(aiSuggestion.category) && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Will create column
                    </span>
                  )}
                </div>
              </div>
              
              {/* Hashtags */}
              <div>
                <span className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Hashtags <span className="text-primary">(click to add)</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {aiSuggestion.hashtags.map((tag) => {
                    const isAdded = tags.includes(tag);
                    return (
                      <Badge 
                        key={tag} 
                        variant="outline" 
                        className={`cursor-pointer transition-all ${
                          isAdded 
                            ? 'bg-primary/20 border-primary/40 text-primary' 
                            : 'hover:bg-primary/10 hover:border-primary/30'
                        }`}
                        onClick={() => !isAdded && acceptTag(tag)}
                      >
                        #{tag}
                        {isAdded ? (
                          <Check className="w-3 h-3 ml-1 text-primary" />
                        ) : (
                          <Plus className="w-3 h-3 ml-1 opacity-50" />
                        )}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={acceptAllSuggestions} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Check className="w-4 h-4 mr-1.5" /> Accept All
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAiSuggestion(null)} className="text-muted-foreground">
                  <X className="w-4 h-4 mr-1" /> Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-4 border-t bg-muted/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <Button
              variant="outline"
              onClick={handleAiSuggest}
              disabled={aiLoading || !content}
              className="w-full sm:w-auto"
              size="sm"
            >
              {aiLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              AI Suggest
            </Button>
            {note && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Last updated: {new Date(note.updatedAt).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.back()} size="sm" className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} size="sm" className="flex-1 sm:flex-none">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Create Column Dialog */}
      <Dialog open={createColumnOpen} onOpenChange={setCreateColumnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Column for "{pendingCategory}"?</DialogTitle>
            <DialogDescription>
              The suggested category doesn&apos;t have a column yet. Create one to organize notes with this category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Column Name</label>
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Enter column name"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              <Badge className="bg-blue-500 text-white">
                !{pendingCategory}
              </Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={skipColumnCreation}>
              Skip
            </Button>
            <Button onClick={handleCreateColumn} disabled={creatingColumn || !newColumnName.trim()}>
              {creatingColumn ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Column
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        confirmLabel="Delete Note"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
