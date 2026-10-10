"use client";

import { useMemo } from "react";
import { addDays, dayShort, workdaysFrom, ymd } from "@/lib/dates";
import type { DayChoice, DayPart } from "@/lib/types";

const PARTS: [DayPart, string][] = [
  ["morning", "Ochtend"],
  ["afternoon", "Middag"],
];

/** Eén voorkeur kiezen: een dag (komende werkdagen) en ochtend of middag. Geen losse datuminvoer nodig. */
export function WhenPicker({
  label,
  value,
  onChange,
  startInDays = 1,
  count = 10,
}: {
  label: string;
  value?: DayChoice;
  onChange: (v: DayChoice | undefined) => void;
  /** Eerste dag die te kiezen is, in dagen vanaf vandaag */
  startInDays?: number;
  /** Aantal werkdagen dat te kiezen is */
  count?: number;
}) {
  const days = useMemo(() => workdaysFrom(addDays(ymd(new Date()), startInDays), count), [startInDays, count]);
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="group" aria-label={`${label}: dag`}>
        {days.map((d) => {
          const on = value?.date === d;
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? undefined : { date: d, part: value?.part ?? "morning" })}
              className={`min-h-11 rounded-xl border px-1 text-sm font-medium transition-colors duration-100 active:scale-[0.97] ${
                on ? "border-brand bg-brand text-white" : "border-slate-300 bg-white hover:border-brand"
              }`}
            >
              {dayShort(d)}
            </button>
          );
        })}
      </div>
      {value && (
        <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label={`${label}: ochtend of middag`}>
          {PARTS.map(([p, text]) => {
            const on = value.part === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...value, part: p })}
                className={`min-h-11 rounded-xl border px-4 text-sm font-medium transition-colors duration-100 active:scale-[0.97] ${
                  on ? "border-brand bg-brand-soft text-brand-strong" : "border-slate-300 bg-white hover:border-brand"
                }`}
              >
                {text}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
