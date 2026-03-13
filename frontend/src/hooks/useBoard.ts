import useSWR from 'swr';
import { api } from '@/lib/api';
import type { BoardWithColumns } from '@/types';

export function useBoard(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<BoardWithColumns>(
    id ? `board-${id}` : null,
    () => api.getBoard(id!)
  );
  return { board: data ?? null, error, isLoading, mutate };
}
