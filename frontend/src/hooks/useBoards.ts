import useSWR from 'swr';
import { api } from '@/lib/api';
import type { Board } from '@/types';

export function useBoards() {
  const { data, error, isLoading, mutate } = useSWR<Board[]>('boards', () => api.getBoards());
  return { boards: data ?? [], error, isLoading, mutate };
}
