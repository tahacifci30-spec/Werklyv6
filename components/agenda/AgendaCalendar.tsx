"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { cancelAppointment, reassignAppointment, removeAgendaItem, saveAgendaEntry } from "@/app/actions";
import { dayLong, dayShort, isWeekend, parseDay } from "@/lib/dates";
import { MonthPicker } from "../MonthPicker";
import { TimeSelect } from "../TimeSelect";
import { field } from "../ui";

export type DayBooking = {
  key: string;
  leadId: string;
  kind: "visit" | "install";
  label: string;
  time: string;
  name: string;
  place: string;
  tech: string;
  techRaw: string;
  done: boolean;
  href: string;
  finishHref?: string;
  /** Collega's die deze afspraak kunnen overnemen, als de monteur niet beschikbaar is */
  alternatives: { name: string; label: string }[];
  needsCover: boolean;
  /** De eigenaar kan deze afspraak annuleren met het kruisje */
  canCancel: boolean;
};
export type DayItem = {
  id: string;
  kind: "item" | "off";
  title: string;
  description?: string;
  start?: string;
  end?: string;
  date: string;
  date_to?: string;
  who: string;
  whoLabel: string;
  short: string;
  canEdit: boolean;
};
export type DayWish = { id: string; name: string; part: string; href: string };
export type DayTech = { tech: string; label: string; text: string; works: boolean; offId?: string };
export type DayData = { date: string; bookings: DayBooking[]; items: DayItem[]; wishes: DayWish[]; techs: DayTech[] };

type FormView = { item?: DayItem; off?: boolean } | null;

const REASONS = ["Ziek", "Vrij", "Verlof", "Anders"];
const offText = (i: DayItem) => `${i.short} ${i.title === "Ziek" ? "ziek" : i.title === "Niet beschikbaar" ? "niet beschikbaar" : i.title.toLowerCase()}`;

/** Kleuren per soort afspraak, dezelfde als de fases op het overzicht (bezoek licht teal, installatie petrol). */
const KIND_COLOR = { visit: "#7cc4bb", install: "#145450", item: "#cbd5e1" } as const;
const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * Maandkalender met rechts drie losse kaarten: wat er op de gekozen dag vaststaat, wie er beschikbaar is,
 * en een kaart om iets toe te voegen. De tegels in de kalender tonen alleen hoeveel er is, niet alle details.
 */
export function AgendaCalendar({
  cells,
  month,
  today,
  days,
  owner,
  me,
  team,
  initialDay,
}: {
  cells: string[];
  month: string;
  today: string;
  days: Record<string, DayData>;
  owner: boolean;
  me: string;
  team: { name: string; label: string }[];
  /** Dag uit de URL (?d=), zodat een gekozen dag te delen is en blijft na verversen */
  initialDay?: string;
}) {
  const [selected, setSelected] = useState(
    initialDay && days[initialDay] ? initialDay : today.startsWith(month) ? today : `${month}-01`,
  );
  const [form, setForm] = useState<FormView>(null);
  const data = days[selected] ?? days[cells[0]];
  const past = data.date < today;

  const pick = (day: string) => {
    setSelected(day);
    setForm(null);
    window.history.replaceState(null, "", `?m=${month}&d=${day}`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
      <section aria-label="Kalender" className="min-w-0">
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted">
          {["ma", "di", "wo", "do", "vr", "za", "zo"].map((w) => (
            <div key={w} className="py-1">{w}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {cells.map((day) => {
            const d = days[day];
            const inMonth = day.startsWith(month);
            const offs = d.items.filter((i) => i.kind === "off");
            const others = d.items.filter((i) => i.kind === "item");
            const marks = [
              ...d.bookings.map((b) => ({ k: b.key, color: KIND_COLOR[b.kind] })),
              ...others.map((i) => ({ k: i.id, color: KIND_COLOR.item })),
            ];
            const count = marks.length;
            const isSel = day === selected;
            const isToday = day === today;
            return (
              <button
                key={day}
                type="button"
                onClick={() => pick(day)}
                aria-pressed={isSel}
                aria-label={`${dayLong(day)}: ${count === 0 ? "geen afspraken" : `${count} ${count === 1 ? "afspraak" : "afspraken"}`}${offs.length ? `, ${offs.map(offText).join(", ")}` : ""}${d.wishes.length ? `, ${d.wishes.length} voorkeur van klant` : ""}`}
                className={`flex min-h-14 flex-col justify-between rounded-xl border p-1.5 text-left transition-[background-color,border-color,transform] duration-100 ease-out active:scale-[0.98] sm:min-h-24 sm:p-2 ${
                  isSel ? "border-brand bg-brand-soft ring-1 ring-brand" : isWeekend(day) ? "border-line bg-background hover:border-brand/50" : "border-line bg-surface hover:border-brand/50"
                } ${inMonth ? "" : "opacity-40"}`}
              >
                <span className="flex items-start justify-between gap-1">
                  <span className={`tabular grid h-6 min-w-6 place-items-center rounded-full px-1 text-sm font-semibold ${isToday ? "bg-brand text-white" : ""}`}>
                    {parseDay(day).getDate()}
                  </span>
                  {count > 0 && <span className="tabular hidden text-xs font-semibold text-muted sm:inline">{count}</span>}
                </span>
                <span className="flex flex-col gap-1" aria-hidden="true">
                  {offs.length > 0 && (
                    <span className="hidden gap-0.5 sm:flex">
                      {offs.slice(0, 3).map((o) => (
                        <span key={o.id} title={offText(o)} className="grid h-5 w-5 place-items-center rounded-full bg-red-100 text-[9px] font-bold text-red-800">
                          {initialsOf(o.short === "Eigenaar" ? "Eigenaar" : o.who)}
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="flex flex-wrap items-center gap-0.5">
                    {marks.slice(0, 5).map((m) => (
                      <span key={m.k} className="h-1.5 w-1.5 rounded-full sm:h-1.5 sm:w-3" style={{ background: m.color }} />
                    ))}
                    {offs.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-500 sm:hidden" />}
                    {d.wishes.length > 0 && <span className="h-2 w-2 rounded-full border-2 border-amber-500 bg-surface" />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 px-1 text-xs text-muted">
          <li className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full" style={{ background: KIND_COLOR.visit }} aria-hidden="true" /> Bezoek</li>
          <li className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full" style={{ background: KIND_COLOR.install }} aria-hidden="true" /> Installatie</li>
          <li className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full" style={{ background: KIND_COLOR.item }} aria-hidden="true" /> Overige</li>
          {owner && <li className="flex items-center gap-1.5"><span className="grid h-4 w-4 place-items-center rounded-full bg-red-100 text-[8px] font-bold text-red-800" aria-hidden="true">NB</span> Niet beschikbaar</li>}
          {owner && <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border-2 border-amber-500" aria-hidden="true" /> Gewenst door klant</li>}
        </ul>
      </section>

      <div className="min-w-0 space-y-4 lg:sticky lg:top-6">
        <DayCard data={data} owner={owner} onEdit={(item) => setForm({ item })} />

        {owner && <AvailabilityCard data={data} />}

        <section className="rounded-2xl border border-line bg-surface p-4" aria-label="Toevoegen aan de agenda">
          {form || past ? (
            form ? (
              <EntryForm
                key={form.item?.id ?? (form.off ? "off" : "new") + data.date}
                day={data.date}
                today={today}
                item={form.item}
                off={!!form.off}
                owner={owner}
                me={me}
                team={team}
                onBack={() => setForm(null)}
              />
            ) : (
              <p className="text-sm text-muted">Op een dag in het verleden kunt u niets meer toevoegen.</p>
            )
          ) : (
            <button
              type="button"
              onClick={() => setForm({})}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-sm font-semibold text-brand-strong hover:border-brand hover:bg-brand-soft"
            >
              <span className="text-xl leading-none" aria-hidden="true">+</span> Afspraak toevoegen
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

/** Wat er op de gekozen dag vaststaat: tijd, wie en waar, op volgorde van de dag. */
function DayCard({ data, owner, onEdit }: { data: DayData; owner: boolean; onEdit: (i: DayItem) => void }) {
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState<{ name: string; mailed: boolean; share?: string } | null>(null);
  const cancel = (b: DayBooking) =>
    start(async () => {
      const res = await cancelAppointment(b.leadId, b.kind);
      setAsking(null);
      if (res.ok) setCancelled({ name: res.name ?? b.name, mailed: res.mailed, share: res.share });
    });
  const others = data.items.filter((i) => i.kind === "item");
  const offs = data.items.filter((i) => i.kind === "off");
  const entries = [
    ...data.bookings.map((b) => ({ sort: b.time, type: "booking" as const, b })),
    ...others.map((i) => ({ sort: i.start ?? "00:00", type: "item" as const, i })),
  ].sort((a, b) => a.sort.localeCompare(b.sort));
  const count = entries.length;

  return (
    <section aria-live="polite" className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="display-md text-2xl first-letter:uppercase">{dayLong(data.date)}</h2>
      <p className="mt-0.5 text-sm text-muted">
        {count === 0 ? "Niets gepland" : `${count} ${count === 1 ? "afspraak" : "afspraken"}`}
      </p>

      {offs.length > 0 && (
        <p className="mt-3 text-sm text-red-800">
          {offs.map((o) => offText(o)).join(", ").replace(/^./, (c) => c.toUpperCase())}
        </p>
      )}

      {cancelled && (
        <div role="status" className="mt-3 rounded-xl border border-brand/30 bg-brand-soft p-3 text-sm">
          <p className="font-semibold">De afspraak met {cancelled.name} is geannuleerd.</p>
          <p className="mt-1 text-muted">
            {cancelled.mailed ? "De klant heeft een e-mail gekregen." : "De klant heeft nog geen bericht gekregen."} De aanvraag staat weer bij uw taken om opnieuw in te plannen.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {!cancelled.mailed && cancelled.share && (
              <a href={cancelled.share} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-strong">
                Stuur bericht via WhatsApp ↗
              </a>
            )}
            <button type="button" onClick={() => setCancelled(null)} className="inline-flex min-h-10 items-center rounded-lg border border-line bg-surface px-3 text-sm font-semibold hover:bg-slate-50">
              Sluiten
            </button>
          </div>
        </div>
      )}

      {count > 0 && (
        <ol className="mt-4 space-y-2">
          {entries.map((e) =>
            e.type === "booking" ? (
              <li key={e.b.key} className="relative rounded-xl bg-background">
                {e.b.canCancel && asking !== e.b.key && (
                  <button
                    type="button"
                    onClick={() => setAsking(e.b.key)}
                    aria-label={`Afspraak met ${e.b.name} annuleren`}
                    title="Afspraak annuleren"
                    className="absolute right-1 top-1 z-10 grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors duration-100 hover:bg-red-50 hover:text-red-700"
                  >
                    <span aria-hidden="true" className="text-lg leading-none">×</span>
                  </button>
                )}
                {asking === e.b.key && (
                  <div role="alertdialog" aria-labelledby={`cancel-${e.b.key}`} className="rounded-t-xl bg-red-50 p-3 text-sm">
                    <p id={`cancel-${e.b.key}`} className="font-medium text-red-900">
                      Weet u zeker dat u de afspraak met {e.b.name} om {e.b.time} wilt annuleren?
                    </p>
                    <p className="mt-1 text-red-900/80">De klant krijgt bericht en u plant daarna een nieuw moment in.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => cancel(e.b)} disabled={pending} className="inline-flex min-h-11 items-center rounded-lg bg-red-700 px-4 font-semibold text-white hover:bg-red-800 disabled:opacity-50">
                        {pending ? "Bezig…" : "Ja, annuleren"}
                      </button>
                      <button type="button" onClick={() => setAsking(null)} className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 font-semibold hover:bg-slate-50">
                        Nee
                      </button>
                    </div>
                  </div>
                )}
                <Link href={e.b.href} className={`flex items-stretch gap-3 rounded-xl p-3 hover:bg-brand-soft ${e.b.canCancel ? "pr-10" : ""}`}>
                  <span className="tabular w-11 shrink-0 pt-0.5 text-base font-semibold">{e.b.time}</span>
                  <span aria-hidden="true" className="w-1 shrink-0 rounded-full" style={{ background: KIND_COLOR[e.b.kind] }} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="truncate">{e.b.name}</span>
                      {e.b.done && (
                        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-emerald-600" aria-label="afgerond">
                          <circle cx="10" cy="10" r="10" fill="currentColor" />
                          <path d="m5.5 10.500 3 3 6-6.500" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="block truncate text-sm text-muted">{e.b.label}{e.b.place.split(", ").pop() ? ` in ${e.b.place.split(", ").pop()}` : ""}</span>
                    <span className="block truncate text-sm text-muted">{e.b.tech}</span>
                  </span>
                </Link>
                {(e.b.finishHref || (owner && e.b.needsCover)) && (
                  <div className="px-3 pb-3 pl-[4.25rem]">
                    {e.b.finishHref && (
                      <Link href={e.b.finishHref} className="inline-flex min-h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white active:scale-[0.97]">
                        {e.b.kind === "install" ? "Installatie afronden" : "Bezoek afronden"}
                      </Link>
                    )}
                    {owner && e.b.needsCover && (
                      <div className="rounded-lg bg-red-50 p-2.5 text-sm text-red-900">
                        <p className="font-medium">{e.b.tech} is niet beschikbaar.</p>
                        {e.b.alternatives.length === 0 ? (
                          <p className="mt-1">Niemand anders heeft tijd. Kies een ander moment bij de aanvraag.</p>
                        ) : (
                          <form
                            className="mt-2 flex flex-wrap items-center gap-2"
                            onSubmit={(ev) => {
                              ev.preventDefault();
                              const tech = String(new FormData(ev.currentTarget).get("tech"));
                              start(async () => reassignAppointment(e.b.leadId, e.b.kind, tech));
                            }}
                          >
                            <label className="sr-only" htmlFor={`re-${e.b.key}`}>Toewijzen aan</label>
                            <select id={`re-${e.b.key}`} name="tech" className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm text-foreground">
                              {e.b.alternatives.map((a) => <option key={a.name} value={a.name}>{a.label}</option>)}
                            </select>
                            <button type="submit" disabled={pending} className="min-h-10 rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50">
                              {pending ? "Bezig…" : "Toewijzen"}
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ) : (
              <li key={e.i.id}>
                <button
                  type="button"
                  disabled={!e.i.canEdit}
                  onClick={() => onEdit(e.i)}
                  className="flex w-full items-stretch gap-3 rounded-xl bg-background p-3 text-left enabled:hover:bg-brand-soft"
                >
                  <span className="tabular w-11 shrink-0 pt-0.5 text-base font-semibold">{e.i.start ?? <span className="text-sm">Hele dag</span>}</span>
                  <span aria-hidden="true" className="w-1 shrink-0 rounded-full" style={{ background: KIND_COLOR.item }} />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-semibold">{e.i.title}</span>
                    <span className="block truncate text-sm text-muted">
                      {e.i.start && e.i.end ? `Tot ${e.i.end}, ` : ""}
                      {e.i.date_to ? `t/m ${dayShort(e.i.date_to)}, ` : ""}
                      {e.i.whoLabel}
                    </span>
                    {e.i.description && <span className="mt-0.5 block text-sm text-slate-700">{e.i.description}</span>}
                  </span>
                  {e.i.canEdit && <span className="shrink-0 self-center text-xs font-medium text-brand-strong">Wijzigen</span>}
                </button>
              </li>
            ),
          )}
        </ol>
      )}

      {data.wishes.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-sm font-semibold text-amber-900">Klanten die deze dag willen</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {data.wishes.map((w) => (
              <li key={w.id}>
                <Link href={w.href} className="flex items-center justify-between gap-3 rounded-lg py-1 hover:text-brand-strong">
                  <span className="truncate font-medium">{w.name}</span>
                  <span className="shrink-0 text-amber-900">{w.part}, inplannen</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Wie er op de gekozen dag werkt, als achtergrond bij het plannen. Wijzigen doet u op één plek: het rooster. */
function AvailabilityCard({ data }: { data: DayData }) {
  return (
    <section aria-labelledby="team-title" className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="team-title" className="text-sm font-semibold">Team deze dag</h2>
        <Link href={`/dashboard/rooster?w=${data.date}`} className="inline-flex min-h-9 items-center text-xs font-medium text-brand-strong hover:underline">
          Wijzigen in het rooster
        </Link>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {data.techs.map((t) => {
          const off = !!t.offId;
          const free = t.works && !off;
          return (
            <li key={t.tech} className="flex items-center gap-3 py-2">
              <span
                aria-hidden="true"
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                  off ? "bg-red-50 text-red-800" : free ? "bg-brand-soft text-brand-strong" : "bg-background text-muted"
                }`}
              >
                {initialsOf(t.tech)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{t.label}</span>
                <span className={`block truncate text-xs ${off ? "text-red-700" : "text-muted"}`}>{t.text}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function EntryForm({
  day,
  today,
  item,
  off,
  owner,
  me,
  team,
  onBack,
}: {
  day: string;
  today: string;
  item?: DayItem;
  off: boolean;
  owner: boolean;
  me: string;
  team: { name: string; label: string }[];
  onBack: () => void;
}) {
  const [date, setDate] = useState(item?.date ?? day);
  const [dateTo, setDateTo] = useState<string | undefined>(item?.date_to);
  const [pick, setPick] = useState<"date" | "to" | null>(null);
  const [whole, setWhole] = useState(item ? !item.start : off);
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  const [pending, start] = useTransition();
  const multi = !!dateTo && dateTo > date;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    start(async () => {
      const res = await saveAgendaEntry(undefined, data);
      if (res?.ok) onBack();
      else setError(res?.error ?? "Opslaan is niet gelukt.");
    });
  };
  const remove = () =>
    start(async () => {
      if (item) await removeAgendaItem(item.id);
      onBack();
    });

  return (
    <form onSubmit={submit} method="post" className="enter-up space-y-4">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="kind" value={off ? "off" : "item"} />
      <input type="hidden" name="date" value={date} />
      {dateTo && <input type="hidden" name="date_to" value={dateTo} />}
      <p className="text-sm font-semibold">{item ? "Afspraak wijzigen" : off ? "Meerdere dagen afmelden" : "Nieuwe afspraak"}</p>

      {off ? (
        <div>
          <label htmlFor="ae-reason" className="mb-1.5 block text-sm font-medium">Reden</label>
          <select id="ae-reason" name="title" className={field} defaultValue={item?.title ?? "Vrij"}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      ) : (
        <div>
          <label htmlFor="ae-title" className="mb-1.5 block text-sm font-medium">Titel</label>
          <input id="ae-title" name="title" required maxLength={80} autoComplete="off" defaultValue={item?.title} className={field} placeholder="Bijvoorbeeld: overleg leverancier" />
        </div>
      )}

      {owner && (
        <div>
          <label htmlFor="ae-who" className="mb-1.5 block text-sm font-medium">Voor wie</label>
          <select id="ae-who" name="who" className={field} defaultValue={item?.who ?? (off ? team.find((t) => t.name !== "Eigenaar")?.name : "Eigenaar")}>
            {team.map((t) => <option key={t.name} value={t.name}>{t.label}</option>)}
          </select>
        </div>
      )}
      {!owner && <input type="hidden" name="who" value={me} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-sm font-medium">Van</p>
          <button type="button" onClick={() => setPick(pick === "date" ? null : "date")} aria-expanded={pick === "date"} className={`${field} text-left`}>
            {dayShort(date)}
          </button>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Tot en met</p>
          <button type="button" onClick={() => setPick(pick === "to" ? null : "to")} aria-expanded={pick === "to"} className={`${field} text-left`}>
            {dateTo && dateTo > date ? dayShort(dateTo) : "Alleen deze dag"}
          </button>
        </div>
      </div>
      {pick === "date" && (
        <MonthPicker label="Datum" value={date} today={today} min={item ? "2000-01-01" : today} weekends onSelect={(d) => { setDate(d); if (dateTo && dateTo < d) setDateTo(undefined); setPick(null); }} />
      )}
      {pick === "to" && (
        <MonthPicker label="Tot en met" value={dateTo} today={today} min={date} weekends onSelect={(d) => { setDateTo(d === date ? undefined : d); setPick(null); }} />
      )}

      {!off && !multi && (
        <>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            <input type="checkbox" name="whole_day" checked={whole} onChange={(e) => setWhole(e.target.checked)} className="h-5 w-5" />
            Hele dag
          </label>
          {!whole && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ae-start" className="mb-1.5 block text-sm font-medium">Tijd van</label>
                <TimeSelect id="ae-start" name="start" defaultValue={item?.start} />
              </div>
              <div>
                <label htmlFor="ae-end" className="mb-1.5 block text-sm font-medium">Tijd tot</label>
                <TimeSelect id="ae-end" name="end" defaultValue={item?.end} />
              </div>
            </div>
          )}
        </>
      )}
      {!off && multi && <p className="text-sm text-muted">Een afspraak over meerdere dagen duurt de hele dag.</p>}
      {!off && (
        <div>
          <label htmlFor="ae-desc" className="mb-1.5 block text-sm font-medium">Beschrijving</label>
          <textarea id="ae-desc" name="description" rows={3} maxLength={500} defaultValue={item?.description} className={field} />
        </div>
      )}
      {off && <input type="hidden" name="whole_day" value="on" />}

      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50">
          {pending ? "Opslaan…" : item ? "Opslaan" : off ? "Afmelden" : "Toevoegen"}
        </button>
        <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-5 text-sm font-semibold hover:bg-slate-50">
          Annuleren
        </button>
        {item && !confirmDelete && (
          <button type="button" onClick={() => setConfirmDelete(true)} disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-red-700 hover:bg-red-50">
            Verwijderen
          </button>
        )}
      </div>
      {item && confirmDelete && (
        <div role="alertdialog" aria-labelledby="del-q" className="rounded-xl bg-red-50 p-3 text-sm">
          <p id="del-q" className="font-medium text-red-900">&ldquo;{item.title}&rdquo; verwijderen?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={remove} disabled={pending} className="inline-flex min-h-11 items-center rounded-lg bg-red-700 px-4 font-semibold text-white hover:bg-red-800">
              Ja, verwijderen
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 font-semibold hover:bg-slate-50">
              Nee, laten staan
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
