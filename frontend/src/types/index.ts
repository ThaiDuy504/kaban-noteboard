export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface Board {
  id: string;
  userId: string;
  name: string;
  order: number;
  createdAt: string;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  type: 'todo' | 'idea' | 'question' | 'custom';
  order: number;
}

export interface Tag {
  id: string;
  name: string;
  isAiGenerated: boolean;
}

export interface Note {
  id: string;
  userId: string;
  columnId: string;
  boardId?: string;
  content: string;
  category: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

export interface ColumnWithNotes extends Column {
  notes: Note[];
}

export interface BoardWithColumns extends Board {
  columns: ColumnWithNotes[];
}

export interface AISuggestion {
  category: string;
  hashtags: string[];
  columnId?: string | null;
  columnCreated?: boolean;
}

// Input types
export interface CreateBoardInput {
  name: string;
}

export interface CreateColumnInput {
  boardId: string;
  name: string;
  type: string;
}

export interface UpdateColumnInput {
  name?: string;
  order?: number;
}

export interface CreateNoteInput {
  columnId: string;
  content: string;
  tagNames?: string[];
}

export interface UpdateNoteInput {
  content?: string;
  columnId?: string;
  order?: number;
  tagNames?: string[];
}
