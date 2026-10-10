"use client";

import { useEffect, useState } from "react";

/** Gebruik met `key={melding}` zodat een nieuwe melding de component opnieuw start. */
export function Flash({ message }: { message?: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOpen(false), 7000);
    return () => clearTimeout(t);
  }, []);
  if (!message || !open) return null;
  return (
    <div role="status" className="rise mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <span>{message}</span>
      <button type="button" onClick={() => setOpen(false)} aria-label="Melding sluiten" className="-mr-1 grid h-6 w-6 shrink-0 place-items-center rounded text-emerald-800 hover:bg-emerald-100">
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}
