"use client";

import { useState, useTransition } from "react";
import { requestRoster } from "@/app/actions";
import { addDays, dayLong, parseDay, ymd } from "@/lib/dates";
import { field } from "../ui";

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

/**
 * Vrij vragen of dagen opgeven waarop u kunt werken. U tikt de dagen aan in de kalender, ook weken of maanden vooruit.
 * De eigenaar keurt het goed; tot die tijd blijft het rooster zoals het is.
 */
export function RosterRequestForm({
  today,
  fixed,
  extra,
  off,
  pendingOff,
  pendingWork,
  flex,
}: {
  today: string;
  /** Vaste werkdagen: 0 = maandag tot 6 = zondag */
  fixed: number[];
  /** Losse werkdagen die al zijn goedgekeurd */
  extra: string[];
  /** Dagen waarop u al vrij of ziek bent */
  off: string[];
  pendingOff: string[];
  pendingWork: string[];
  /** Geen vaste dagen: dagen opgeven is dan de gewone manier van werken */
  flex: boolean;
}) {
  const [kind, setKind] = useState<"off" | "work">(flex ? "work" : "off");
  const [picked, setPicked] = useState<string[]>([]);
  const [view, setView] = useState(today.slice(0, 7));
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  const [year, month] = view.split("-").map(Number);
  const go = (delta: number) => setView(ymd(new Date(year, month - 1 + delta, 1, 12)).slice(0, 7));
  const first = `${view}-01`;
  const offset = (parseDay(first).getDay() + 6) % 7;
  const total = Math.ceil((offset + new Date(year, month, 0).getDate()) / 7) * 7;
  const cells = Array.from({ length: total }, (_, i) => addDays(first, i - offset));

  const works = (d: string) => fixed.includes((parseDay(d).getDay() + 6) % 7) || extra.includes(d);
  const allowed = (d: string) =>
    d >= today && (kind === "off" ? works(d) && !off.includes(d) && !pendingOff.includes(d) : !works(d) && !pendingWork.includes(d));
  const toggle = (d: string) => {
    setSent(false);
    setPicked((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()));
  };
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    start(async () => {
      const res = await requestRoster(undefined, data);
      setError(res?.error);
      if (res?.ok) {
        setPicked([]);
        setSent(true);
        form.reset();
      }
    });
  };
  const switchKind = (k: "off" | "work") => {
    setKind(k);
    setPicked([]);
  };

  return (
    <form onSubmit={submit} method="post" className="space-y-5">
            <input type="hidden" name="kind" value={kind} />
            {picked.map((d) => (
              <input key={d} type="hidden" name="date" value={d} />
            ))}

            <div role="group" aria-label="Wat wilt u doorgeven?" className="grid grid-cols-2 gap-2">
              {(
                [
                  ["off", "Vrij vragen", "Vrij, verlof of ziek"],
                  ["work", "Ik kan werken", "Dagen opgeven"],
                ] as const
              ).map(([k, title, sub]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => switchKind(k)}
                  className={`min-h-16 rounded-xl border px-3 py-2 text-left transition-colors duration-100 active:scale-[0.98] ${
                    kind === k ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-line bg-surface hover:border-brand/50"
                  }`}
                >
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-muted">{sub}</span>
                </button>
              ))}
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">{kind === "off" ? "Tik de dagen aan waarop u vrij wilt" : "Tik de dagen aan waarop u kunt werken"}</p>
              <div className="rounded-xl border border-line bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => go(-1)} disabled={view <= today.slice(0, 7)} aria-label="Vorige maand" className="grid h-11 w-11 place-items-center rounded-lg border border-line hover:bg-slate-50 disabled:opacity-30">
                    <span aria-hidden="true">←</span>
                  </button>
                  <p className="text-base font-semibold first-letter:uppercase" aria-live="polite">
                    {MONTHS[month - 1]} {year}
                  </p>
                  <button type="button" onClick={() => go(1)} aria-label="Volgende maand" className="grid h-11 w-11 place-items-center rounded-lg border border-line hover:bg-slate-50">
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
                    const ok = allowed(d);
                    const on = picked.includes(d);
                    const waiting = (kind === "off" ? pendingOff : pendingWork).includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={!ok}
                        aria-pressed={on}
                        aria-label={`${dayLong(d)}${waiting ? ", aanvraag loopt al" : ""}`}
                        onClick={() => toggle(d)}
                        className={`relative grid h-11 place-items-center rounded-lg text-sm font-medium ${
                          on ? "bg-brand text-white" : ok ? "border border-line bg-surface hover:border-brand hover:bg-brand-soft" : waiting ? "bg-signal/25 text-petrol" : "text-slate-300"
                        } ${d.startsWith(view) ? "" : "opacity-40"}`}
                      >
                        {parseDay(d).getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {kind === "off" ? "Alleen uw werkdagen zijn te kiezen." : "Alleen dagen waarop u nog niet werkt zijn te kiezen."} Geel = aanvraag loopt al.
              </p>
            </div>

            {kind === "off" && (
              <div className="max-w-xs">
                <label htmlFor="rr-reason" className="mb-1.5 block text-sm font-medium">Reden</label>
                <select id="rr-reason" name="reason" className={field} defaultValue="Vrij">
                  {["Vrij", "Verlof", "Ziek", "Anders"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="rr-note" className="mb-1.5 block text-sm font-medium">Toelichting</label>
              <input id="rr-note" name="note" maxLength={300} autoComplete="off" className={field} placeholder={kind === "off" ? "Bijvoorbeeld: tandarts" : "Bijvoorbeeld: alleen de ochtend"} />
            </div>

            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {sent && (
              <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                Aanvraag verstuurd. U ziet hieronder wanneer de eigenaar heeft gereageerd.
              </p>
            )}
            <button
              type="submit"
              disabled={pending || picked.length === 0}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-white transition-transform duration-100 hover:bg-brand-strong active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {pending ? "Versturen…" : picked.length === 0 ? "Kies eerst een dag" : `Aanvraag versturen voor ${picked.length} ${picked.length === 1 ? "dag" : "dagen"}`}
            </button>
    </form>
  );
}
