import useSWR from 'swr';
import { api } from '@/lib/api';
import type { Note } from '@/types';

export function useNotes() {
  const { data, error, isLoading, mutate } = useSWR<Note[]>('notes', () => api.getNotes());
  return { notes: data ?? [], error, isLoading, mutate };
}
