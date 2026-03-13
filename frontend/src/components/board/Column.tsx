'use client';

import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ColumnWithNotes } from '@/types';
import { NoteCard } from './NoteCard';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Plus, Pencil, Trash2 } from 'lucide-react';

interface ColumnProps {
  column: ColumnWithNotes;
  onAddNote: () => void;
  onEditColumn?: () => void;
  onDeleteColumn?: () => void;
  onDeleteNote?: (noteId: string) => void;
}

const categoryConfig: Record<string, { bg: string; text: string; label: string }> = {
  todo: { 
    bg: 'bg-amber-100', 
    text: 'text-amber-800',
    label: '!todo'
  },
  idea: { 
    bg: 'bg-emerald-100', 
    text: 'text-emerald-800',
    label: '!idea'
  },
  question: { 
    bg: 'bg-indigo-100', 
    text: 'text-indigo-800',
    label: '!question'
  },
  custom: { 
    bg: 'bg-gray-100', 
    text: 'text-gray-800',
    label: ''
  },
};

export const Column = memo(function Column({ column, onAddNote, onEditColumn, onDeleteColumn, onDeleteNote }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const notes = column.notes ?? [];

  const config = categoryConfig[column.type] || categoryConfig.custom;

  return (
    <div 
      className={`w-72 sm:w-80 flex-shrink-0 bg-card rounded-xl shadow-sm border border-border/50 
        flex flex-col transition-all duration-200
        ${isOver ? 'ring-2 ring-primary/30 shadow-md' : ''}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-md text-sm font-medium ${config.bg} ${config.text}`}>
            {config.label || column.name}
          </span>
          {config.label && (
            <span className="text-sm font-medium text-foreground">{column.name}</span>
          )}
          <span className="text-muted-foreground text-sm">({notes.length})</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEditColumn}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit column
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDeleteColumn} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Notes */}
      <div 
        ref={setNodeRef} 
        className="flex-1 p-3 min-h-[200px] overflow-y-auto"
      >
        <SortableContext 
          items={notes.map(n => n.id)} 
          strategy={verticalListSortingStrategy}
        >
          {notes.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No notes yet
            </div>
          ) : (
            notes
              .sort((a, b) => a.order - b.order)
              .map((note) => (
                <NoteCard key={note.id} note={note} onDeleteNote={() => onDeleteNote?.(note.id)} />
              ))
          )}
        </SortableContext>
      </div>

      {/* Add Note */}
      <div className="p-3 border-t border-border/50">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-foreground" 
          onClick={onAddNote}
        >
          <Plus className="w-4 h-4 mr-2" /> add note
        </Button>
      </div>
    </div>
  );
});
