'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  columns?: { id: string; name: string; type: string }[];
}

export function CategorySelector({ value, onChange, columns }: CategorySelectorProps) {
  const defaultColumns = [
    { id: 'todo', name: '!todo', type: 'todo' },
    { id: 'idea', name: '!idea', type: 'idea' },
    { id: 'question', name: '!question', type: 'question' },
  ];

  const displayColumns = columns && columns.length > 0 ? columns : defaultColumns;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent>
        {displayColumns.map((col) => (
          <SelectItem key={col.id} value={col.id}>
            {col.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
