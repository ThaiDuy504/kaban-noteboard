'use client';

import { useState, KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('');

  function addTag() {
    const tag = input.trim().replace(/^#/, '').toLowerCase();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput('');
  }

  function removeTag(tagToRemove: string) {
    onChange(tags.filter((t) => t !== tagToRemove));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-card min-h-[48px] focus-within:ring-2 focus-within:ring-ring">
      {tags.map((tag) => (
        <Badge 
          key={tag} 
          variant="secondary" 
          className="gap-1 pl-2 pr-1 py-1"
        >
          #{tag}
          <button 
            onClick={() => removeTag(tag)} 
            className="ml-1 hover:bg-muted rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? 'Add tags with #...' : ''}
        className="flex-1 min-w-[120px] border-0 p-0 h-6 focus-visible:ring-0 text-sm"
      />
    </div>
  );
}
