"use client";

import { useState } from "react";
import { formatEur } from "@/lib/pricing/engine";

type Bar = { key: string; label: string; long: string; total: number; count: number };

/** Staafgrafiek met een pop-up boven de staaf waar je op staat. De staaf kleurt oranje zodat duidelijk is welke periode het is. */
export function RevenueChart({ series, max }: { series: Bar[]; max: number }) {
  const [active, setActive] = useState<number | null>(null);
  const n = series.length;

  return (
    <div className="relative flex h-full flex-col pt-16" onMouseLeave={() => setActive(null)}>
      <div className="flex min-h-52 flex-1 items-end gap-1 border-b border-line sm:gap-2" role="group" aria-label="Omzet per periode">
        {series.map((b, i) => {
          const h = b.total > 0 ? Math.max(4, (b.total / max) * 100) : 0;
          const last = i === n - 1;
          const on = active === i;
          return (
            <button
              key={b.key}
              type="button"
              aria-label={`${b.long}: ${formatEur(b.total)}, ${b.count} klussen`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="group relative flex h-full min-w-0 flex-1 flex-col justify-end rounded-t-md outline-offset-2 hover:bg-amber-50"
            >
              {on && (
                <span className="pointer-events-none absolute left-1/2 z-10 w-0" style={{ bottom: `calc(${(h === 0 ? 45 : h)}% + 10px)` }}>
                  <span
                    role="tooltip"
                    className="absolute bottom-0 w-max max-w-[11rem] rounded-lg bg-slate-900 px-3 py-2 text-center text-xs text-white shadow-lg"
                    style={{ left: 0, transform: "translateX(-50%)" }}
                  >
                    <span className="block capitalize">{b.long}</span>
                    <span className="tabular block text-sm font-semibold">{formatEur(b.total)}</span>
                    <span className="block text-slate-300">{b.count === 1 ? "1 klus" : `${b.count} klussen`}</span>
                  </span>
                  <span aria-hidden="true" className="absolute bottom-0 left-0 h-2 w-2 -translate-x-1/2 translate-y-1 rotate-45 bg-slate-900" />
                </span>
              )}
              {h > 0 && (
                <span
                  className={`bar block w-full rounded-t-md transition-colors duration-150 ${
                    on ? "bg-amber-500" : last ? "bg-brand" : "bg-brand/45"
                  }`}
                  style={{ height: `${h}%`, animationDelay: `${i * 30}ms` }}
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1 sm:gap-2" aria-hidden="true">
        {series.map((b, i) => (
          <span
            key={b.key}
            className={`min-w-0 flex-1 truncate text-center text-[10px] transition-colors sm:text-xs ${
              active === i ? "font-semibold text-amber-700" : i === n - 1 ? "font-semibold text-foreground" : "text-muted"
            }`}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
