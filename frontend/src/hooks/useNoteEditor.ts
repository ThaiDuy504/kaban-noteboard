'use client';

import { useState, useCallback } from 'react';
import { Note, AISuggestion, BoardWithColumns, Column, ColumnWithNotes } from '@/types';
import { api } from '@/lib/api';

interface UseNoteEditorOptions {
  note: Note | null;
  board: BoardWithColumns | null;
  onBoardUpdate?: (board: BoardWithColumns) => void;
}

interface UseNoteEditorReturn {
  // State
  content: string;
  tags: string[];
  selectedColumn: string;
  aiSuggestion: AISuggestion | null;
  aiLoading: boolean;
  saving: boolean;
  
  // Setters
  setContent: (content: string) => void;
  setTags: (tags: string[]) => void;
  setSelectedColumn: (columnId: string) => void;
  
  // Actions
  handleSave: () => Promise<Note | null>;
  handleAiSuggest: () => Promise<void>;
  acceptTag: (tag: string) => void;
  acceptCategory: () => { needsColumnCreation: boolean; category: string | null };
  acceptAllSuggestions: () => { needsColumnCreation: boolean; category: string | null };
  dismissSuggestion: () => void;
  resetEditor: (note: Note | null) => void;
  
  // Helpers
  getCategoryColumn: (category: string) => Column | undefined;
}

export function useNoteEditor({ 
  note, 
  board,
  onBoardUpdate 
}: UseNoteEditorOptions): UseNoteEditorReturn {
  const [content, setContent] = useState(note?.content ?? '');
  const [tags, setTags] = useState<string[]>(note?.tags.map(t => t.name) ?? []);
  const [selectedColumn, setSelectedColumn] = useState(note?.columnId ?? '');
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetEditor = useCallback((note: Note | null) => {
    setContent(note?.content ?? '');
    setTags(note?.tags.map(t => t.name) ?? []);
    setSelectedColumn(note?.columnId ?? '');
    setAiSuggestion(null);
  }, []);

  const getCategoryColumn = useCallback((category: string): Column | undefined => {
    return board?.columns.find(c => c.type === category);
  }, [board]);

  const handleSave = useCallback(async (): Promise<Note | null> => {
    if (!note) return null;
    
    setSaving(true);
    try {
      const updated = await api.updateNote(note.id, {
        content,
        tagNames: tags,
        columnId: selectedColumn || undefined,
      });
      return updated;
    } finally {
      setSaving(false);
    }
  }, [note, content, tags, selectedColumn]);

  const handleAiSuggest = useCallback(async () => {
    setAiLoading(true);
    try {
      const suggestion = await api.suggestTags(content, board?.id);
      setAiSuggestion(suggestion);
      
      // If backend auto-created a column, update local board state
      if (suggestion.columnCreated && suggestion.columnId && board) {
        const updatedBoard = await api.getBoard(board.id);
        onBoardUpdate?.(updatedBoard);
      }
    } catch (error) {
      console.error('AI suggestion failed:', error);
    } finally {
      setAiLoading(false);
    }
  }, [content, board, onBoardUpdate]);

  const acceptTag = useCallback((tag: string) => {
    if (!tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
    }
  }, [tags]);

  const acceptCategory = useCallback((): { needsColumnCreation: boolean; category: string | null } => {
    if (!aiSuggestion) return { needsColumnCreation: false, category: null };
    
    // If backend already created the column, use its ID
    if (aiSuggestion.columnId) {
      setSelectedColumn(aiSuggestion.columnId);
      return { needsColumnCreation: false, category: null };
    }
    
    // Check if column exists locally
    const categoryColumn = getCategoryColumn(aiSuggestion.category);
    if (categoryColumn) {
      setSelectedColumn(categoryColumn.id);
      return { needsColumnCreation: false, category: null };
    }
    
    // Column doesn't exist, signal that we need to create it
    return { needsColumnCreation: true, category: aiSuggestion.category };
  }, [aiSuggestion, getCategoryColumn]);

  const acceptAllSuggestions = useCallback((): { needsColumnCreation: boolean; category: string | null } => {
    if (!aiSuggestion) return { needsColumnCreation: false, category: null };
    
    // Add hashtags
    const newTags = [...new Set([...tags, ...aiSuggestion.hashtags])];
    setTags(newTags);
    
    // If backend already created the column, use its ID
    if (aiSuggestion.columnId) {
      setSelectedColumn(aiSuggestion.columnId);
      setAiSuggestion(null);
      return { needsColumnCreation: false, category: null };
    }
    
    // Handle category
    const categoryColumn = getCategoryColumn(aiSuggestion.category);
    if (categoryColumn) {
      setSelectedColumn(categoryColumn.id);
      setAiSuggestion(null);
      return { needsColumnCreation: false, category: null };
    }
    
    // Need to create column first
    return { needsColumnCreation: true, category: aiSuggestion.category };
  }, [aiSuggestion, tags, getCategoryColumn]);

  const dismissSuggestion = useCallback(() => {
    setAiSuggestion(null);
  }, []);

  return {
    // State
    content,
    tags,
    selectedColumn,
    aiSuggestion,
    aiLoading,
    saving,
    
    // Setters
    setContent,
    setTags,
    setSelectedColumn,
    
    // Actions
    handleSave,
    handleAiSuggest,
    acceptTag,
    acceptCategory,
    acceptAllSuggestions,
    dismissSuggestion,
    resetEditor,
    
    // Helpers
    getCategoryColumn,
  };
}
