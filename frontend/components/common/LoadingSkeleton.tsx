export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`glass rounded-3xl p-6 ${className}`}>
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="glass rounded-3xl p-8 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <div className="space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-56" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-28 w-28 rounded-full" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
