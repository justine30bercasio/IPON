export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-line/70 bg-white p-5 shadow-soft">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-7 w-28" />
      <Skeleton className="mt-3 h-3 w-24" />
    </div>
  );
}