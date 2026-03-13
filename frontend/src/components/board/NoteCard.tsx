'use client';

import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Note } from '@/types';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface NoteCardProps {
  note: Note;
  onDeleteNote?: () => void;
}

export const NoteCard = memo(function NoteCard({ note, onDeleteNote }: NoteCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Extract category tag and hashtags
  const categoryTag = note.tags.find(t => 
    ['todo', 'idea', 'question'].includes(t.name.toLowerCase())
  );
  const hashtags = note.tags.filter(t => 
    !['todo', 'idea', 'question'].includes(t.name.toLowerCase())
  );

  const categoryColors: Record<string, string> = {
    todo: 'bg-amber-500 hover:bg-amber-600 text-white',
    idea: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    question: 'bg-indigo-500 hover:bg-indigo-600 text-white',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-card border border-border/60 rounded-lg p-3 mb-2 cursor-pointer 
        hover:shadow-md hover:border-border transition-all duration-200
        ${isDragging ? 'opacity-50 shadow-lg rotate-2 scale-105' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button 
          {...attributes} 
          {...listeners} 
          className="mt-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/notes/${note.id}`} className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-relaxed line-clamp-4 mb-3">
                {note.content}
              </p>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onDeleteNote} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex flex-wrap gap-1.5 mb-2">
            {categoryTag && (
              <Badge 
                className={categoryColors[categoryTag.name.toLowerCase()] || 'bg-gray-500'}
              >
                {categoryTag.name}
              </Badge>
            )}
            {hashtags.map((tag) => (
              <Badge 
                key={tag.id} 
                variant="outline" 
                className={`text-xs ${tag.isAiGenerated ? 'border-dashed' : ''}`}
              >
                #{tag.name}
              </Badge>
            ))}
          </div>
          
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
});
