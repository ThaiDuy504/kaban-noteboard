'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-red-600" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground mb-2">Something went wrong</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        We encountered an error while loading this page. Please try again.
      </p>
      <Button onClick={reset} size="lg">
        Try Again
      </Button>
    </div>
  );
}
