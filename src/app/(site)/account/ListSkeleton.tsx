export function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-9 w-48 rounded skeleton" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl skeleton" />
        ))}
      </div>
    </div>
  );
}
