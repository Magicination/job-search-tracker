// Skeleton-плейсхолдеры вместо голого текста "Загрузка…" — создают ощущение,
// что контент сейчас появится на своём месте, а не что страница "моргнула".

export function SkeletonLine({ width = '100%' }: { width?: string }) {
  return (
    <div
      className="h-4 animate-pulse rounded-md bg-panel-2"
      style={{ width }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-soft bg-panel p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === 0 ? '60%' : '90%'} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-soft bg-panel px-3 py-2.5">
      <div className="h-5 w-5 shrink-0 animate-pulse rounded bg-panel-2" aria-hidden="true" />
      <div className="h-4 flex-1 animate-pulse rounded-md bg-panel-2" aria-hidden="true" />
      <div className="h-5 w-16 animate-pulse rounded-md bg-panel-2" aria-hidden="true" />
    </div>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
