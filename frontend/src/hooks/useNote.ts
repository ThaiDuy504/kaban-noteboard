import useSWR from 'swr';
import { api } from '@/lib/api';
import type { Note } from '@/types';

export function useNote(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Note>(
    id ? `note-${id}` : null,
    () => api.getNote(id!)
  );
  return { note: data ?? null, error, isLoading, mutate };
}
