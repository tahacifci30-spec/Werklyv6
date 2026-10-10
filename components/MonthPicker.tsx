"use client";

import { useState } from "react";
import { addDays, dayLong, isWeekend, parseDay, ymd } from "@/lib/dates";

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

/**
 * Kalender om een dag te kiezen: kies het jaar, de maand en de dag.
 * `marked` geeft een stip bij dagen met vrije tijden. `allowed` bepaalt welke dagen te kiezen zijn.
 */
export function MonthPicker({
  value,
  onSelect,
  today,
  marked,
  allowed,
  min,
  weekends = false,
  label = "Kies een dag",
}: {
  value?: string;
  onSelect: (day: string) => void;
  today: string;
  marked?: (day: string) => boolean;
  allowed?: (day: string) => boolean;
  /** Vroegste dag die te kiezen is (standaard vandaag) */
  min?: string;
  /** Ook zaterdag en zondag kiesbaar */
  weekends?: boolean;
  label?: string;
}) {
  const [view, setView] = useState((value || today).slice(0, 7));
  const [year, month] = view.split("-").map(Number);
  const thisYear = Number(today.slice(0, 4));

  const go = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1, 12);
    setView(ymd(d).slice(0, 7));
  };
  const set = (y: number, m: number) => setView(`${y}-${String(m).padStart(2, "0")}`);

  const first = `${view}-01`;
  const offset = (parseDay(first).getDay() + 6) % 7;
  const total = Math.ceil((offset + new Date(year, month, 0).getDate()) / 7) * 7;
  const cells = Array.from({ length: total }, (_, i) => addDays(first, i - offset));

  const select = "min-h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium";

  return (
    <div className="rounded-xl border border-line bg-white p-3" role="group" aria-label={label}>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => go(-1)} aria-label="Vorige maand" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line hover:bg-slate-50">
          <span aria-hidden="true">←</span>
        </button>
        <label className="sr-only" htmlFor={`m-${label}`}>Maand</label>
        <select id={`m-${label}`} value={month} onChange={(e) => set(year, Number(e.target.value))} className={`${select} min-w-0 flex-1 capitalize`}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`y-${label}`}>Jaar</label>
        <select id={`y-${label}`} value={year} onChange={(e) => set(Number(e.target.value), month)} className={select}>
          {[0, 1, 2, 3, 4].map((n) => thisYear + n).map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <button type="button" onClick={() => go(1)} aria-label="Volgende maand" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line hover:bg-slate-50">
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const inMonth = d.startsWith(view);
          const ok = d >= (min ?? today) && (weekends || !isWeekend(d)) && (allowed ? allowed(d) : true);
          const on = d === value;
          return (
            <button
              key={d}
              type="button"
              disabled={!ok}
              aria-pressed={on}
              aria-label={dayLong(d)}
              onClick={() => onSelect(d)}
              className={`relative grid h-11 place-items-center rounded-lg text-sm font-medium ${
                on
                  ? "bg-brand text-white"
                  : ok
                    ? "border border-transparent hover:border-brand hover:bg-brand-soft"
                    : "text-slate-300"
              } ${inMonth ? "" : "opacity-40"}`}
            >
              {parseDay(d).getDate()}
              {marked?.(d) && ok && (
                <span aria-hidden="true" className={`absolute bottom-1 h-1 w-1 rounded-full ${on ? "bg-white" : "bg-brand"}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
