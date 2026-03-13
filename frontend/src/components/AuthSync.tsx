'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { setToken } from '@/lib/api';

export function AuthSync() {
  const { data: session } = useSession();

  useEffect(() => {
    setToken(session?.accessToken ?? null);
  }, [session?.accessToken]);

  return null;
}
