'use client';

export function SkeletonCard() {
  return (
    <div className="bg-card border border-border/60 rounded-lg p-3 mb-2 animate-pulse">
      <div className="flex items-start gap-2">
        <div className="w-4 h-4 mt-1 rounded bg-muted" />
        <div className="flex-1 space-y-3">
          {/* Content lines */}
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-4/5" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
          
          {/* Tags */}
          <div className="flex gap-1.5">
            <div className="h-5 bg-muted rounded-full w-14" />
            <div className="h-5 bg-muted rounded-full w-16" />
            <div className="h-5 bg-muted rounded-full w-12" />
          </div>
          
          {/* Timestamp */}
          <div className="h-3 bg-muted rounded w-20" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonColumn() {
  return (
    <div className="w-80 flex-shrink-0 bg-card rounded-xl shadow-sm border border-border/50 flex flex-col animate-pulse">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-16 bg-muted rounded-md" />
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-4 w-6 bg-muted rounded" />
        </div>
        <div className="h-8 w-8 bg-muted rounded" />
      </div>
      
      {/* Notes */}
      <div className="flex-1 p-3 min-h-[200px]">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-border/50">
        <div className="h-9 bg-muted rounded w-full" />
      </div>
    </div>
  );
}
