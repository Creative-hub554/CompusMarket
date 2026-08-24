type PageSkeletonProps = {
  /** grid columns for the card area */
  columns?: 2 | 3 | 4;
  cards?: number;
  showFilters?: boolean;
};

export function PageSkeleton({
  columns = 3,
  cards = 6,
  showFilters = false,
}: PageSkeletonProps) {
  const gridCols =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 4
        ? "grid-cols-2 lg:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-fade-in" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-56 rounded-lg animate-shimmer mb-2" />
      <div className="h-4 w-80 rounded animate-shimmer mb-8" />
      {showFilters && <div className="h-20 rounded-2xl animate-shimmer mb-6" />}
      <div className={`grid ${gridCols} gap-4`}>
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--border-subtle)] overflow-hidden"
          >
            <div className="aspect-square animate-shimmer" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 rounded animate-shimmer" />
              <div className="h-3 w-1/2 rounded animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
