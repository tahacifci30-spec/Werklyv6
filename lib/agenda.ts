import { addDays, parseDay, todayNl } from "./dates";
import type { AgendaItem, Appointment, Lead, TeamMember } from "./types";

/**
 * Agenda en beschikbaarheid. Alle afspraken komen uit de aanvragen zelf, plus eigen agenda-items
 * en dagen waarop een monteur niet kan werken. Een bezoek (opname) duurt 90 minuten, een installatie
 * neemt de hele werkdag.
 */
export const OWNER = "Eigenaar";

/** Standaardrooster: maandag tot en met vrijdag. Per persoon aan te passen bij Instellingen. */
export const WORKWEEK = [0, 1, 2, 3, 4];
export const DEFAULT_TEAM: TeamMember[] = [
  { name: "Sven Bakker", days: WORKWEEK },
  { name: "Lars Visser", days: WORKWEEK },
  { name: OWNER, days: WORKWEEK },
];
export const teamNames = (team: TeamMember[]) => team.map((m) => m.name);
/** 0 = maandag tot 6 = zondag */
export const weekdayIndex = (day: string) => (parseDay(day).getDay() + 6) % 7;
export const WEEKDAY_NAMES = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
export const WEEKDAY_SHORT = ["ma", "di", "wo", "do", "vr", "za", "zo"];
/** Werkt deze persoon op deze dag? Volgens zijn vaste dagen, of op een losse dag die is goedgekeurd. */
export const worksOn = (team: TeamMember[], tech: string, day: string) => {
  const m = team.find((x) => x.name === tech);
  return (m?.days ?? WORKWEEK).includes(weekdayIndex(day)) || !!m?.extra?.includes(day);
};


/** Naam zoals de gebruiker hem ziet. De eigenaar kan zelf ook de monteur zijn. */
export const techLabel = (name: string) => (name === OWNER ? "Ik zelf (eigenaar)" : name);

export const VISIT_SLOTS = ["08:30", "10:00", "11:30", "13:00", "14:30"];
export const VISIT_MINUTES = 90;
export const INSTALL_START = "08:00";
export const INSTALL_MINUTES = 480;

export type Kind = "visit" | "install";
export type Booking = { lead: Lead; kind: Kind; appt: Appointment; done: boolean; part?: { n: number; total: number } };

export const KIND_LABEL: Record<Kind, string> = { visit: "Bezoek", install: "Installatie" };

export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
const minutes = (k: Kind) => (k === "install" ? INSTALL_MINUTES : VISIT_MINUTES);
/** Een halve dag installeren duurt een ochtend (4 uur); anders een hele werkdag. */
const bookingMinutes = (b: Booking) => (b.kind === "install" ? (b.appt.days === 0.5 ? 240 : INSTALL_MINUTES) : VISIT_MINUTES);

/** Opeenvolgende werkdagen vanaf de startdatum, voor een installatie van meerdere dagen. */
export function installDates(start: string, total: number): string[] {
  const out = [start];
  let d = start;
  while (out.length < total) {
    d = addDays(d, 1);
    const wd = (parseDay(d).getDay() + 6) % 7;
    if (wd < 5) out.push(d);
  }
  return out;
}
export const lengthOf = minutes;

/** Alle ingeplande afspraken (zonder afgemelde) van alle aanvragen, ook de afgeronde. */
export function bookings(leads: Lead[]): Booking[] {
  const out: Booking[] = [];
  for (const lead of leads) {
    if (lead.status === "rejected") continue;
    if (lead.appointment && !lead.appointment.declined_at)
      out.push({ lead, kind: "visit", appt: lead.appointment, done: !!lead.check.completed_at });
    if (lead.install_appointment && !lead.install_appointment.declined_at) {
      const appt = lead.install_appointment;
      const done = !!lead.install?.completed_at;
      const total = Math.max(1, Math.ceil(appt.days ?? 1));
      // Een installatie van meerdere dagen staat op elke werkdag in de agenda.
      installDates(appt.date, total).forEach((date, i) =>
        out.push({ lead, kind: "install", appt: i === 0 ? appt : { ...appt, date, time: INSTALL_START }, done, ...(total > 1 ? { part: { n: i + 1, total } } : {}) }),
      );
    }
  }
  return out;
}

/** Een bezet tijdvak van één persoon. */
export type Block = { tech: string; date: string; start: number; end: number; leadId?: string; rooster?: boolean };

/** Datums van een agenda-item (een dag, of een reeks bij "niet beschikbaar"). */
export function itemDays(i: AgendaItem): string[] {
  const days = [i.date];
  if (i.date_to && i.date_to > i.date) {
    for (let d = addDays(i.date, 1), n = 0; d <= i.date_to && n < 120; d = addDays(d, 1), n++) days.push(d);
  }
  return days;
}

export function blocks(leads: Lead[], items: AgendaItem[], team: TeamMember[] = DEFAULT_TEAM): Block[] {
  const out: Block[] = bookings(leads).map((b) => ({
    tech: b.appt.technician,
    date: b.appt.date,
    start: toMin(b.appt.time),
    end: toMin(b.appt.time) + bookingMinutes(b),
    leadId: b.lead.id,
  }));
  for (const i of items) {
    for (const d of itemDays(i)) {
      out.push({
        tech: i.who,
        date: d,
        start: i.start ? toMin(i.start) : 0,
        end: i.end ? toMin(i.end) : 24 * 60,
      });
    }
  }
  // Dagen waarop iemand volgens het weekrooster niet werkt, tot ruim drie jaar vooruit.
  const from = addDays(todayNl(), -14);
  for (const m of team) {
    if (m.days.length === 7) continue;
    for (let i = 0; i < 1100; i++) {
      const d = addDays(from, i);
      if (!m.days.includes(weekdayIndex(d)) && !m.extra?.includes(d)) out.push({ tech: m.name, date: d, start: 0, end: 24 * 60, rooster: true });
    }
  }
  return out;
}

/** Overlapt een nieuw tijdvak met iets wat al in de agenda staat? */
export function overlaps(bl: Block[], technician: string, date: string, startMin: number, length: number, ignoreLeadId?: string) {
  return bl.some(
    (b) =>
      b.tech === technician &&
      b.date === date &&
      (ignoreLeadId === undefined || b.leadId !== ignoreLeadId) &&
      startMin < b.end &&
      b.start < startMin + length,
  );
}

/** Vrije starttijden van één persoon op één dag. */
export function freeSlots(bl: Block[], technician: string, date: string, kind: Kind, ignoreLeadId?: string) {
  const starts = kind === "install" ? [INSTALL_START] : VISIT_SLOTS;
  return starts.filter((t) => !overlaps(bl, technician, date, toMin(t), minutes(kind), ignoreLeadId));
}

/** persoon -> datum -> vrije starttijden, voor de komende dagen. */
export type Availability = Record<string, Record<string, string[]>>;

export function availability(bl: Block[], kind: Kind, from: string, techs: string[], days = 120, ignoreLeadId?: string): Availability {
  const out: Availability = {};
  for (const tech of techs) {
    out[tech] = {};
    for (let i = 0; i < days; i++) {
      const d = addDays(from, i);
      const slots = freeSlots(bl, tech, d, kind, ignoreLeadId);
      if (slots.length) out[tech][d] = slots;
    }
  }
  return out;
}

/** De eerste `n` vrije momenten van een persoon vanaf een datum. */
export function suggest(av: Availability, technician: string, from: string, n: number) {
  const days = Object.keys(av[technician] ?? {})
    .filter((d) => d >= from)
    .sort();
  const out: { date: string; time: string }[] = [];
  for (const d of days) {
    for (const t of av[technician][d]) {
      out.push({ date: d, time: t });
      if (out.length === n) return out;
    }
  }
  return out;
}

/** Staat er op deze dag een "niet beschikbaar" voor deze persoon? Geeft het item terug. */
export function offOn(items: AgendaItem[], tech: string, date: string): AgendaItem | undefined {
  return items.find((i) => i.kind === "off" && i.who === tech && itemDays(i).includes(date));
}

/** Afspraken die botsen met een dag waarop de monteur niet kan werken. */
export function conflicts(leads: Lead[], items: AgendaItem[]): { booking: Booking; item: AgendaItem }[] {
  const out: { booking: Booking; item: AgendaItem }[] = [];
  for (const b of bookings(leads)) {
    if (b.done || b.lead.status === "completed") continue;
    const item = offOn(items, b.appt.technician, b.appt.date);
    if (item) out.push({ booking: b, item });
  }
  return out;
}
