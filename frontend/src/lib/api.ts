import type {
  Board,
  BoardWithColumns,
  Column,
  Note,
  CreateBoardInput,
  CreateColumnInput,
  UpdateColumnInput,
  CreateNoteInput,
  UpdateNoteInput,
  AISuggestion,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

let cachedToken: string | null = null;

export function setToken(token: string | null) {
  cachedToken = token;
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(cachedToken && { Authorization: `Bearer ${cachedToken}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `API Error: ${res.status}` }));
    throw new Error(error.message || `API Error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Boards
  getBoards: () => fetchAPI<Board[]>('/api/boards'),
  getBoard: (id: string) => fetchAPI<BoardWithColumns>(`/api/boards/${id}`),
  createBoard: (data: CreateBoardInput) => 
    fetchAPI<Board>('/api/boards', { method: 'POST', body: JSON.stringify(data) }),
  updateBoard: (id: string, data: Partial<CreateBoardInput>) =>
    fetchAPI<Board>(`/api/boards/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBoard: (id: string) =>
    fetchAPI<void>(`/api/boards/${id}`, { method: 'DELETE' }),
  
  // Columns
  createColumn: (data: CreateColumnInput) =>
    fetchAPI<Column>('/api/columns', { method: 'POST', body: JSON.stringify(data) }),
  updateColumn: (id: string, data: UpdateColumnInput) =>
    fetchAPI<Column>(`/api/columns/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteColumn: (id: string) =>
    fetchAPI<void>(`/api/columns/${id}`, { method: 'DELETE' }),
  reorderColumns: (boardId: string, columnIds: string[]) =>
    fetchAPI(`/api/boards/${boardId}/reorder-columns`, { 
      method: 'POST', 
      body: JSON.stringify({ columnIds }) 
    }),

  // Notes
  getNotes: () => fetchAPI<Note[]>('/api/notes'),
  getNote: (id: string) => fetchAPI<Note>(`/api/notes/${id}`),
  createNote: (data: CreateNoteInput) =>
    fetchAPI<Note>('/api/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id: string, data: UpdateNoteInput) =>
    fetchAPI<Note>(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteNote: (id: string) =>
    fetchAPI<void>(`/api/notes/${id}`, { method: 'DELETE' }),
  moveNote: (id: string, columnId: string, order: number) =>
    fetchAPI<Note>(`/api/notes/${id}/move`, { 
      method: 'POST', 
      body: JSON.stringify({ columnId, order }) 
    }),

  // AI
  suggestTags: (content: string, boardId?: string) =>
    fetchAPI<AISuggestion>('/api/ai/suggest', { 
      method: 'POST', 
      body: JSON.stringify({ content, boardId }) 
    }),
};
