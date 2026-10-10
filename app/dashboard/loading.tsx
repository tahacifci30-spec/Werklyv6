export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <span className="sr-only">Laden…</span>
      <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200" />)}
      </div>
      <div className="mt-8 h-72 animate-pulse rounded-2xl bg-slate-200" />
    </div>
  );
}
