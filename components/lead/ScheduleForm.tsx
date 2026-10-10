"use client";

import { useState } from "react";
import type { FormState } from "@/app/actions";
import { fromMin, suggest, techLabel, toMin, type Availability, type Kind } from "@/lib/agenda";
import { travelKm, travelMinutes, type DayRoutes, type Point, type Stop } from "@/lib/travel";
import { dayLong, dayShort } from "@/lib/dates";
import { ActionForm } from "../ActionForm";
import { MonthPicker } from "../MonthPicker";
import { TimeSelect } from "../TimeSelect";
import { INSTALL_DURATIONS, durationShort } from "@/lib/duration";
import { SubmitButton } from "../SubmitButton";
import { field } from "../ui";

type Hint = { date: string; label: string };

/** Waar de monteurs die dag zijn, en waar de nieuwe klant woont. Hiermee schatten we de reistijd. */
export type Travel = {
  routes: DayRoutes;
  target: Point | null;
  base: Point | null;
  place: string;
  /** Alles wat al in de agenda staat (ook overige afspraken en afmeldingen): monteur -> datum -> [begin, eind] in minuten */
  busy: Record<string, Record<string, [number, number][]>>;
};

const UNKNOWN_DRIVE = 30;

/** Past een afspraak op dit tijdstip tussen de andere afspraken van die dag, met de reistijd erbij? */
function fit(stops: Stop[], travel: Travel, start: number, length: number) {
  const before = [...stops].reverse().find((s) => s.end <= start);
  const after = stops.find((s) => s.start >= start + length);
  // Is een plek onbekend, dan rekenen we met een half uur rijden: liever iets te ruim dan te krap.
  const from = before ? (travelMinutes(before.point, travel.target) ?? UNKNOWN_DRIVE) : travelMinutes(travel.base, travel.target);
  const to = after ? (travelMinutes(travel.target, after.point) ?? UNKNOWN_DRIVE) : null;
  const arrive = before && from !== null ? before.end + from : null;
  const late = arrive !== null && arrive > start;
  const rushed = after && to !== null ? start + length + to > after.start : false;
  return { before, after, from, to, arrive, late, rushed };
}

/** Laatste starttijd voor een bezoek dat we zelf uitrekenen (daarna wordt het te laat op de dag). */
const LAST_VISIT_START = 15 * 60 + 30;

/**
 * De tijden die echt in te plannen zijn: vrij in de agenda en haalbaar met de reistijd ervoor en erna.
 * Krappe tijden vallen weg. Komt een monteur van een andere klant, dan staat ook de eerste tijd erbij
 * waarop hij er kan zijn (bijvoorbeeld 12:00 als hij om 11:30 klaar is en 30 minuten moet rijden).
 */
function plannable(free: string[], stops: Stop[], busy: [number, number][], travel: Travel | undefined, length: number, kind: Kind) {
  if (!travel) return free.map((time) => ({ time, note: "" }));
  // Een overige afspraak (overleg, telefoongesprek) heeft geen adres. We gaan ervan uit dat u dan op de zaak bent,
  // dus ook daarna en daarvoor telt de reistijd mee.
  const others: Stop[] = busy
    .filter(([from, to]) => to - from < 24 * 60 && !stops.some((x) => x.start === from && x.end === to))
    .map(([start, end]) => ({ start, end, label: "Overige afspraak", city: "de zaak", point: travel.base, leadId: `other-${start}` }));
  stops = [...stops, ...others].sort((a, b) => a.start - b.start);
  const ok = (start: number) => {
    const f = fit(stops, travel, start, length);
    // Een tijd mag nergens mee botsen: niet met een klantafspraak en ook niet met een overige afspraak of afmelding.
    return !f.late && !f.rushed && !busy.some(([from, to]) => start < to && from < start + length);
  };
  const times = new Set(free.filter((t) => ok(toMin(t))));
  if (kind === "visit" && free.length > 0) {
    for (const s of stops) {
      // Afgerond op een kwartier: de reistijd is een schatting, en "kwart voor twee" spreekt u makkelijker af dan 13:35.
      const start = Math.ceil((s.end + (travelMinutes(s.point, travel.target) ?? UNKNOWN_DRIVE)) / 15) * 15;
      if (start <= LAST_VISIT_START && ok(start)) times.add(fromMin(start));
    }
  }
  // Tijden die vlak na elkaar liggen zijn in de praktijk dezelfde keuze: houd de vroegste, met minstens een half uur ertussen.
  const spaced: string[] = [];
  for (const t of [...times].sort()) {
    if (spaced.length === 0 || toMin(t) - toMin(spaced[spaced.length - 1]) >= 30) spaced.push(t);
  }
  return spaced.map((time) => {
    const f = fit(stops, travel, toMin(time), length);
    return { time, note: f.before && f.from !== null ? `${f.from} min vanaf ${f.before.city}` : "" };
  });
}

/** Plant een afspraak. De vrije tijden komen uit de agenda (afspraken, eigen items en niet-beschikbaar). */
export function ScheduleForm({
  action,
  kind,
  technicians,
  availability,
  today,
  defaults,
  hints = [],
  submitLabel,
  isChange = false,
  defaultDays,
  travel,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  kind: Kind;
  technicians: string[];
  availability: Availability;
  today: string;
  defaults?: { date?: string; time?: string; technician?: string };
  hints?: Hint[];
  submitLabel: string;
  /** De afspraak staat al en wordt gewijzigd: toon de optie om de klant te informeren. */
  isChange?: boolean;
  /** Alleen bij een installatie: voorgestelde duur in dagen */
  defaultDays?: number;
  travel?: Travel;
}) {
  const [tech, setTech] = useState(defaults?.technician && technicians.includes(defaults.technician) ? defaults.technician : technicians[0]);
  const [date, setDate] = useState(defaults?.date ?? "");
  const [time, setTime] = useState(defaults?.time ?? "");
  const [days, setDays] = useState(defaultDays ?? 1);

  const length = kind === "install" ? (days === 0.5 ? 240 : 480) : 90;
  const slotsFor = (t: string) => (date ? plannable(availability[t]?.[date] ?? [], travel?.routes[t]?.[date] ?? [], travel?.busy[t]?.[date] ?? [], travel, length, kind) : []);
  const slots = slotsFor(tech);
  const freeInAgenda = ((date && availability[tech]?.[date]) || []).length > 0;
  const next = suggest(availability, tech, date || today, 1)[0];

  return (
    <ActionForm action={action} className="space-y-5">
      {({ state, pending }) => (
        <>
          <input type="hidden" name="date" value={date} />
          {kind === "install" && (
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Hoe lang duurt de installatie?</legend>
              <div className="flex flex-wrap gap-2">
                {INSTALL_DURATIONS.map((d) => (
                  <label key={d} className="relative">
                    <input type="radio" name="days" value={d} checked={days === d} onChange={() => setDays(d)} className="peer sr-only" />
                    <span className="flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                      {durationShort(d)}
                    </span>
                  </label>
                ))}
              </div>
              {defaultDays !== undefined && <p className="mt-1.5 text-xs text-muted">Geschat op {durationShort(defaultDays)} op basis van het klantformulier.</p>}
            </fieldset>
          )}
          <div className="max-w-xs">
            <label htmlFor={`tech-${kind}`} className="mb-1.5 block text-sm font-medium">
              Monteur
            </label>
            <select
              id={`tech-${kind}`}
              name="technician"
              value={tech}
              onChange={(e) => {
                setTech(e.target.value);
                setTime("");
              }}
              className={field}
            >
              {technicians.map((t) => (
                <option key={t} value={t}>{techLabel(t)}</option>
              ))}
            </select>
          </div>

          {hints.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {hints.map((h) => (
                <button
                  key={h.date + h.label}
                  type="button"
                  onClick={() => {
                    setDate(h.date);
                    setTime("");
                  }}
                  className="min-h-11 rounded-full border border-line bg-surface px-3 text-sm font-medium hover:border-brand hover:bg-brand-soft"
                >
                  {h.label}
                </button>
              ))}
            </div>
          )}

          <div>
            <p className="mb-1.5 text-sm font-medium">Datum</p>
            <MonthPicker
              label={`Datum ${kind}`}
              value={date}
              today={today}
              marked={(d) => (availability[tech]?.[d]?.length ?? 0) > 0}
              onSelect={(d) => {
                setDate(d);
                setTime("");
              }}
            />
            <p className="mt-1.5 text-xs text-muted">Een stip betekent dat {techLabel(tech)} die dag nog vrije tijden heeft.</p>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">
              {date ? `Vrije tijden op ${dayLong(date)}` : `Vrije tijden van ${techLabel(tech)}`}
            </legend>
            {!date ? (
              <p className="text-sm text-muted">Kies eerst een datum.</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-amber-900">
                {freeInAgenda
                  ? `${techLabel(tech)} heeft op deze dag geen tijd die past met de reistijd.`
                  : `${techLabel(tech)} heeft op deze dag geen vrij moment.`}
                {next && ` Eerstvolgende vrije moment: ${dayShort(next.date)} om ${next.time}.`}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map(({ time: t, note }) => (
                  <label key={t} className="relative">
                    <input type="radio" name="time" value={t} checked={time === t} onChange={() => setTime(t)} className="peer sr-only" />
                    <span className="flex min-h-11 flex-col justify-center rounded-xl border border-slate-300 bg-white px-4 py-1.5 font-medium peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-checked:*:text-white peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                      <span>{kind === "install" ? `${t}, ${durationShort(days)}` : t}</span>
                      {note && <span className="text-xs font-normal text-muted">{note}</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {travel && date && slots.length > 0 && <p className="mt-1.5 text-xs text-muted">Alleen tijden die haalbaar zijn met de reistijd.</p>}
          </fieldset>

          {travel && date && (
            <DayRoute
              travel={travel}
              date={date}
              tech={tech}
              technicians={technicians}
              free={(t) => (availability[t]?.[date]?.length ?? 0) > 0}
              first={(t) => slotsFor(t)[0]?.time}
              onPick={(t) => {
                setTech(t);
                setTime("");
              }}
            />
          )}

          <div className="max-w-xs">
            <label htmlFor={`own-time-${kind}`} className="mb-1.5 block text-sm font-medium">
              Of kies zelf een tijd (zonder controle op reistijd)
            </label>
            <TimeSelect id={`own-time-${kind}`} name="time_custom" placeholder="Geen eigen tijd" />
          </div>

          {isChange && (
            <label className="flex min-h-11 items-start gap-3 rounded-xl bg-brand-soft p-3 text-sm">
              <input type="checkbox" name="notify" className="mt-0.5 h-5 w-5 shrink-0" defaultChecked />
              <span>
                <strong>Stuur de wijziging naar de klant.</strong> Na het opslaan krijgt u een kant-en-klaar bericht voor WhatsApp of e-mail.
              </span>
            </label>
          )}

          {state?.error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {state.error}
            </p>
          )}
          <SubmitButton pending={pending} pendingText="Opslaan…">
            {submitLabel}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

/**
 * Wie is waar op de gekozen dag, en hoe ver is dat van deze klant. Alleen voor wie inplant: handig tijdens het bellen.
 * De reistijd is een schatting op afstand, geen navigatie.
 */
function DayRoute({ travel, date, tech, technicians, free, first, onPick }: { travel: Travel; date: string; tech: string; technicians: string[]; free: (t: string) => boolean; first: (t: string) => string | undefined; onPick: (t: string) => void }) {
  if (!travel.target) {
    return <p className="rounded-xl bg-background p-3 text-sm text-muted">Reistijd niet te schatten: het adres van deze klant is niet gevonden.</p>;
  }
  const range = (s: Stop) => `${fromMin(s.start)} tot ${fromMin(s.end)}`;
  return (
    <section aria-label="Reistijd op deze dag" className="rounded-xl border border-line bg-background p-4">
      <h3 className="text-sm font-semibold">Wie is waar op {dayShort(date)}</h3>
      <p className="mt-0.5 text-xs text-muted">Reistijd naar {travel.place}, geschat op afstand. Tik op een naam om die monteur te kiezen.</p>
      <ul className="mt-3 space-y-2">
        {technicians.map((t) => {
          const stops = travel.routes[t]?.[date] ?? [];
          const on = t === tech;
          const fromBase = travelMinutes(travel.base, travel.target);
          // Overige afspraken van die dag (geen klantbezoek): die blokkeren ook tijden, dus laat ze zien.
          const other = (travel.busy[t]?.[date] ?? []).filter(([from, to]) => to - from < 24 * 60 && !stops.some((x) => x.start === from && x.end === to));
          return (
            <li key={t}>
              <button
                type="button"
                onClick={() => onPick(t)}
                aria-pressed={on}
                className={`w-full rounded-lg border p-3 text-left transition-colors duration-100 ${on ? "border-brand bg-surface" : "border-transparent bg-surface hover:border-brand/40"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{techLabel(t)}</span>
                  {on && <span className="text-xs font-medium text-brand-strong">Gekozen</span>}
                </span>
                {other.map(([from, to]) => (
                  <span key={`${from}-${to}`} className="mt-1 block text-sm">
                    <span className="tabular font-medium">
                      {fromMin(from)} tot {fromMin(to)}
                    </span>{" "}
                    <span className="text-muted">bezet in de agenda</span>
                  </span>
                ))}
                {stops.length === 0 ? (
                  <span className={`mt-0.5 block text-sm ${free(t) ? "text-muted" : "text-amber-900"}`}>
                    {free(t) ? `Geen ${other.length ? "klantbezoeken" : "afspraken"}${fromBase !== null ? `. Vanaf de zaak ${fromBase} min rijden.` : "."}` : "Werkt deze dag niet of is afgemeld."}
                  </span>
                ) : (
                  <span className="mt-1 block space-y-1">
                    {stops.map((s) => {
                      const min = travelMinutes(s.point, travel.target);
                      const dist = travelKm(s.point, travel.target);
                      return (
                        <span key={s.leadId + s.start} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                          <span className="min-w-0">
                            <span className="tabular font-medium">{range(s)}</span> <span className="text-muted">in {s.city}</span>
                          </span>
                          <span className="tabular shrink-0 text-muted">{min === null ? "afstand onbekend" : min === 0 ? "zelfde plek" : `${min} min (${dist} km)`}</span>
                        </span>
                      );
                    })}
                    {!free(t) && <span className="block text-sm text-amber-900">Geen vrij moment meer op deze dag.</span>}
                  </span>
                )}
                {free(t) && (
                  <span className={`mt-1.5 block text-sm font-semibold ${first(t) ? "text-brand-strong" : "text-amber-900"}`}>
                    {first(t) ? `Kan hier vanaf ${first(t)}` : "Geen tijd die past met de reistijd"}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
